import { useNavigate } from 'react-router-dom'
import { Calendar, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import '../styles/LandingPage.css'

export default function LandingPage() {
    const navigate = useNavigate()
    const { theme, toggleTheme } = useTheme()

  return (
    <div className="landing">
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

      <main className="hero">
        <h1 className="hero-title">
          welcome to<br />
          your schedule,<br />
          <span className="hero-accent">simplified</span>
        </h1>
        <p className="hero-subtitle">Beautifully designed</p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => navigate('/schedule')}>
            Get Started <span className="arrow">→</span>
          </button>
          <button className="btn-secondary">Support Us</button>
        </div>
      </main>

      <footer className="landing-footer">
        © 2026 Adiuvare · Teehee, always.
      </footer>
    </div>
  )
}