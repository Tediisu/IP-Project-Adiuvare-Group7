import { useState } from 'react'
import type { Course } from '../routes/SchedulePage'
import '../styles/AddItemModal.css'

const COLORS = ['#EB5E28', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444', '#14b8a6']
const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  initialCourse?: Course | null
  onClose: () => void
  onSave: (course: Omit<Course, 'id'>) => void
  onDelete?: (id: number) => void
  existingCourses: Course[]
}

function parse24hTo12hParts(time24: string): { hhmm: string; period: 'AM' | 'PM' } {
  if (!time24) return { hhmm: '09:00', period: 'AM' }
  const parts = time24.split(':').map(Number)
  const h24 = parts[0] ?? 9
  const m = parts[1] ?? 0
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const padH = h12.toString().padStart(2, '0')
  const padM = m.toString().padStart(2, '0')
  return { hhmm: `${padH}:${padM}`, period }
}

function parseTime12hToMinutes(timeStr: string, period: 'AM' | 'PM'): number | null {
  const clean = timeStr.trim()
  if (!clean) return null

  const parts = clean.split(':')
  if (parts.length !== 2) return null

  let hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)

  if (isNaN(hours) || isNaN(minutes)) return null
  if (hours < 1 || hours > 12 || minutes < 0 || minutes >= 60) return null

  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0

  return hours * 60 + minutes
}

function minutesToFormatted24h(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const padH = h24.toString().padStart(2, '0')
  const padM = m.toString().padStart(2, '0')
  return `${padH}:${padM}`
}

function formatMinutesTo12hString(totalMinutes: number): string {
  const h24 = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const padM = m.toString().padStart(2, '0')
  return `${h12}:${padM} ${period}`
}

function timesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA
}

export default function AddItemModal({ initialCourse, onClose, onSave, onDelete, existingCourses }: Props) {
  const isEditing = Boolean(initialCourse)

  const initialStart = initialCourse ? parse24hTo12hParts(initialCourse.start_time) : { hhmm: '09:00', period: 'AM' as const }
  const initialEnd = initialCourse ? parse24hTo12hParts(initialCourse.end_time) : { hhmm: '10:00', period: 'AM' as const }

  // Map initial days from MON, TUE to Mon, Tue for chips
  const dayMapRev: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' }
  const initialDaysFormatted = initialCourse ? initialCourse.days.map(d => dayMapRev[d] || d) : []

  const [title, setTitle] = useState(initialCourse?.name || '')
  const [color, setColor] = useState(initialCourse?.hex_color || COLORS[0])
  const [days, setDays] = useState<string[]>(initialDaysFormatted)
  
  const [startTimeStr, setStartTimeStr] = useState(initialStart.hhmm)
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>(initialStart.period)

  const [endTimeStr, setEndTimeStr] = useState(initialEnd.hhmm)
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>(initialEnd.period)

  const [type, setType] = useState<'Lecture' | 'Lab' | null>(initialCourse?.course_type || null)
  const [instructor, setInstructor] = useState(initialCourse?.instructor || '')
  const [location, setLocation] = useState(initialCourse?.location || '')
  const [error, setError] = useState('')

  const toggleDay = (day: string) => {
    setDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]))
  }

  const handleSubmit = () => {
    setError('')

    if (!title.trim()) {
      setError('Please enter a title.')
      return
    }
    if (days.length === 0) {
      setError('Please select at least one day.')
      return
    }

    const startMins = parseTime12hToMinutes(startTimeStr, startPeriod)
    const endMins = parseTime12hToMinutes(endTimeStr, endPeriod)

    if (startMins === null) {
      setError('Invalid start time. Please enter time in 00:00 format (e.g. 09:00).')
      return
    }

    if (endMins === null) {
      setError('Invalid end time. Please enter time in 00:00 format (e.g. 10:00).')
      return
    }

    if (endMins <= startMins) {
      setError('End time must be after start time.')
      return
    }

    const startTime24 = minutesToFormatted24h(startMins)
    const endTime24 = minutesToFormatted24h(endMins)

    // Check for schedule conflicts (excluding current course being edited)
    const newDaysUpper = days.map(d => d.toUpperCase())
    for (const existing of existingCourses) {
      if (initialCourse && existing.id === initialCourse.id) continue // Skip self

      const sharedDays = existing.days.filter(d => newDaysUpper.includes(d))
      if (sharedDays.length > 0) {
        const [exSH, exSM] = existing.start_time.split(':').map(Number)
        const [exEH, exEM] = existing.end_time.split(':').map(Number)
        const exStartMins = exSH * 60 + exSM
        const exEndMins = exEH * 60 + exEM

        if (timesOverlap(startMins, endMins, exStartMins, exEndMins)) {
          const timeRange = `${formatMinutesTo12hString(exStartMins)} – ${formatMinutesTo12hString(exEndMins)}`
          setError(`Schedule conflict detected with "${existing.name}" on ${sharedDays.join(', ')} (${timeRange}).`)
          return
        }
      }
    }

    onSave({
      name: title,
      hex_color: color,
      days: newDaysUpper,
      start_time: startTime24,
      end_time: endTime24,
      course_type: type ?? undefined,
      instructor: instructor || undefined,
      location: location || undefined,
    })
  }

  const handleDelete = () => {
    if (initialCourse && onDelete) {
      onDelete(initialCourse.id)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Item' : 'Add Item'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <label className="field-label">TITLE *</label>
          <input
            className="field-input"
            placeholder="e.g. CS 301 - Data Structures"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <label className="field-label">COLOR TAG</label>
          <div className="color-row">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${color === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <label className="field-label">DAYS *</label>
          <div className="day-row">
            {DAY_OPTIONS.map(day => (
              <button
                key={day}
                type="button"
                className={`day-chip ${days.includes(day) ? 'selected' : ''}`}
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="time-row">
            <div className="time-group">
              <label className="field-label">START TIME *</label>
              <div className="time-input-container">
                <input
                  type="text"
                  className="field-input time-num-input"
                  placeholder="09:00"
                  maxLength={5}
                  value={startTimeStr}
                  onChange={e => setStartTimeStr(e.target.value)}
                />
                <div className="period-toggle">
                  <button
                    type="button"
                    className={`period-btn ${startPeriod === 'AM' ? 'selected' : ''}`}
                    onClick={() => setStartPeriod('AM')}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    className={`period-btn ${startPeriod === 'PM' ? 'selected' : ''}`}
                    onClick={() => setStartPeriod('PM')}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            <div className="time-group">
              <label className="field-label">END TIME *</label>
              <div className="time-input-container">
                <input
                  type="text"
                  className="field-input time-num-input"
                  placeholder="10:00"
                  maxLength={5}
                  value={endTimeStr}
                  onChange={e => setEndTimeStr(e.target.value)}
                />
                <div className="period-toggle">
                  <button
                    type="button"
                    className={`period-btn ${endPeriod === 'AM' ? 'selected' : ''}`}
                    onClick={() => setEndPeriod('AM')}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    className={`period-btn ${endPeriod === 'PM' ? 'selected' : ''}`}
                    onClick={() => setEndPeriod('PM')}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>

          <label className="field-label">TYPE</label>
          <div className="type-row">
            <button
              type="button"
              className={`type-chip ${type === 'Lecture' ? 'selected' : ''}`}
              onClick={() => setType(t => (t === 'Lecture' ? null : 'Lecture'))}
            >
              📖 Lecture
            </button>
            <button
              type="button"
              className={`type-chip ${type === 'Lab' ? 'selected' : ''}`}
              onClick={() => setType(t => (t === 'Lab' ? null : 'Lab'))}
            >
              🧪 Lab
            </button>
          </div>

          <label className="field-label">INSTRUCTOR</label>
          <input
            className="field-input"
            placeholder="e.g. Prof. Nguyen"
            value={instructor}
            onChange={e => setInstructor(e.target.value)}
          />

          <label className="field-label">LOCATION</label>
          <input
            className="field-input"
            placeholder="e.g. Building A, Room 204"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          {isEditing && (
            <button type="button" className="btn-delete" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-save" onClick={handleSubmit}>
            {isEditing ? 'Save Changes' : 'Add to Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}