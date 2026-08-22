import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refetch = () => api.getMe().then(setUser).catch(() => setUser(null))

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [])

  async function login(username, password) {
    const data = await api.login(username, password)
    setUser(data)
    return data
  }

  async function logout() {
    await api.logout().catch(() => {})
    setUser(null)
  }

  async function changePassword(currentPassword, newPassword) {
    await api.changePassword(currentPassword, newPassword)
    await refetch()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, refetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
