import { type CSSProperties, useEffect, useRef, useState } from 'react'
import settingsIcon from '../../assets/icons/settings.svg'
import type { ScheduleItem } from '../../api/items'
import type { GridSettings } from '../../hooks/useGridSettings'
import { DAY_NAMES, type Day, formatMinutes, formatTime, toMinutes, visibleDays } from '../../lib/schedule'
import './ScheduleGrid.css'

/**
 * Height of one hour on screen. It stays the same at every increment, so a 1-hour class is always
 * readable; the increment only changes how many lines are drawn (80px/hr → 15 min = 20px, 30 min = 40px, 1 hr = 80px).
 */
const HOUR_HEIGHT = 80

/** Blocks shorter than this many pixels put the time beside the title instead of below it. */
const COMPACT_BLOCK = 44

/**
 * Vertical space for time rows on a printed page: landscape Letter (8.5in tall) minus
 * 10mm margins, the title bar, day header and end-hour row. A4 landscape is slightly shorter
 * but still fits because rows round down.
 */
const PRINT_ROWS_HEIGHT = 600
const PRINT_ROW_MIN = 12

const today = () => new Date().toLocaleDateString(undefined, { dateStyle: 'long' })

/** Today's date, refreshed right before printing in case the page stayed open overnight. */
function usePrintDate() {
  const [date, setDate] = useState(today)
  useEffect(() => {
    const refresh = () => setDate(today())
    window.addEventListener('beforeprint', refresh)
    return () => window.removeEventListener('beforeprint', refresh)
  }, [])
  return date
}

interface Lane {
  lane: number
  lanes: number
}

/**
 * Side-by-side columns for one day's items: overlapping items are split into lanes so none hide
 * another. Items in a group of overlaps share the group's lane count.
 */
function layoutLanes(items: ScheduleItem[]): Map<number, Lane> {
  const sorted = [...items].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
  const result = new Map<number, Lane>()
  let group: ScheduleItem[] = []
  let laneEnds: number[] = []
  let groupEnd = -1

  const closeGroup = () => {
    for (const item of group) result.set(item.id, { lane: result.get(item.id)!.lane, lanes: laneEnds.length })
    group = []
    laneEnds = []
  }

  for (const item of sorted) {
    const start = toMinutes(item.start_time)
    const end = toMinutes(item.end_time)
    if (start >= groupEnd) closeGroup()
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = end
    result.set(item.id, { lane, lanes: 0 })
    group.push(item)
    groupEnd = Math.max(groupEnd, end)
  }
  closeGroup()
  return result
}

interface ScheduleGridProps {
  items: ScheduleItem[]
  settings: GridSettings
  onOpenSettings: () => void
  onSelectItem: (item: ScheduleItem) => void
  /** An empty slot was clicked; `start` is minutes since midnight. */
  onSelectSlot: (day: Day, start: number) => void
  title: string
  onRenameTitle: (title: string) => void
}

/** Click-to-edit heading: Enter or blur saves, Escape cancels. */
function EditableTitle({ title, onRename }: { title: string; onRename: (title: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const editing = draft !== null
  const inputRef = useRef<HTMLInputElement>(null)

  // Select the current name when editing starts so typing replaces it.
  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (!editing) {
    return (
      <h1>
        <button type="button" className="schedule-title" title="Rename schedule" onClick={() => setDraft(title)}>
          {title}
        </button>
      </h1>
    )
  }

  const save = () => {
    onRename(draft)
    setDraft(null)
  }

  return (
    <input
      ref={inputRef}
      className="schedule-title-input"
      aria-label="Schedule name"
      value={draft}
      maxLength={60}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}

function ScheduleGrid({
  items,
  settings,
  onOpenSettings,
  onSelectItem,
  onSelectSlot,
  title,
  onRenameTitle,
}: ScheduleGridProps) {
  const days = visibleDays(settings.weekStart, items)
  const gridStart = settings.startHour * 60
  const gridEnd = settings.endHour * 60
  const rows: number[] = []
  for (let t = gridStart; t < gridEnd; t += settings.interval) rows.push(t)

  function blockStyle(item: ScheduleItem, { lane, lanes }: Lane): CSSProperties | null {
    const start = Math.max(toMinutes(item.start_time), gridStart)
    const end = Math.min(toMinutes(item.end_time), gridEnd)
    if (end <= start) return null
    // Positions use the CSS row height so print can shrink rows without moving blocks off their lines.
    // Horizontally the day column (minus 4px left / 3px right inset) is split evenly between lanes.
    return {
      top: `calc(var(--row-height) * ${(start - gridStart) / settings.interval})`,
      height: `calc(var(--row-height) * ${(end - start) / settings.interval} - 2px)`,
      left: `calc(4px + (100% - 7px) * ${lane / lanes})`,
      width: `calc((100% - 7px) / ${lanes} - ${lanes > 1 ? 2 : 0}px)`,
      background: item.color,
    }
  }

  // Shrink rows when printing so the whole day fits on one page, but never grow past the screen size.
  const rowHeight = (HOUR_HEIGHT * settings.interval) / 60
  const printRowHeight = Math.max(PRINT_ROW_MIN, Math.min(rowHeight, Math.floor(PRINT_ROWS_HEIGHT / rows.length)))
  const printedOn = usePrintDate()

  return (
    <section className="schedule-card">
      <div className="schedule-card-header">
        {/* Empty left cell balances the right-hand controls so the title stays centered. */}
        <span />
        <EditableTitle title={title} onRename={onRenameTitle} />
        <div className="schedule-card-actions">
          <span className="schedule-print-date">Printed {printedOn}</span>
          <button type="button" className="schedule-settings" aria-label="Grid settings" onClick={onOpenSettings}>
            <img src={settingsIcon} alt="" width={20} height={20} />
          </button>
        </div>
      </div>

      <div className="schedule-scroll">
        <div
          className="schedule-grid"
          style={
            {
              '--row-height': `${rowHeight}px`,
              '--print-row-height': `${printRowHeight}px`,
              '--day-count': days.length,
            } as CSSProperties
          }
        >
          <div className="schedule-row schedule-head">
            <div />
            {days.map((day) => (
              <div key={day} className="schedule-cell">
                {DAY_NAMES[day]}
              </div>
            ))}
          </div>

          <div className="schedule-body">
            {rows.map((t) => {
              const onHour = t % 60 === 0
              return (
                <div key={t} className={`schedule-row${onHour ? ' on-hour' : ''}`}>
                  {/* Every slot is labelled at the grid's interval (15 min / 30 min / 1 hr). */}
                  <div className={`schedule-time${onHour ? '' : ' sub-hour'}`}>{formatMinutes(t)}</div>
                  {days.map((day) => (
                    <button
                      key={day}
                      type="button"
                      className="schedule-cell schedule-slot"
                      aria-label={`Add item on ${DAY_NAMES[day]} at ${formatMinutes(t)}`}
                      onClick={() => onSelectSlot(day, t)}
                    />
                  ))}
                </div>
              )
            })}
            {/* Labels sit at the top of each slot, so the end hour needs its own closing row. */}
            <div className="schedule-row schedule-end">
              <div className="schedule-time">{formatMinutes(gridEnd)}</div>
              {days.map((day) => (
                <div key={day} className="schedule-cell" />
              ))}
            </div>

            <div className="schedule-overlay">
              <div />
              {days.map((day) => {
                const dayItems = items.filter((item) => item.days.includes(day))
                const lanes = layoutLanes(dayItems)
                return (
                  <div key={day} className="schedule-day">
                    {dayItems.map((item) => {
                      const lane = lanes.get(item.id)!
                      const style = blockStyle(item, lane)
                      if (!style) return null
                      const conflicting = lane.lanes > 1
                      const minutes = toMinutes(item.end_time) - toMinutes(item.start_time)
                      const compact = (minutes / 60) * HOUR_HEIGHT < COMPACT_BLOCK
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`schedule-block${conflicting ? ' conflicting' : ''}${compact ? ' compact' : ''}`}
                          style={style}
                          title={conflicting ? `${item.title} overlaps another class` : undefined}
                          onClick={() => onSelectItem(item)}
                        >
                          <strong>
                            {conflicting && <span aria-label="Overlaps another class">⚠ </span>}
                            {item.title}
                          </strong>
                          <span>
                            {formatTime(item.start_time)} – {formatTime(item.end_time)}
                          </span>
                          {item.location && <span>{item.location}</span>}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ScheduleGrid
