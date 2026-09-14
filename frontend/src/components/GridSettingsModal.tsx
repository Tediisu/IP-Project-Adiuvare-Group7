import { useState } from 'react'
import '../styles/GridSettingsModal.css'

export interface GridSettings {
  startHour: number   // e.g. 8 for 8:00 AM
  endHour: number     // e.g. 20 for 8:00 PM
  timeInterval: 15 | 30 | 60
  weekStart: 'Mon' | 'Sun' | 'Sat'
}

interface Props {
  settings: GridSettings
  onClose: () => void
  onSave: (newSettings: GridSettings) => void
}

function formatHour12(hour: number): string {
  if (hour === 0 || hour === 24) return '12:00 AM'
  if (hour === 12) return '12:00 PM'
  const period = hour > 12 ? 'PM' : 'AM'
  const h12 = hour > 12 ? hour - 12 : hour
  return `${h12}:00 ${period}`
}

export default function GridSettingsModal({ settings, onClose, onSave }: Props) {
  const [startHour, setStartHour] = useState(settings.startHour)
  const [endHour, setEndHour] = useState(settings.endHour)
  const [timeInterval, setTimeInterval] = useState<15 | 30 | 60>(settings.timeInterval)
  const [weekStart, setWeekStart] = useState<'Mon' | 'Sun' | 'Sat'>(settings.weekStart)

  const handleSave = () => {
    onSave({
      startHour,
      endHour: Math.max(endHour, startHour + 1),
      timeInterval,
      weekStart,
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="grid-settings-card" onClick={e => e.stopPropagation()}>
        <div className="grid-settings-header">
          <h2>Grid Settings</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="grid-settings-body">
          {/* Start Hour Section */}
          <div className="settings-section">
            <label className="settings-label">
              START HOUR ({formatHour12(startHour)})
            </label>
            <input
              type="range"
              min={0}
              max={12}
              step={1}
              value={startHour}
              onChange={e => setStartHour(Number(e.target.value))}
              className="settings-slider"
            />
            <div className="slider-ticks">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
            </div>
          </div>

          {/* End Hour Section */}
          <div className="settings-section">
            <label className="settings-label">
              END HOUR ({formatHour12(endHour)})
            </label>
            <input
              type="range"
              min={13}
              max={24}
              step={1}
              value={endHour}
              onChange={e => setEndHour(Number(e.target.value))}
              className="settings-slider"
            />
            <div className="slider-ticks">
              <span>1 PM</span>
              <span>6 PM</span>
              <span>12 AM</span>
            </div>
          </div>

          {/* Time Interval Section */}
          <div className="settings-section">
            <label className="settings-label">TIME INTERVAL</label>
            <div className="pill-group">
              <button
                type="button"
                className={`pill-btn ${timeInterval === 15 ? 'selected' : ''}`}
                onClick={() => setTimeInterval(15)}
              >
                15 min
              </button>
              <button
                type="button"
                className={`pill-btn ${timeInterval === 30 ? 'selected' : ''}`}
                onClick={() => setTimeInterval(30)}
              >
                30 min
              </button>
              <button
                type="button"
                className={`pill-btn ${timeInterval === 60 ? 'selected' : ''}`}
                onClick={() => setTimeInterval(60)}
              >
                1 hr
              </button>
            </div>
          </div>

          {/* Week Starts On Section */}
          <div className="settings-section">
            <label className="settings-label">WEEK STARTS ON</label>
            <div className="pill-group">
              <button
                type="button"
                className={`pill-btn ${weekStart === 'Mon' ? 'selected' : ''}`}
                onClick={() => setWeekStart('Mon')}
              >
                Mon
              </button>
              <button
                type="button"
                className={`pill-btn ${weekStart === 'Sun' ? 'selected' : ''}`}
                onClick={() => setWeekStart('Sun')}
              >
                Sun
              </button>
              <button
                type="button"
                className={`pill-btn ${weekStart === 'Sat' ? 'selected' : ''}`}
                onClick={() => setWeekStart('Sat')}
              >
                Sat
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="grid-settings-footer">
          <button type="button" className="settings-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="settings-btn-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
