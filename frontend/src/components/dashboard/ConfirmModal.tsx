import Modal from '../Modal'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose }: ConfirmModalProps) {
  return (
    <Modal onClose={onClose} labelledBy="confirm-modal-title" width={384} className="modal-compact">
      <h2 id="confirm-modal-title" className="modal-title">
        {title}
      </h2>
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline btn-subtle" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmModal
