import { useState, useEffect } from 'react'
import { useWeekContext } from '../store/weekContext'
import { api } from '../api/client'

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'text-blue-600   bg-blue-50',
    green:  'text-green-600  bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    red:    'text-red-600    bg-red-50',
  }
  return (
    <div className={`rounded-xl px-5 py-4 ${colors[color].split(' ')[1]}`}>
      <p className={`text-2xl font-bold ${colors[color].split(' ')[0]}`}>{value ?? '—'}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function RelatorioPage() {
  const { weeks } = useWeekContext()
  const [selectedIds, setSelectedIds] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedSubjects, setSelectedSubjects] = useState([])

  function toggle(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll() { setSelectedIds(weeks.map(w => w.id)) }
  function clearAll()  { setSelectedIds([]) }

  function toggleSubject(name) {
    setSelectedSubjects(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    )
  }

  useEffect(() => {
    if (selectedIds.length === 0) { setData(null); setSelectedSubjects([]); return }
    setLoading(true)
    setError(null)
    api.getTotals(selectedIds)
      .then(d => { setData(d); setSelectedSubjects([]) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedIds.join(',')])

  // Filtragem por disciplina (frontend)
  const filteredRows = data
    ? (selectedSubjects.length === 0 ? data.by_subject : data.by_subject.filter(r => selectedSubjects.includes(r.subject_name)))
    : []

  const filteredSummary = filteredRows.length > 0 ? (() => {
    const total_paginas    = filteredRows.reduce((a, r) => a + r.total_paginas, 0)
    const total_sessoes    = filteredRows.reduce((a, r) => a + r.total_sessoes, 0)
    const total_exercicios = filteredRows.reduce((a, r) => a + r.total_exercicios, 0)
    const total_acertos    = filteredRows.reduce((a, r) => a + r.total_acertos, 0)
    const total_registros  = filteredRows.reduce((a, r) => a + r.total_registros, 0)
    return {
      total_paginas, total_sessoes, total_exercicios, total_acertos, total_registros,
      total_semanas: data.summary.total_semanas,
      avg_accuracy: total_exercicios > 0 ? Math.round((total_acertos / total_exercicios) * 1000) / 10 : null,
    }
  })() : data?.summary

  const s = filteredSummary

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Relatório Consolidado</h1>
        <p className="text-sm text-gray-500 mt-1">Selecione as semanas para totalizar os dados</p>
      </div>

      {/* Seletor de semanas */}
      <div className="card py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Semanas</p>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Selecionar todas
            </button>
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600">
              Limpar
            </button>
          </div>
        </div>
        {weeks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhuma semana cadastrada</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {weeks.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(w => (
              <button
                key={w.id}
                onClick={() => toggle(w.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                  ${selectedIds.includes(w.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
              >
                {w.name}
              </button>
            ))}
          </div>
        )}
        {selectedIds.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            {selectedIds.length} semana{selectedIds.length > 1 ? 's' : ''} selecionada{selectedIds.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filtro por disciplina */}
      {data && data.by_subject.length > 0 && (
        <div className="card py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Disciplina</p>
            {selectedSubjects.length > 0 && (
              <button onClick={() => setSelectedSubjects([])} className="text-xs text-gray-400 hover:text-gray-600">
                Limpar filtro
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.by_subject.slice().sort((a, b) => a.subject_name.localeCompare(b.subject_name, 'pt-BR')).map(row => (
              <button
                key={row.subject_name}
                onClick={() => toggleSubject(row.subject_name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                  ${selectedSubjects.includes(row.subject_name)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
              >
                {row.subject_name}
              </button>
            ))}
          </div>
          {selectedSubjects.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {selectedSubjects.length} disciplina{selectedSubjects.length > 1 ? 's' : ''} selecionada{selectedSubjects.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Resultado */}
      {selectedIds.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📈</p>
          <p>Selecione ao menos uma semana para ver os dados</p>
        </div>
      ) : loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">{error}</div>
      ) : data && (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              label="Páginas estudadas"
              value={s.total_paginas.toLocaleString('pt-BR')}
              color="blue"
            />
            <StatCard
              label="Sessões de estudo"
              value={s.total_sessoes}
              sub={`de ${s.total_registros} registros`}
              color="green"
            />
            <StatCard
              label="Exercícios feitos"
              value={s.total_exercicios.toLocaleString('pt-BR')}
              sub={`${s.total_acertos} acertos`}
              color="orange"
            />
            <StatCard
              label="% Acerto geral"
              value={s.avg_accuracy != null ? `${s.avg_accuracy}%` : '—'}
              sub={s.avg_accuracy != null ? (s.avg_accuracy >= 70 ? '✓ Acima de 70%' : '✗ Abaixo de 70%') : 'Sem exercícios'}
              color={s.avg_accuracy != null ? (s.avg_accuracy >= 70 ? 'green' : 'red') : 'purple'}
            />
            <StatCard
              label="Semanas analisadas"
              value={s.total_semanas}
              color="purple"
            />
          </div>

          {/* Tabela por disciplina */}
          {filteredRows.length > 0 && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Totais por Disciplina</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-3">Disciplina</th>
                      <th className="text-center px-4 py-3">Páginas</th>
                      <th className="text-center px-4 py-3">Sessões</th>
                      <th className="text-center px-4 py-3">Exercícios</th>
                      <th className="text-center px-4 py-3">Acertos</th>
                      <th className="text-center px-4 py-3">% Acerto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRows.map(row => (
                      <tr key={row.subject_name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{row.subject_name}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{row.total_paginas.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{row.total_sessoes}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{row.total_exercicios}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{row.total_acertos}</td>
                        <td className="px-4 py-3 text-center">
                          {row.avg_accuracy != null
                            ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                                ${row.avg_accuracy >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {row.avg_accuracy}%
                              </span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Linha de totais */}
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-700">
                      <td className="px-4 py-3">Total geral</td>
                      <td className="px-4 py-3 text-center">{s.total_paginas.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-center">{s.total_sessoes}</td>
                      <td className="px-4 py-3 text-center">{s.total_exercicios}</td>
                      <td className="px-4 py-3 text-center">{s.total_acertos}</td>
                      <td className="px-4 py-3 text-center">
                        {s.avg_accuracy != null
                          ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                              ${s.avg_accuracy >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {s.avg_accuracy}%
                            </span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
