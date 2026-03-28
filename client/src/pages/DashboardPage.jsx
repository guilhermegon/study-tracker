import { useState } from 'react'
import { useWeekContext } from '../store/weekContext'
import { useDashboard } from '../hooks/useDashboard'
import ProgressBySubject from '../components/dashboard/ProgressBySubject'
import AccuracyChart from '../components/dashboard/AccuracyChart'
import WeekComparison from '../components/dashboard/WeekComparison'
import StudiedVsPlanned from '../components/dashboard/StudiedVsPlanned'

export default function DashboardPage() {
  const { selectedWeekId, weeks } = useWeekContext()
  const [compareIds, setCompareIds] = useState([])

  const allWeekIds = compareIds.length > 0 ? [...new Set([selectedWeekId, ...compareIds])] : [selectedWeekId]
  const { progress, accuracy, comparison, studiedVsPlanned, loading } = useDashboard(selectedWeekId, allWeekIds)

  function toggleCompare(id) {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  if (!selectedWeekId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-4xl mb-4">📊</p>
        <p className="text-lg font-medium">Nenhuma semana selecionada</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Análise consolidada dos seus estudos</p>
      </div>

      {/* Week comparison selector */}
      {weeks.length > 1 && (
        <div className="card py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Comparar com outras semanas
          </p>
          <div className="flex flex-wrap gap-2">
            {weeks.filter(w => w.id !== selectedWeekId).map(w => (
              <button
                key={w.id}
                onClick={() => toggleCompare(w.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${compareIds.includes(w.id)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando dados...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Progress by subject */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Progresso por Disciplina</h2>
            <p className="text-xs text-gray-400 mb-4">Páginas e aulas estudadas nesta semana</p>
            <ProgressBySubject data={progress} />
          </div>

          {/* Accuracy */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Taxa de Acerto em Exercícios</h2>
            <p className="text-xs text-gray-400 mb-4">% de acerto por disciplina (linha = 70%)</p>
            <AccuracyChart data={accuracy} />
          </div>

          {/* Studied vs Planned */}
          <div className="card xl:col-span-2">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Estudado × Planejado</h2>
            <p className="text-xs text-gray-400 mb-4">
              <span className="inline-block w-4 h-4 rounded bg-green-100 text-green-700 text-xs text-center leading-4 mr-1">✓</span>Estudou
              <span className="inline-block w-4 h-4 rounded bg-red-100 text-red-500 text-xs text-center leading-4 mx-1 ml-3">✗</span>Não estudou
              <span className="inline-block w-4 h-4 rounded bg-gray-100 text-gray-400 text-xs text-center leading-4 mx-1 ml-3">–</span>Não planejado
            </p>
            <StudiedVsPlanned data={studiedVsPlanned} />
          </div>

          {/* Week comparison */}
          {allWeekIds.length > 1 && (
            <div className="card xl:col-span-2">
              <h2 className="text-base font-semibold text-gray-700 mb-1">Comparativo entre Semanas</h2>
              <p className="text-xs text-gray-400 mb-4">Páginas estudadas por disciplina × semana</p>
              <WeekComparison data={comparison} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
