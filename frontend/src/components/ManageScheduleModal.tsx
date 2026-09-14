import { Trash2 } from 'lucide-react'
import type { Course } from '../routes/SchedulePage'
import '../styles/AddItemModal.css'

interface Props {
  courses: Course[]
  onClose: () => void
  onDelete: (id: number) => void
  onDeleteAll: () => void
}

export default function ManageSchedulesModal({ courses, onClose, onDelete, onDeleteAll }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal manage-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Manage Schedules</h2>
            <p className="modal-subtitle">{courses.length} schedule{courses.length !== 1 ? 's' : ''} · Click a row to edit</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="schedule-list">
          {courses.length === 0 && <p className="empty-state">No schedules yet.</p>}
          {courses.map(course => (
            <div key={course.id} className="schedule-row">
              <span className="row-dot" style={{ background: course.hex_color }} />
              <div className="row-info">
                <div className="row-title">
                  {course.name}
                  {course.course_type && <span className="row-tag">{course.course_type}</span>}
                </div>
                <div className="row-meta">
                  {course.days.join(', ')} · {course.start_time} – {course.end_time}
                </div>
              </div>
              <button className="row-delete" onClick={() => onDelete(course.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {courses.length > 0 && (
          <button className="btn-delete-all" onClick={onDeleteAll}>
            Delete All Schedules
          </button>
        )}
      </div>
    </div>
  )
}