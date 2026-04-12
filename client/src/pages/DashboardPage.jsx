import { useState } from 'react'
import { useWeekContext } from '../store/weekContext'
import { useDashboard } from '../hooks/useDashboard'
import ProgressBySubject from '../components/dashboard/ProgressBySubject'
import AccuracyChart from '../components/dashboard/AccuracyChart'
import AccuracyComparison from '../components/dashboard/AccuracyComparison'
import WeekComparison from '../components/dashboard/WeekComparison'
import StudiedVsPlanned from '../components/dashboard/StudiedVsPlanned'

export default function DashboardPage() {
  const { selectedWeekId, weeks } = useWeekContext()
  const [compareIds, setCompareIds] = useState([])

  const allWeekIds = compareIds.length > 0 ? [...new Set([selectedWeekId, ...compareIds])] : [selectedWeekId]
  const { progress, accuracy, accuracyByWeek, comparison, studiedVsPlanned, consistency, loading } = useDashboard(selectedWeekId, allWeekIds)

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
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Comparar com outras semanas
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCompareIds(weeks.filter(w => w.id !== selectedWeekId).map(w => w.id))}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Selecionar todas
              </button>
              <button
                onClick={() => setCompareIds([])}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {weeks.filter(w => w.id !== selectedWeekId).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(w => (
              <button
                key={w.id}
                onClick={() => toggleCompare(w.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${compareIds.includes(w.id)
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'}`}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Constância nos Estudos — global, não depende de loading de semana */}
      {consistency && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-700 mb-1">Constância nos Estudos</h2>
          <p className="text-xs text-gray-400 mb-4">Total histórico de dias com e sem estudo registrado</p>
          <div className="flex items-center gap-6">
            <div className="flex gap-4">
              <div className="text-center px-4 py-3 rounded-lg bg-green-50 border border-green-100">
                <div className="text-2xl font-bold text-green-600">{consistency.dias_estudados}</div>
                <div className="text-xs text-green-700 mt-0.5">dias estudados</div>
              </div>
              <div className="text-center px-4 py-3 rounded-lg bg-red-50 border border-red-100">
                <div className="text-2xl font-bold text-red-500">{consistency.dias_falhados}</div>
                <div className="text-xs text-red-600 mt-0.5">dias falhados</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Constância</span>
                <span className="text-sm font-bold text-gray-700">{consistency.percentual}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all"
                  style={{ width: `${consistency.percentual}%` }}
                />
              </div>
            </div>
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

          {/* Accuracy semana atual */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-700 mb-1">Taxa de Acerto em Exercícios</h2>
            <p className="text-xs text-gray-400 mb-4">% de acerto por disciplina nesta semana (linha = 70%)</p>
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

          {/* Week comparison - páginas */}
          {allWeekIds.length > 1 && (
            <div className="card xl:col-span-2">
              <h2 className="text-base font-semibold text-gray-700 mb-1">Comparativo entre Semanas</h2>
              <p className="text-xs text-gray-400 mb-4">Páginas estudadas por disciplina × semana</p>
              <WeekComparison data={comparison} />
            </div>
          )}

          {/* Accuracy comparison - multi-semanas */}
          {allWeekIds.length > 1 && (
            <div className="card xl:col-span-2">
              <h2 className="text-base font-semibold text-gray-700 mb-1">Taxa de Acerto — Comparativo entre Semanas</h2>
              <p className="text-xs text-gray-400 mb-4">% de acerto por disciplina em cada semana selecionada (linha = 70%)</p>
              <AccuracyComparison
                data={accuracyByWeek}
                weeks={allWeekIds.map(id => weeks.find(w => w.id === id)).filter(Boolean)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
