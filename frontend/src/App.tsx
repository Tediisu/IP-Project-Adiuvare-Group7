// src/App.tsx
import { Routes, Route } from 'react-router-dom'
import LandingPage from './routes/LandingPage'
import SchedulePage from './routes/SchedulePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/schedule" element={<SchedulePage />} />
    </Routes>
  )
}