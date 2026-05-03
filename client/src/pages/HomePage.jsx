import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeekContext } from '../store/weekContext'
import { api } from '../api/client'

function StatCard({ label, value, unit, color }) {
  const colors = {
    blue: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className={`rounded-xl p-5 ${colors[color] || colors.blue}`}>
      <p className="text-3xl font-bold">{value ?? '—'}{unit && value != null ? <span className="text-lg ml-0.5">{unit}</span> : ''}</p>
      <p className="text-sm font-medium mt-1 opacity-75">{label}</p>
    </div>
  )
}

export default function HomePage() {
  const { selectedWeekId, selectedWeek, weeks } = useWeekContext()
  const [summary, setSummary] = useState(null)
  const [streak, setStreak] = useState(null)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateState, setUpdateState] = useState('idle') // 'idle' | 'loading' | 'done'

  useEffect(() => {
    if (!selectedWeekId) return
    api.getSummary(selectedWeekId).then(setSummary).catch(console.error)
  }, [selectedWeekId])

  useEffect(() => {
    api.getStreak().then(setStreak).catch(console.error)
  }, [])

  useEffect(() => {
    api.checkUpdate().then(setUpdateInfo).catch(() => {})
  }, [])

  async function handleUpdate() {
    setUpdateState('loading')
    try {
      await api.applyUpdate(updateInfo.latest)
      setUpdateState('done')
    } catch {
      setUpdateState('idle')
    }
  }

  const updateBanner = (
    <>
      {updateInfo?.available && updateState !== 'done' && (
        <div className="bg-teal-600 text-white px-6 py-3 flex items-center justify-between text-sm">
          <span>
            Nova versão disponível: <strong>{updateInfo.latest}</strong>
            {' '}(atual: v{updateInfo.current})
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpdate}
              disabled={updateState === 'loading'}
              className="bg-white text-teal-600 font-semibold px-4 py-1 rounded hover:bg-teal-50 disabled:opacity-60"
            >
              {updateState === 'loading' ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button onClick={() => setUpdateInfo(null)} className="opacity-70 hover:opacity-100">✕</button>
          </div>
        </div>
      )}
      {updateState === 'done' && (
        <div className="bg-green-600 text-white px-6 py-3 text-sm text-center">
          Atualização aplicada! O servidor está reiniciando — recarregue a página em alguns segundos.
        </div>
      )}
    </>
  )

  if (!selectedWeekId || weeks.length === 0) {
    return (
      <>
        {updateBanner}
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <p className="text-6xl mb-6">📚</p>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Bem-vinda ao Study Tracker!</h1>
          <p className="text-gray-500 mb-8 max-w-sm">
            Registre sua rotina semanal de estudos e acompanhe seu progresso com gráficos e métricas.
          </p>
          <p className="text-sm text-gray-400">
            Comece criando uma semana na barra lateral →
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      {updateBanner}
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Olá2! 👋</h1>
          {selectedWeek && (
            <p className="text-gray-500 mt-1">
              Semana atual: <span className="font-medium text-gray-700">{selectedWeek.name}</span>
              {selectedWeek.context && <span className="text-gray-400"> · {selectedWeek.context}</span>}
              <span className="text-gray-400 ml-2 text-sm">
                ({selectedWeek.date_start?.split('-').reverse().join('/')} – {selectedWeek.date_end?.split('-').reverse().join('/')})
              </span>
            </p>
          )}
        </div>

        {/* Streak widget */}
        {streak !== null && (
          <div className={`mb-8 rounded-2xl px-6 py-5 flex items-center gap-6 ${
            streak.streak > 0
              ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200'
              : 'bg-gray-50 border border-gray-200'
          }`}>
            {/* Flame */}
            <div className={`text-5xl leading-none select-none ${streak.streak > 0 ? '' : 'grayscale opacity-40'}`}>
              🔥
            </div>

            {/* Sequência atual */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-extrabold tabular-nums leading-none ${streak.streak > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                  {streak.streak}
                </span>
                <span className={`text-lg font-semibold ${streak.streak > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                  {streak.streak === 1 ? 'dia seguido' : 'dias seguidos'}
                </span>
              </div>
              <p className="text-sm mt-1 text-gray-500">
                {streak.streak > 0
                  ? 'Sequência atual de estudo — continue assim!'
                  : 'Nenhuma sequência ativa. Estude hoje para começar!'}
              </p>
            </div>

            {/* Divisor */}
            <div className="w-px self-stretch bg-orange-100 shrink-0" />

            {/* Recorde */}
            <div className="text-center shrink-0">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-extrabold tabular-nums text-amber-500">{streak.bestStreak}</span>
                <span className="text-sm font-medium text-amber-400">{streak.bestStreak === 1 ? 'dia' : 'dias'}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 justify-center">
                <span>🏆</span> Melhor sequência
              </p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Sessões de estudo" value={summary.sessoes_estudadas} color="blue" />
            <StatCard label="Páginas estudadas" value={summary.total_paginas} color="green" />
            <StatCard label="Dias com estudo" value={summary.dias_estudados} color="purple" />
            <StatCard
              label="Taxa de acerto"
              value={summary.avg_accuracy != null ? summary.avg_accuracy : null}
              unit="%"
              color="orange"
            />
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <Link to="/semana" className="card hover:shadow-md transition-shadow group cursor-pointer">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">Visão Semanal</h3>
            <p className="text-sm text-gray-400 mt-1">Veja e edite os registros da semana</p>
          </Link>

          <Link to="/dashboard" className="card hover:shadow-md transition-shadow group cursor-pointer">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">Dashboard</h3>
            <p className="text-sm text-gray-400 mt-1">Gráficos e métricas de desempenho</p>
          </Link>

          <Link to="/relatorio" className="card hover:shadow-md transition-shadow group cursor-pointer">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">Relatório</h3>
            <p className="text-sm text-gray-400 mt-1">Totais consolidados por semana</p>
          </Link>

          <Link to="/notas" className="card hover:shadow-md transition-shadow group cursor-pointer">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">Notas</h3>
            <p className="text-sm text-gray-400 mt-1">Suas anotações e lembretes</p>
          </Link>

          <Link to="/concursos" className="card hover:shadow-md transition-shadow group cursor-pointer">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">Concursos</h3>
            <p className="text-sm text-gray-400 mt-1">Matérias e conteúdos por concurso</p>
          </Link>

          <Link to="/disciplinas" className="card hover:shadow-md transition-shadow group cursor-pointer">
            <div className="text-3xl mb-3">📖</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">Disciplinas</h3>
            <p className="text-sm text-gray-400 mt-1">Gerencie todas as disciplinas</p>
          </Link>

          <Link to="/disciplinas" className="card hover:shadow-md transition-shadow group cursor-pointer">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">Provas</h3>
            <p className="text-sm text-gray-400 mt-1">Gerencie todas as provas</p>
          </Link>

          <Link to="/backup" className="card hover:shadow-md transition-shadow group cursor-pointer">
            <div className="text-3xl mb-3">💾</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">Backup</h3>
            <p className="text-sm text-gray-400 mt-1">Baixe ou restaure seus dados</p>
          </Link>
        </div>
      </div>
    </>
  )
}
