import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useWeekContext } from '../../store/weekContext'
import WeekFormModal from '../weeks/WeekFormModal'
import DuplicateWeekModal from '../weeks/DuplicateWeekModal'
import { api } from '../../api/client'

const NAV = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/lancamento', label: 'Lançar Estudo', icon: '✏️' },
  { to: '/semana', label: 'Visão Semanal', icon: '📋' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/relatorio', label: 'Relatório', icon: '📈' },
]

export default function Sidebar() {
  const { weeks, selectedWeekId, setSelectedWeekId, selectedWeek, loadWeeks } = useWeekContext()
  const [modal, setModal] = useState(false)
  const [editWeek, setEditWeek] = useState(null)
  const [duplicateModal, setDuplicateModal] = useState(false)

  function handleSaved(week) {
    loadWeeks()
    setSelectedWeekId(week.id)
  }

  async function handleDelete() {
    if (!selectedWeek) return
    if (!confirm(`Apagar a semana "${selectedWeek.name}"?\n\nTodos os registros serão excluídos permanentemente.`)) return
    await api.deleteWeek(selectedWeek.id)
    await loadWeeks()
  }

  function formatDate(d) {
    if (!d) return ''
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <>
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">📚 Study Tracker</h1>
          <p className="text-xs text-gray-400 mt-0.5">Gerenciador de estudos</p>
        </div>

        {/* Week selector */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Semana</span>
            <button
              onClick={() => { setEditWeek(null); setModal(true) }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + Nova
            </button>
          </div>
          {weeks.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Nenhuma semana cadastrada</p>
          ) : (
            <select
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
              value={selectedWeekId ?? ''}
              onChange={e => setSelectedWeekId(Number(e.target.value))}
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          {selectedWeek && (
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {formatDate(selectedWeek.date_start)} – {formatDate(selectedWeek.date_end)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditWeek(selectedWeek); setModal(true) }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                  title="Editar semana"
                >
                  ✏️ editar
                </button>
                <button
                  onClick={() => setDuplicateModal(true)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                  title="Duplicar semana"
                >
                  📋 duplicar
                </button>
                <button
                  onClick={handleDelete}
                  className="text-xs text-gray-400 hover:text-red-600"
                  title="Apagar semana"
                >
                  🗑️ apagar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to} to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-300 text-center">Study Tracker v1.0</p>
        </div>
      </aside>

      <WeekFormModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={handleSaved}
        week={editWeek}
      />

      <DuplicateWeekModal
        open={duplicateModal}
        onClose={() => setDuplicateModal(false)}
        onSaved={handleSaved}
        week={selectedWeek}
      />
    </>
  )
}
