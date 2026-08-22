import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { WeekProvider } from './store/weekContext'
import { AuthProvider, useAuth } from './store/authContext'
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
import ConquistasPage from './pages/ConquistasPage'
import UsersPage from './pages/UsersPage'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'

function WeekShell() {
  return (
    <WeekProvider>
      <AppShell />
    </WeekProvider>
  )
}

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (user.must_change_password && location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/trocar-senha" element={<ChangePasswordPage />} />
            <Route element={<WeekShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/semana" element={<WeeklyViewPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/relatorio" element={<RelatorioPage />} />
              <Route path="/notas" element={<NotasPage />} />
              <Route path="/concursos" element={<ConcursosPage />} />
              <Route path="/disciplinas" element={<DisciplinasPage />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="/provas" element={<ProvasPage />} />
              <Route path="/conquistas" element={<ConquistasPage />} />
              <Route path="/usuarios" element={<UsersPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
