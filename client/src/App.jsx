import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WeekProvider } from './store/weekContext'
import AppShell from './components/layout/AppShell'
import HomePage from './pages/HomePage'
import WeeklyViewPage from './pages/WeeklyViewPage'
import DashboardPage from './pages/DashboardPage'
import RelatorioPage from './pages/RelatorioPage'
import NotasPage from './pages/NotasPage'
import ConcursosPage from './pages/ConcursosPage'
import DisciplinasPage from './pages/DisciplinasPage'
import BackupPage from './pages/BackupPage'
import ProvasPage from './pages/ProvasPage'

export default function App() {
  return (
    <BrowserRouter>
      <WeekProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/semana" element={<WeeklyViewPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/relatorio" element={<RelatorioPage />} />
            <Route path="/notas" element={<NotasPage />} />
            <Route path="/concursos" element={<ConcursosPage />} />
            <Route path="/disciplinas" element={<DisciplinasPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/provas" element={<ProvasPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </WeekProvider>
    </BrowserRouter>
  )
}
