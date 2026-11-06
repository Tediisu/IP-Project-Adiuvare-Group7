import { useState } from 'react'
import calendarIcon from '../assets/icons/calendar.svg'
import googleIcon from '../assets/icons/google.svg'
import Modal, { ModalCloseButton } from './Modal'
import './AuthModal.css'

interface AuthModalProps {
  onClose: () => void
  onGuest: () => void
}

function AuthModal({ onClose, onGuest }: AuthModalProps) {
  const [connecting, setConnecting] = useState(false)

  function handleGoogleSignIn() {
    // TODO: start the Google OAuth flow once the backend supports it.
    setConnecting(true)
  }

  return (
    <Modal onClose={onClose} labelledBy="auth-modal-title" width={384} className="modal-compact auth-modal">
      <ModalCloseButton onClick={onClose} />

      <div className="auth-modal-heading">
        <div className="brand-mark">
          <img src={calendarIcon} alt="" width={23.993} height={23.993} />
        </div>
        <h2 id="auth-modal-title">Get started</h2>
        <p>Create your account — it's free</p>
      </div>

      {connecting ? (
        <div className="auth-modal-connecting" role="status">
          <div className="spinner" />
          <p>Connecting to Google...</p>
        </div>
      ) : (
        <div className="auth-modal-options">
          <button type="button" className="google-button" onClick={handleGoogleSignIn}>
            <img src={googleIcon} alt="" width={20} height={20} />
            Continue with Google
          </button>
          <button type="button" className="link-button" onClick={onGuest}>
            Continue as guest
          </button>
        </div>
      )}

      <p className="auth-modal-legal">
        By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
      </p>
    </Modal>
  )
}

export default AuthModal
