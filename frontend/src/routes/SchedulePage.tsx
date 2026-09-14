import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Moon, Sun, Settings, Pencil } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import AddItemModal from '../components/AddItemModal'
import ManageSchedulesModal from '../components/ManageScheduleModal'
import GridSettingsModal, { type GridSettings } from '../components/GridSettingsModal'
import '../styles/SchedulePage.css'

export interface Course {
  id: number
  name: string
  hex_color: string
  days: string[]
  start_time: string
  end_time: string
  course_type?: 'Lecture' | 'Lab'
  instructor?: string
  location?: string
}

const DAYS_MAP: Record<'Mon' | 'Sun' | 'Sat', string[]> = {
  Mon: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  Sun: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  Sat: ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'],
}

function formatHourLabel(h: number) {
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:00 ${period}`
}

export default function SchedulePage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const [courses, setCourses] = useState<Course[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showGridSettingsModal, setShowGridSettingsModal] = useState(false)

  const [gridSettings, setGridSettings] = useState<GridSettings>({
    startHour: 8,
    endHour: 20,
    timeInterval: 60,
    weekStart: 'Mon',
  })

  const [scheduleTitle, setScheduleTitle] = useState('My Schedule')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const currentDays = DAYS_MAP[gridSettings.weekStart]
  const hourCount = Math.max(1, gridSettings.endHour - gridSettings.startHour)
  const hoursList = Array.from({ length: hourCount }, (_, i) => gridSettings.startHour + i)

  const handleAddCourse = (courseData: Omit<Course, 'id'>) => {
    setCourses(prev => [...prev, { ...courseData, id: Date.now() }])
    setShowAddModal(false)
  }

  const handleSaveEditedCourse = (updatedData: Omit<Course, 'id'>) => {
    if (!editingCourse) return
    setCourses(prev => prev.map(c => (c.id === editingCourse.id ? { ...updatedData, id: editingCourse.id } : c)))
    setEditingCourse(null)
  }

  const handleDeleteCourse = (id: number) => {
    setCourses(prev => prev.filter(c => c.id !== id))
    if (editingCourse?.id === id) setEditingCourse(null)
  }

  const handleDeleteAll = () => {
    setCourses([])
    setShowManageModal(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditingTitle(false)
    }
  }

  const handleTitleBlur = () => {
    if (!scheduleTitle.trim()) setScheduleTitle('My Schedule')
    setIsEditingTitle(false)
  }

  return (
    <div className="schedule-app">
      <header className="landing-header">
        <div className="brand">
          <span className="brand-icon">
            <Calendar size={18} color="#fff" />
          </span>
          <span className="brand-name">Adiuvare</span>
        </div>
        <div className="header-actions">
          <button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="login-btn">Login</button>
        </div>
      </header>

      <div className="schedule-body">
        <aside className="sidebar">
          <button className="side-btn" onClick={() => setShowAddModal(true)}>
            Add Item
          </button>
          <button className="side-btn danger" onClick={() => setShowManageModal(true)}>
            Delete
          </button>
          <button className="side-btn">Import</button>
          <button className="side-btn">Save As</button>
          <button className="side-btn">Print</button>
          <button className="side-btn">New</button>
          <button className="side-btn accent">Sync GCal</button>
        </aside>

        <main className="schedule-panel">
          <div className="panel-header">
            <div className="panel-header-spacer" />
            <div className="panel-title-area">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  className="panel-title-input"
                  value={scheduleTitle}
                  onChange={e => setScheduleTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                />
              ) : (
                <button
                  className="panel-title-btn"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit schedule title"
                >
                  <span>{scheduleTitle}</span>
                  <Pencil size={14} />
                </button>
              )}
            </div>
            <div className="panel-header-right">
              <button
                className="icon-btn"
                onClick={() => setShowGridSettingsModal(true)}
                title="Grid Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
          
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Back to Landing
          </button>

          <div className="grid-wrapper">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${currentDays.length}, 1fr)` }}>
              <div className="grid-corner" />
              {currentDays.map(day => (
                <div key={day} className="grid-day-header">{day}</div>
              ))}

              {hoursList.map(hour => (
                <div key={`row-${hour}`} className="grid-row" style={{ display: 'contents' }}>
                  <div className="grid-time-label">
                    {formatHourLabel(hour)}
                  </div>
                  {currentDays.map(day => (
                    <div key={`${day}-${hour}`} className="grid-cell" />
                  ))}
                </div>
              ))}
            </div>

            {courses.map(course =>
              course.days.map(day => {
                const dayIndex = currentDays.indexOf(day)
                if (dayIndex === -1) return null

                const [cHStart, cMStart] = course.start_time.split(':').map(Number)
                const [cHEnd, cMEnd] = course.end_time.split(':').map(Number)

                const startDecimal = cHStart + cMStart / 60
                const endDecimal = cHEnd + cMEnd / 60

                if (endDecimal <= gridSettings.startHour || startDecimal >= gridSettings.endHour) return null

                const visibleStart = Math.max(startDecimal, gridSettings.startHour)
                const visibleEnd = Math.min(endDecimal, gridSettings.endHour)

                const startOffsetPx = (visibleStart - gridSettings.startHour) * 50
                const heightPx = (visibleEnd - visibleStart) * 50

                return (
                  <div
                    key={`${course.id}-${day}`}
                    className="course-block"
                    style={{
                      background: course.hex_color,
                      top: `${35 + startOffsetPx}px`,
                      height: `${heightPx}px`,
                      left: `calc(80px + ${dayIndex} * (100% - 80px) / ${currentDays.length})`,
                      width: `calc((100% - 80px) / ${currentDays.length})`,
                      cursor: 'pointer',
                    }}
                    onClick={() => setEditingCourse(course)}
                    title="Click to edit or delete course"
                  >
                    <div className="course-name">{course.name}</div>
                    {course.location && <div className="course-meta">{course.location}</div>}
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddCourse}
          existingCourses={courses}
        />
      )}

      {editingCourse && (
        <AddItemModal
          initialCourse={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSave={handleSaveEditedCourse}
          onDelete={handleDeleteCourse}
          existingCourses={courses}
        />
      )}

      {showGridSettingsModal && (
        <GridSettingsModal
          settings={gridSettings}
          onClose={() => setShowGridSettingsModal(false)}
          onSave={newSettings => {
            setGridSettings(newSettings)
            setShowGridSettingsModal(false)
          }}
        />
      )}

      {showManageModal && (
        <ManageSchedulesModal
          courses={courses}
          onClose={() => setShowManageModal(false)}
          onDelete={handleDeleteCourse}
          onDeleteAll={handleDeleteAll}
        />
      )}
    </div>
  )
}