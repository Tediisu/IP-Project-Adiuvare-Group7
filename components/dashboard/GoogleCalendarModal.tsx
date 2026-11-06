import { useState } from 'react'
import googleIcon from '../../assets/icons/google-g.svg'
import type { ScheduleItem } from '../../api/items'
import { formatTime } from '../../lib/schedule'
import Modal, { ModalCloseButton } from '../Modal'
import TypeBadges from './TypeBadges'
import './GoogleCalendarModal.css'

export interface CalendarImportEntry {
  itemId: number
  title: string
  date: string
  start: string
  end: string
  repeatWeekly: boolean
}

interface GoogleCalendarModalProps {
  items: ScheduleItem[]
  onClose: () => void
  onConfirm: (entries: CalendarImportEntry[]) => void
}

function GoogleCalendarModal({ items, onClose, onConfirm }: GoogleCalendarModalProps) {
  const [entries, setEntries] = useState<CalendarImportEntry[]>(() =>
    items.map((item) => ({
      itemId: item.id,
      title: item.title,
      date: '',
      start: formatTime(item.start_time),
      end: formatTime(item.end_time),
      repeatWeekly: false,
    })),
  )

  function update(index: number, patch: Partial<CalendarImportEntry>) {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  }

  return (
    <Modal onClose={onClose} labelledBy="gcal-title" width={672}>
      <div className="modal-header gcal-header">
        <div className="gcal-heading">
          <img src={googleIcon} alt="" width={23.993} height={23.993} />
          <div>
            <h2 id="gcal-title" className="modal-title gcal-title">
              Import to Google Calendar
            </h2>
            <p className="modal-subtitle">Review and confirm before syncing</p>
          </div>
        </div>
        <ModalCloseButton onClick={onClose} />
      </div>

      <div className="gcal-list">
        {items.length === 0 && <p className="empty-state">Add items to your schedule first.</p>}
        {items.map((item, i) => {
          const entry = entries[i]
          return (
            <div key={item.id} className="gcal-card">
              <div className="gcal-card-title">
                <span className="gcal-dot" style={{ background: item.color }} />
                <input
                  className="gcal-title-input"
                  aria-label="Event title"
                  value={entry.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
                <TypeBadges types={item.types} />
              </div>
              <p className="gcal-meta">
                {item.days.join(', ')}
                <span>·</span>
                {formatTime(item.start_time)} – {formatTime(item.end_time)}
              </p>
              <div className="gcal-fields">
                <label>
                  Date
                  <input type="date" value={entry.date} onChange={(e) => update(i, { date: e.target.value })} />
                </label>
                <label>
                  Start
                  <input value={entry.start} onChange={(e) => update(i, { start: e.target.value })} />
                </label>
                <label>
                  End
                  <input value={entry.end} onChange={(e) => update(i, { end: e.target.value })} />
                </label>
              </div>
              <label className="gcal-repeat">
                <input
                  type="checkbox"
                  checked={entry.repeatWeekly}
                  onChange={(e) => update(i, { repeatWeekly: e.target.checked })}
                />
                Repeat weekly
              </label>
            </div>
          )
        })}
      </div>

      <div className="modal-footer gcal-footer">
        <button type="button" className="btn btn-outline btn-subtle" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-accent"
          disabled={items.length === 0}
          onClick={() => onConfirm(entries)}
        >
          Confirm Import
        </button>
      </div>
    </Modal>
  )
}

export default GoogleCalendarModal
