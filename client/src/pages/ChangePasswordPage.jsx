import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authContext'

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Erro ao trocar senha')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-800">
            {user?.must_change_password ? 'Troque sua senha' : 'Alterar senha'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.must_change_password
              ? 'Este é o seu primeiro acesso. Defina uma nova senha para continuar.'
              : 'Defina uma nova senha para sua conta.'}
          </p>
        </div>

        {success ? (
          <div className="card flex flex-col gap-4 items-center text-center">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 w-full">
              Senha alterada com sucesso!
            </p>
            <button type="button" onClick={() => navigate('/', { replace: true })} className="btn-primary w-full">
              Continuar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="label">Senha atual</label>
              <input
                autoFocus
                type="password"
                className="input"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label">Nova senha</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
              className="btn-primary w-full"
            >
              {submitting ? 'Salvando...' : 'Salvar nova senha'}
            </button>
            <button type="button" onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">
              Sair
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
