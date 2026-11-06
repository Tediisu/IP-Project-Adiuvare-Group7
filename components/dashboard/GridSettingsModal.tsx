import { useState } from 'react'
import type { GridSettings } from '../../hooks/useGridSettings'
import { formatMinutes, type WeekStart } from '../../lib/schedule'
import Modal, { ModalCloseButton } from '../Modal'
import './GridSettingsModal.css'

interface GridSettingsModalProps {
  settings: GridSettings
  /** Hours the saved items cover; the grid can't be narrowed past them. */
  itemRange: { start: number; end: number } | null
  onClose: () => void
  onSave: (settings: GridSettings) => void
}

const INTERVALS: [GridSettings['interval'], string][] = [
  [15, '15 min'],
  [30, '30 min'],
  [60, '1 hr'],
]
const WEEK_STARTS: WeekStart[] = ['Mon', 'Sun', 'Sat']

function GridSettingsModal({ settings, itemRange, onClose, onSave }: GridSettingsModalProps) {
  const [draft, setDraft] = useState(settings)
  const maxStart = itemRange ? Math.min(12, itemRange.start) : 12
  const minEnd = itemRange ? Math.max(13, itemRange.end) : 13

  return (
    <Modal onClose={onClose} labelledBy="grid-settings-title" width={384} className="modal-compact">
      <ModalCloseButton onClick={onClose} />
      <h2 id="grid-settings-title" className="modal-title">
        Grid Settings
      </h2>

      <div className="grid-settings-fields">
        <RangeField
          label={`Start Hour (${formatMinutes(draft.startHour * 60)})`}
          min={0}
          max={12}
          value={draft.startHour}
          ticks={['12 AM', '6 AM', '12 PM']}
          onChange={(startHour) => setDraft({ ...draft, startHour: Math.min(startHour, maxStart) })}
        />
        <RangeField
          label={`End Hour (${formatMinutes(draft.endHour * 60)})`}
          min={13}
          max={24}
          value={draft.endHour}
          ticks={['1 PM', '6 PM', '12 AM']}
          onChange={(endHour) => setDraft({ ...draft, endHour: Math.max(endHour, minEnd) })}
        />
        {itemRange && (
          <p className="grid-settings-hint">
            Your schedule runs {formatMinutes(itemRange.start * 60)} – {formatMinutes(itemRange.end * 60)}, so the
            grid always covers at least those hours.
          </p>
        )}

        <div className="field">
          <span className="field-label">Time Interval</span>
          <div className="segmented">
            {INTERVALS.map(([value, text]) => (
              <button
                key={value}
                type="button"
                className={`chip${draft.interval === value ? ' selected' : ''}`}
                aria-pressed={draft.interval === value}
                onClick={() => setDraft({ ...draft, interval: value })}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Week Starts On</span>
          <div className="segmented">
            {WEEK_STARTS.map((day) => (
              <button
                key={day}
                type="button"
                className={`chip${draft.weekStart === day ? ' selected' : ''}`}
                aria-pressed={draft.weekStart === day}
                onClick={() => setDraft({ ...draft, weekStart: day })}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-outline btn-subtle" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onSave(draft)}>
          Save
        </button>
      </div>
    </Modal>
  )
}

interface RangeFieldProps {
  label: string
  min: number
  max: number
  value: number
  ticks: string[]
  onChange: (value: number) => void
}

function RangeField({ label, min, max, value, ticks, onChange }: RangeFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="range-ticks">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </span>
    </label>
  )
}

export default GridSettingsModal
