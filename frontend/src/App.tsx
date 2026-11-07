import { Route, Routes } from 'react-router'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route index element={<LandingPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
