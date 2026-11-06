import trashIcon from '../../assets/icons/trash.svg'
import type { ScheduleItem } from '../../api/items'
import { formatTime } from '../../lib/schedule'
import Modal, { ModalCloseButton } from '../Modal'
import TypeBadges from './TypeBadges'
import './ManageSchedulesModal.css'

interface ManageSchedulesModalProps {
  items: ScheduleItem[]
  onClose: () => void
  onEdit: (item: ScheduleItem) => void
  onDelete: (item: ScheduleItem) => void
  onDeleteAll: () => void
}

function ManageSchedulesModal({ items, onClose, onEdit, onDelete, onDeleteAll }: ManageSchedulesModalProps) {
  return (
    <Modal onClose={onClose} labelledBy="manage-title" width={448}>
      <div className="modal-header">
        <div>
          <h2 id="manage-title" className="modal-title">
            Manage Schedules
          </h2>
          <p className="modal-subtitle">
            {items.length} schedule{items.length === 1 ? '' : 's'} · Click a row to edit
          </p>
        </div>
        <ModalCloseButton onClick={onClose} />
      </div>

      <div className="manage-list">
        {items.length === 0 ? (
          <p className="empty-state">No schedules yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="manage-row">
              <button type="button" className="manage-row-main" onClick={() => onEdit(item)}>
                <span className="color-dot" style={{ background: item.color }} />
                <span className="manage-row-text">
                  <span className="manage-row-title">
                    <strong>{item.title}</strong>
                    <TypeBadges types={item.types} />
                  </span>
                  <span className="manage-row-meta">
                    {item.days.join(', ')} · {formatTime(item.start_time)} – {formatTime(item.end_time)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="manage-row-delete"
                aria-label={`Delete ${item.title}`}
                onClick={() => onDelete(item)}
              >
                <img src={trashIcon} alt="" width={15.99} height={15.99} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="manage-footer">
        <button type="button" className="btn-danger-soft" disabled={items.length === 0} onClick={onDeleteAll}>
          Delete All Schedules
        </button>
      </div>
    </Modal>
  )
}

export default ManageSchedulesModal
