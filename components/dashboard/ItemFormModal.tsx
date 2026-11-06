import { type FormEvent, useRef, useState } from 'react'
import labIcon from '../../assets/icons/lab.svg'
import lectureIcon from '../../assets/icons/lecture.svg'
import type { ItemType, ScheduleItem, ScheduleItemInput } from '../../api/items'
import {
  COLOR_TAGS,
  DAYS,
  type Day,
  describeOverlap,
  findOverlap,
  fromMinutes,
  sortDays,
  toMinutes,
} from '../../lib/schedule'
import Modal, { ModalCloseButton } from '../Modal'
import './ItemFormModal.css'

interface ItemFormModalProps {
  /** When set, the form edits this item instead of creating a new one. */
  item?: ScheduleItem
  /** Prefill for a new item, e.g. from clicking an empty grid slot. */
  preset?: { day: Day; start: number }
  onClose: () => void
  onSubmit: (input: ScheduleItemInput) => Promise<void>
  /** Shown as a Delete button when editing. */
  onDelete?: () => Promise<void>
  /** The rest of the schedule, checked live for overlaps with this item. */
  otherItems: ScheduleItem[]
}

/** Latest time the backend can store (it has no 24:00). */
const LAST_MINUTE = 24 * 60 - 1

interface TimeParts {
  /** 12-hour clock digits as typed, e.g. "09" and "30" */
  hour: string
  minute: string
  pm: boolean
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function toParts(minutes: number): TimeParts {
  const h24 = Math.floor(minutes / 60)
  return { hour: pad2(h24 % 12 === 0 ? 12 : h24 % 12), minute: pad2(minutes % 60), pm: h24 >= 12 }
}

/** Minutes since midnight, or null when the boxes don't hold a valid 12-hour time. */
function fromParts({ hour, minute, pm }: TimeParts): number | null {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return null
  const h = Number(hour)
  const m = Number(minute)
  if (h < 1 || h > 12 || m > 59) return null
  return ((h % 12) + (pm ? 12 : 0)) * 60 + m
}

function ItemFormModal({ item, preset, onClose, onSubmit, onDelete, otherItems }: ItemFormModalProps) {
  const defaultStart = preset?.start ?? 9 * 60
  const [title, setTitle] = useState(item?.title ?? '')
  const [color, setColor] = useState(item?.color ?? COLOR_TAGS[0])
  const [days, setDays] = useState<Day[]>(item?.days ?? (preset ? [preset.day] : []))
  const [start, setStart] = useState(toParts(item ? toMinutes(item.start_time) : defaultStart))
  const [end, setEnd] = useState(
    toParts(item ? toMinutes(item.end_time) : Math.min(defaultStart + 60, LAST_MINUTE)),
  )
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [types, setTypes] = useState<ItemType[]>(item?.types ?? [])
  const [instructor, setInstructor] = useState(item?.instructor ?? '')
  const [location, setLocation] = useState(item?.location ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Check the form as it stands against the rest of the schedule; skip until the times are valid.
  const startMinutes = fromParts(start)
  const endMinutes = fromParts(end)
  const draft =
    startMinutes !== null && endMinutes !== null && endMinutes > startMinutes
      ? { title, days, start_time: fromMinutes(startMinutes), end_time: fromMinutes(endMinutes) }
      : null
  const conflicts = draft
    ? otherItems.flatMap((other) => {
        const overlap = findOverlap(draft, other)
        return overlap ? [{ ...overlap, b: other }] : []
      })
    : []

  function toggleDay(day: Day) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : sortDays([...prev, day])))
  }

  function toggleType(type: ItemType) {
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  // Two clicks so a stray tap can't remove an item.
  async function handleDelete() {
    if (!onDelete) return
    if (!confirmingDelete) return setConfirmingDelete(true)
    setError(null)
    setSaving(true)
    try {
      await onDelete()
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
      setConfirmingDelete(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (days.length === 0) return setError('Pick at least one day.')
    if (startMinutes === null) return setError('Enter a valid start time: hour 01–12, minutes 00–59.')
    if (endMinutes === null) return setError('Enter a valid end time: hour 01–12, minutes 00–59.')
    if (endMinutes <= startMinutes) return setError('End time must be after start time.')

    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        color,
        days,
        start_time: fromMinutes(startMinutes),
        end_time: fromMinutes(endMinutes),
        types,
        instructor: instructor.trim() || null,
        location: location.trim() || null,
      })
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="item-form-title" width={512}>
      <div className="item-form-header">
        <h2 id="item-form-title" className="modal-title">
          {item ? 'Edit Item' : 'Add Item'}
        </h2>
        <ModalCloseButton onClick={onClose} />
      </div>

      <form className="item-form" onSubmit={handleSubmit}>
        <div className="item-form-fields">
          <label className="field item-form-text-field">
            <span className="field-label">Title *</span>
            <input
              className="text-input"
              placeholder="e.g. CS 301 – Data Structures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </label>

          <div className="field">
            <span className="field-label">Color Tag</span>
            <div className="color-tags">
              {COLOR_TAGS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-tag${c === color ? ' selected' : ''}`}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                  aria-pressed={c === color}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Days *</span>
            <div className="day-chips">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`chip${days.includes(day) ? ' selected' : ''}`}
                  aria-pressed={days.includes(day)}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="time-fields">
            <TimeInput label="Start Time" value={start} onChange={setStart} />
            <TimeInput label="End Time" value={end} onChange={setEnd} />
          </div>

          {conflicts.length > 0 && (
            <div className="conflict-warning" role="alert">
              <strong>⚠ This overlaps with {conflicts.length === 1 ? 'another class' : `${conflicts.length} classes`}</strong>
              <ul>
                {conflicts.map((c) => (
                  <li key={c.b.id}>
                    {c.b.title} — {describeOverlap(c)}
                  </li>
                ))}
              </ul>
              <span>You can still save it.</span>
            </div>
          )}

          <div className="field">
            <span className="field-label">Type</span>
            <div className="type-options">
              <TypeOption icon={lectureIcon} label="Lecture" checked={types.includes('lecture')} onToggle={() => toggleType('lecture')} />
              <TypeOption icon={labIcon} label="Lab" checked={types.includes('lab')} onToggle={() => toggleType('lab')} />
            </div>
          </div>

          <label className="field item-form-text-field">
            <span className="field-label">Instructor</span>
            <input
              className="text-input"
              placeholder="e.g. Prof. Nguyen"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
          </label>

          <label className="field item-form-text-field">
            <span className="field-label">Location</span>
            <input
              className="text-input"
              placeholder="e.g. Building A, Room 204"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-footer item-form-footer">
          <button type="button" className="btn btn-outline btn-subtle" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {conflicts.length > 0 ? (item ? 'Save Anyway' : 'Add Anyway') : item ? 'Save Changes' : 'Add to Schedule'}
          </button>
          {onDelete && (
            <button type="button" className="btn-danger-soft item-form-delete" disabled={saving} onClick={handleDelete}>
              {confirmingDelete ? 'Click again to delete' : 'Delete Item'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}

interface TimeInputProps {
  label: string
  value: TimeParts
  onChange: (value: TimeParts) => void
}

function TimeInput({ label, value, onChange }: TimeInputProps) {
  const minuteRef = useRef<HTMLInputElement>(null)
  const hourRef = useRef<HTMLInputElement>(null)
  const digits = (raw: string) => raw.replace(/\D/g, '').slice(0, 2)
  // Pad a single digit ("9" → "09") when the box loses focus.
  const padOnBlur = (v: string) => (v.length === 1 ? `0${v}` : v)

  function handleHour(raw: string) {
    let hour = digits(raw)
    // "2"–"9" can only be a one-digit hour on a 12-hour clock, so finish it and move on.
    if (/^[2-9]$/.test(hour)) hour = `0${hour}`
    onChange({ ...value, hour })
    if (hour.length === 2) minuteRef.current?.focus()
  }

  return (
    <div className="field time-input">
      <span className="field-label">{label}</span>
      <div className="time-input-row">
        <input
          ref={hourRef}
          className="time-box"
          aria-label={`${label} hour`}
          placeholder="00"
          inputMode="numeric"
          maxLength={2}
          value={value.hour}
          onFocus={(e) => e.target.select()}
          onChange={(e) => handleHour(e.target.value)}
          // Read the DOM value: blur can fire mid-keystroke (auto-advance) before props catch up.
          onBlur={(e) => onChange({ ...value, hour: padOnBlur(e.target.value) })}
        />
        <span className="time-colon">:</span>
        <input
          ref={minuteRef}
          className="time-box"
          aria-label={`${label} minute`}
          placeholder="00"
          inputMode="numeric"
          maxLength={2}
          value={value.minute}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange({ ...value, minute: digits(e.target.value) })}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && value.minute === '') hourRef.current?.focus()
          }}
          onBlur={(e) => onChange({ ...value, minute: padOnBlur(e.target.value) })}
        />
        <button
          type="button"
          className="period-toggle"
          aria-label={`${label}: ${value.pm ? 'PM' : 'AM'}, click to switch`}
          onClick={() => onChange({ ...value, pm: !value.pm })}
        >
          {value.pm ? 'PM' : 'AM'}
        </button>
      </div>
    </div>
  )
}

interface TypeOptionProps {
  icon: string
  label: string
  checked: boolean
  onToggle: () => void
}

function TypeOption({ icon, label, checked, onToggle }: TypeOptionProps) {
  return (
    <label className={`chip type-option${checked ? ' checked' : ''}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <img className="invert-dark" src={icon} alt="" width={13.993} height={13.993} />
      {label}
    </label>
  )
}

export default ItemFormModal
