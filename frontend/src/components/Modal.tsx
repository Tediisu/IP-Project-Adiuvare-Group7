import { type ReactNode, useEffect } from 'react'
import closeIcon from '../assets/icons/close.svg'
import './Modal.css'

interface ModalProps {
  onClose: () => void
  labelledBy: string
  /** Max width in px; the dialog shrinks to fit narrower screens. */
  width: number
  className?: string
  children: ReactNode
}

function Modal({ onClose, labelledBy, width, className = '', children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${className}`}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="modal-close" aria-label="Close" onClick={onClick}>
      <img src={closeIcon} alt="" width={15.99} height={15.99} />
    </button>
  )
}

export default Modal
