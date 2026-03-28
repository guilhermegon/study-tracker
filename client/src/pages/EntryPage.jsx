import { useState, useEffect } from 'react'
import { useWeekContext } from '../store/weekContext'
import EntryForm from '../components/entries/EntryForm'
import { api } from '../api/client'
import { useAppToast } from '../components/layout/AppShell'

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function EntryPage() {
  const { selectedWeekId, selectedWeek } = useWeekContext()
  const toast = useAppToast()
  const [activeDia, setActiveDia] = useState('Seg')
  const [weekSubjects, setWeekSubjects] = useState([])
  const [recentEntries, setRecentEntries] = useState([])

  useEffect(() => {
    if (!selectedWeekId) return
    api.getWeekSubjects(selectedWeekId).then(setWeekSubjects).catch(console.error)
    loadRecent()
  }, [selectedWeekId, activeDia])

  async function loadRecent() {
    if (!selectedWeekId) return
    const data = await api.getEntries(selectedWeekId, { dia: activeDia })
    setRecentEntries(data)
  }

  function handleSaved(entry) {
    toast('Registro adicionado!', 'success')
    loadRecent()
  }

  async function handleDelete(id) {
    await api.deleteEntry(id)
    toast('Registro removido', 'success')
    loadRecent()
  }

  if (!selectedWeekId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-4xl mb-4">📅</p>
        <p className="text-lg font-medium">Nenhuma semana selecionada</p>
        <p className="text-sm mt-1">Crie ou selecione uma semana na barra lateral.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lançar Estudo</h1>
        {selectedWeek && (
          <p className="text-sm text-gray-500 mt-1">
            {selectedWeek.name}
            {selectedWeek.context && <span className="text-gray-400"> · {selectedWeek.context}</span>}
          </p>
        )}
      </div>

      {/* Day tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {DIAS.map(d => (
          <button
            key={d}
            onClick={() => setActiveDia(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeDia === d
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="card mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Novo registro — {activeDia}</h2>
        <EntryForm
          weekId={selectedWeekId}
          defaultDia={activeDia}
          weekSubjects={weekSubjects}
          onSaved={handleSaved}
        />
      </div>

      {/* Entries for this day */}
      {recentEntries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Registros de {activeDia} ({recentEntries.length})
          </h2>
          <div className="space-y-2">
            {recentEntries.map(e => (
              <div key={e.id}
                className={`card py-3 px-4 flex items-start justify-between gap-4
                  ${!e.estudado ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.estudado ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="font-medium text-gray-800 text-sm">{e.subject_name}</span>
                    {e.percentual_acerto != null && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {e.percentual_acerto}% acerto
                      </span>
                    )}
                  </div>
                  {e.aula_estudada && (
                    <p className="text-xs text-gray-500 mt-0.5 ml-4 truncate">{e.aula_estudada}</p>
                  )}
                  <div className="flex gap-3 ml-4 mt-1 text-xs text-gray-400">
                    {e.num_pags_inicio && <span>Págs: {e.num_pags_inicio}–{e.num_pags_fim}</span>}
                    {e.qtd_pags_estudadas > 0 && <span>{e.qtd_pags_estudadas} págs</span>}
                    {e.num_exercicios > 0 && <span>{e.num_acertos}/{e.num_exercicios} exercícios</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(e.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 text-xs">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
