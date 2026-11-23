import { useState } from 'react'
import googleIcon from '../../assets/icons/google-g.svg'
import type { ScheduleItem } from '../../api/items'
import { formatTime, fromMinutes, toMinutes } from '../../lib/schedule'
import Modal, { ModalCloseButton } from '../Modal'
import TypeBadges from './TypeBadges'
import '../AuthModal.css'
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
  /** Guests see a sign-in prompt instead of the import form. */
  signedIn: boolean
  onClose: () => void
  onConfirm: (entries: CalendarImportEntry[]) => void
}

function GoogleCalendarModal({ items, signedIn, onClose, onConfirm }: GoogleCalendarModalProps) {
  const [connecting, setConnecting] = useState(false)
  const [entries, setEntries] = useState<CalendarImportEntry[]>(() =>
    items.map((item) => ({
      itemId: item.id,
      title: item.title,
      date: '',
      start: fromMinutes(toMinutes(item.start_time)),
      end: fromMinutes(toMinutes(item.end_time)),
      repeatWeekly: false,
    })),
  )

  function update(index: number, patch: Partial<CalendarImportEntry>) {
    setEntries((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)))
  }

  const header = (
    <div className="modal-header gcal-header">
      <div className="gcal-heading">
        <img src={googleIcon} alt="" width={23.993} height={23.993} />
        <div>
          <h2 id="gcal-title" className="modal-title gcal-title">
            Import to Google Calendar
          </h2>
          <p className="modal-subtitle">{signedIn ? 'Review and confirm before syncing' : 'Sign in to import'}</p>
        </div>
      </div>
      <ModalCloseButton onClick={onClose} />
    </div>
  )

  if (!signedIn) {
    return (
      <Modal onClose={onClose} labelledBy="gcal-title" width={672}>
        {header}

        <div className="gcal-list">
          <div className="gcal-card gcal-signin">
            {connecting ? (
              <div className="auth-modal-connecting" role="status">
                <div className="spinner" />
                <p>Connecting to Google...</p>
              </div>
            ) : (
              <>
                <h3 className="gcal-signin-title">Sign in to import</h3>
                <p className="gcal-signin-text">
                  Connect your Google account to add your classes to Google Calendar. Your schedule comes with you.
                </p>
                <button
                  type="button"
                  className="google-button gcal-signin-button"
                  onClick={() => {
                    setConnecting(true)
                    window.location.assign('/api/auth/google/login')
                  }}
                >
                  <img src={googleIcon} alt="" width={20} height={20} />
                  Continue with Google
                </button>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer gcal-footer">
          <button type="button" className="btn btn-outline btn-subtle" onClick={onClose}>
            Cancel
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose} labelledBy="gcal-title" width={672}>
      {header}

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
                  <input type="time" value={entry.start} onChange={(e) => update(i, { start: e.target.value })} />
                </label>
                <label>
                  End
                  <input type="time" value={entry.end} onChange={(e) => update(i, { end: e.target.value })} />
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
          disabled={items.length === 0 || entries.some((e) => !e.date || !e.start || !e.end)}
          title={entries.some((e) => !e.date) ? 'Pick a date for every event' : undefined}
          onClick={() => onConfirm(entries)}
        >
          Confirm Import
        </button>
      </div>
    </Modal>
  )
}

export default GoogleCalendarModal
