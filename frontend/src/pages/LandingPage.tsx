import { useState } from 'react'
import { useNavigate } from 'react-router'
import arrowRightIcon from '../assets/icons/arrow-right.svg'
import calendarIcon from '../assets/icons/calendar.svg'
import moonIcon from '../assets/icons/moon.svg'
import AuthModal from '../components/AuthModal'
import { useTheme } from '../hooks/useTheme'
import { startGuestSession } from '../lib/session'
import './LandingPage.css'

function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false)
  const { toggleTheme } = useTheme()
  const navigate = useNavigate()

  const openAuth = () => setAuthOpen(true)

  function continueAsGuest() {
    startGuestSession()
    navigate('/dashboard')
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="brand-lockup">
          <div className="brand-mark">
            <img src={calendarIcon} alt="" width={23.993} height={23.993} />
          </div>
          <span>Adiuvare</span>
        </div>
        <div className="landing-actions">
          <button type="button" className="icon-button" aria-label="Toggle dark mode" onClick={toggleTheme}>
            <img className="invert-dark" src={moonIcon} alt="" width={21.997} height={21.997} />
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={openAuth}>
            Login
          </button>
        </div>
      </header>

      <main className="landing-main">
        <div className="landing-hero">
          <h1>
            welcome to
            <br />
            your schedule, <span className="highlight">simplified</span>
          </h1>
          <p className="landing-tagline">
            Beautifully designed, privacy-focused, and packed with features.
            <br />
            We care about your experience, not your data.
          </p>
          <div className="landing-cta">
            <button type="button" className="btn btn-primary btn-lg btn-shadow" onClick={openAuth}>
              Get Started
              <img className="invert-dark" src={arrowRightIcon} alt="" width={17.986} height={17.986} />
            </button>
            <button type="button" className="btn btn-outline btn-lg">
              Support Us
            </button>
          </div>
        </div>
      </main>

      <footer className="landing-footer">© 2026 Adiuvare · Your data stays yours, always.</footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onGuest={continueAsGuest} />}
    </div>
  )
}

export default LandingPage
