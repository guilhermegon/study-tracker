import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeekContext } from '../store/weekContext'
import { api } from '../api/client'

function StatCard({ label, value, unit, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
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

  useEffect(() => {
    if (!selectedWeekId) return
    api.getSummary(selectedWeekId).then(setSummary).catch(console.error)
  }, [selectedWeekId])

  if (!selectedWeekId || weeks.length === 0) {
    return (
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
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Olá! 👋</h1>
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Link to="/semana" className="card hover:shadow-md transition-shadow group cursor-pointer">
          <div className="text-3xl mb-3">📋</div>
          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Visão Semanal</h3>
          <p className="text-sm text-gray-400 mt-1">Veja e edite os registros da semana</p>
        </Link>

        <Link to="/dashboard" className="card hover:shadow-md transition-shadow group cursor-pointer">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Dashboard</h3>
          <p className="text-sm text-gray-400 mt-1">Gráficos e métricas de desempenho</p>
        </Link>

        <Link to="/relatorio" className="card hover:shadow-md transition-shadow group cursor-pointer">
          <div className="text-3xl mb-3">📈</div>
          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Relatório</h3>
          <p className="text-sm text-gray-400 mt-1">Totais consolidados por semana</p>
        </Link>

        <Link to="/notas" className="card hover:shadow-md transition-shadow group cursor-pointer">
          <div className="text-3xl mb-3">📝</div>
          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Notas</h3>
          <p className="text-sm text-gray-400 mt-1">Suas anotações e lembretes</p>
        </Link>

        <Link to="/concursos" className="card hover:shadow-md transition-shadow group cursor-pointer">
          <div className="text-3xl mb-3">🏆</div>
          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Concursos</h3>
          <p className="text-sm text-gray-400 mt-1">Matérias e conteúdos por concurso</p>
        </Link>

        <Link to="/disciplinas" className="card hover:shadow-md transition-shadow group cursor-pointer">
          <div className="text-3xl mb-3">📖</div>
          <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">Disciplinas</h3>
          <p className="text-sm text-gray-400 mt-1">Gerencie todas as disciplinas</p>
        </Link>
      </div>
    </div>
  )
}
