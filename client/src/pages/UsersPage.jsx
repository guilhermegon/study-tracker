import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import { useAppToast } from '../components/layout/AppShell'
import { useAuth } from '../store/authContext'

export default function UsersPage() {
  const toast = useAppToast()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [adding, setAdding] = useState(false)
  const newInputRef = useRef(null)

  const [editId, setEditId] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setUsers(await api.getUsers())
    } catch {
      toast('Erro ao carregar usuários', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    const username = newUsername.trim()
    if (!username || newPassword.length < 6) return
    setAdding(true)
    try {
      const created = await api.createUser({ username, password: newPassword })
      setUsers(prev => [...prev, created])
      setNewUsername('')
      setNewPassword('')
      newInputRef.current?.focus()
      toast('Usuário criado!', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao criar usuário', 'error')
    } finally {
      setAdding(false)
    }
  }

  function startEdit(u) {
    setEditId(u.id)
    setEditUsername(u.username)
    setEditPassword('')
  }

  function cancelEdit() {
    setEditId(null)
    setEditUsername('')
    setEditPassword('')
  }

  async function handleSaveEdit(id) {
    const username = editUsername.trim()
    if (!username) return
    if (editPassword && editPassword.length < 6) {
      toast('A nova senha deve ter ao menos 6 caracteres', 'error')
      return
    }
    try {
      const body = { username }
      if (editPassword) body.password = editPassword
      const updated = await api.updateUser(id, body)
      setUsers(prev => prev.map(u => u.id === id ? updated : u))
      cancelEdit()
      toast('Usuário atualizado!', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao atualizar', 'error')
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Excluir o usuário "${u.username}"?`)) return
    try {
      await api.deleteUser(u.id)
      setUsers(prev => prev.filter(x => x.id !== u.id))
      toast('Usuário excluído', 'success')
    } catch (err) {
      toast(err.message || 'Erro ao excluir', 'error')
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie quem pode acessar o sistema.</p>
      </div>

      {/* Novo usuário */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          ref={newInputRef}
          className="input flex-1"
          value={newUsername}
          onChange={e => setNewUsername(e.target.value)}
          placeholder="Novo usuário..."
        />
        <input
          type="password"
          className="input flex-1"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Senha (mín. 6 caracteres)"
        />
        <button type="submit" disabled={adding || !newUsername.trim() || newPassword.length < 6} className="btn-primary whitespace-nowrap">
          {adding ? 'Adicionando...' : '+ Adicionar'}
        </button>
      </form>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {users.map(u => (
            <div key={u.id} className="group flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
              {editId === u.id ? (
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editUsername}
                      onChange={e => setEditUsername(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                      className="input flex-1 py-1"
                      placeholder="Usuário"
                    />
                    <button
                      onClick={() => handleSaveEdit(u.id)}
                      className="text-green-600 hover:text-green-700 font-bold text-sm px-2 transition-colors"
                      title="Salvar"
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-gray-400 hover:text-red-500 text-xs px-1 transition-colors"
                      title="Cancelar"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="input py-1"
                    placeholder="Nova senha (deixe em branco para manter)"
                  />
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-800">
                    {u.username}
                    {u.id === currentUser?.id && <span className="text-xs text-gray-400 font-normal ml-1.5">(você)</span>}
                    {!!u.must_change_password && (
                      <span className="text-xs text-amber-600 font-normal ml-1.5">· aguardando troca de senha</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(u)}
                      className="text-gray-400 hover:text-teal-600 text-xs px-2 py-1 rounded transition-colors"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-gray-400 hover:text-red-600 text-xs px-2 py-1 rounded transition-colors"
                      title="Excluir"
                    >
                      🗑
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
