import { useState } from 'react'
import { useWeekContext } from '../store/weekContext'
import { useGamification } from '../hooks/useGamification'
import RarityBadge from '../components/gamification/RarityBadge'
import ProgressBar from '../components/gamification/ProgressBar'

const CATEGORIES = [
  { key: 'streak',      label: 'Sequência',             emoji: '🔥' },
  { key: 'volume',      label: 'Volume de Estudo',       emoji: '📄' },
  { key: 'questions',   label: 'Questões',               emoji: '🎯' },
  { key: 'performance', label: 'Desempenho',             emoji: '📈' },
  { key: 'subjects',    label: 'Disciplinas',            emoji: '🎓' },
  { key: 'schedule',    label: 'Cronograma',             emoji: '📅' },
  { key: 'special',     label: 'Conquistas Especiais',   emoji: '⚔️' },
  { key: 'secret',      label: 'Conquistas Ocultas',     emoji: '🔮' },
]

const RARITY_ORDER = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 }

const FILTERS = [
  { key: 'all',      label: 'Todas' },
  { key: 'unlocked', label: 'Desbloqueadas' },
  { key: 'locked',   label: 'Bloqueadas' },
]

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function progressLabel(a) {
  if (!a.progress) return null
  const { current, target } = a.progress
  const id = a.id
  if (id.startsWith('pages_') || id === 'secret_marathon' || id === 'composite_perfect_week' || id === 'composite_week_monster')
    return `${current.toLocaleString('pt-BR')} / ${target.toLocaleString('pt-BR')} páginas`
  if (id.startsWith('questions_') || id.startsWith('correct_') || id === 'secret_resilience' || id === 'secret_big_day')
    return `${current.toLocaleString('pt-BR')} / ${target.toLocaleString('pt-BR')} questões`
  if (id.startsWith('streak_') || id === 'secret_long_streak')
    return `${current} / ${target} dias seguidos`
  if (id.startsWith('study_days_'))
    return `${current} / ${target} dias estudados`
  if (id.startsWith('sessions_'))
    return `${current} / ${target} sessões`
  if (id.startsWith('accuracy_')) {
    // two-stage: first progress is question count, then accuracy %
    return target <= 100 && current <= target
      ? `${current} / ${target} questões respondidas`
      : `${current}% / ${target}%`
  }
  if (id === 'consistency_good') return `${current} / ${target} dias de estudo`
  if (id === 'subjects_3' || id === 'subjects_5' || id === 'subjects_10')
    return `${current} / ${target} disciplinas`
  if (id === 'schedule_week') return `${current} / ${target} dias na melhor semana`
  if (id === 'positive_balance') return `${current} acertos / ${target} total`
  return `${current} / ${target}`
}

function AchievementCard({ a }) {
  const isSecretLocked = a.secret && !a.unlocked
  const label          = isSecretLocked ? null : progressLabel(a)

  if (isSecretLocked) {
    return (
      <div className="card py-4 flex items-start gap-3 opacity-50 grayscale">
        <span className="text-3xl leading-none select-none flex-shrink-0">❓</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold leading-snug text-gray-500">Conquista Oculta</p>
            <RarityBadge rarity={a.rarity} small />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">???</p>
          <p className="text-[10px] text-gray-300 mt-1.5">🔒 Bloqueada</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`card py-4 flex items-start gap-3 transition-all duration-300 ${
        a.unlocked ? '' : 'opacity-50 grayscale'
      }`}
    >
      <span className="text-3xl leading-none select-none flex-shrink-0">{a.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className={`text-sm font-semibold leading-snug ${a.unlocked ? 'text-gray-800' : 'text-gray-500'}`}>
            {a.name}
          </p>
          <RarityBadge rarity={a.rarity} small />
        </div>
        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{a.description}</p>

        {a.unlocked && a.unlockedAt ? (
          <p className="text-[10px] text-teal-600 mt-1.5 font-medium flex items-center gap-1">
            ✓ Desbloqueada em {formatDate(a.unlockedAt)}
          </p>
        ) : a.progress ? (
          <div className="mt-2">
            <ProgressBar value={a.progress.current} max={a.progress.target} color="teal" size="sm" />
            <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">{label}</p>
          </div>
        ) : (
          <p className="text-[10px] text-gray-300 mt-1.5">🔒 Bloqueada</p>
        )}
      </div>
    </div>
  )
}

export default function ConquistasPage() {
  const { selectedWeekId } = useWeekContext()
  const { profile, loading } = useGamification(selectedWeekId)
  const [filter, setFilter] = useState('all')

  const achievements = profile?.achievements?.all ?? []
  const unlocked = achievements.filter(a => a.unlocked)
  const total = achievements.length
  const pct = total > 0 ? Math.round((unlocked.length / total) * 100) : 0

  const visibleAchievements = filter === 'unlocked'
    ? achievements.filter(a => a.unlocked)
    : filter === 'locked'
      ? achievements.filter(a => !a.unlocked)
      : achievements

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Carregando conquistas...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Conquistas</h1>
        <p className="text-sm text-gray-500 mt-1">
          {unlocked.length} de {total} conquistas desbloqueadas
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.key === 'unlocked' && (
              <span className={`ml-1.5 tabular-nums text-xs ${filter === f.key ? 'text-teal-200' : 'text-gray-400'}`}>
                {unlocked.length}
              </span>
            )}
            {f.key === 'locked' && (
              <span className={`ml-1.5 tabular-nums text-xs ${filter === f.key ? 'text-teal-200' : 'text-gray-400'}`}>
                {total - unlocked.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Progress summary card */}
      {total > 0 && filter === 'all' && (
        <div className="card mb-10 gamification-enter">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Progresso geral</span>
            <span className="text-sm font-bold text-teal-600 tabular-nums">{pct}%</span>
          </div>
          <ProgressBar percent={pct} color="teal" size="md" />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{unlocked.length} desbloqueadas</span>
            <span>{total - unlocked.length} restantes</span>
          </div>

          {/* Rarity breakdown */}
          <div className="flex flex-wrap gap-2 mt-4">
            {(['mythic', 'legendary', 'epic', 'rare', 'common']).map(r => {
              const all  = achievements.filter(a => a.rarity === r)
              const done = all.filter(a => a.unlocked)
              if (!all.length) return null
              return (
                <div key={r} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <RarityBadge rarity={r} small />
                  <span className="tabular-nums text-gray-400">{done.length}/{all.length}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Categories */}
      {CATEGORIES.map((cat, catIdx) => {
        const items = visibleAchievements
          .filter(a => a.category === cat.key)
          .sort((a, b) => {
            if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
            return (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5)
          })
        if (!items.length) return null

        const catAll      = achievements.filter(a => a.category === cat.key)
        const catUnlocked = catAll.filter(a => a.unlocked).length

        return (
          <section
            key={cat.key}
            className="mb-10 gamification-enter"
            style={{ animationDelay: `${catIdx * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
                <span>{cat.emoji}</span>
                {cat.label}
              </h2>
              <span className="text-xs text-gray-400 tabular-nums">
                {catUnlocked}/{catAll.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(a => <AchievementCard key={a.id} a={a} />)}
            </div>
          </section>
        )
      })}

      {visibleAchievements.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🏅</p>
          {filter === 'unlocked'
            ? <><p className="text-lg font-medium">Nenhuma conquista desbloqueada ainda</p><p className="text-sm mt-1">Continue estudando para desbloquear conquistas!</p></>
            : filter === 'locked'
              ? <p className="text-lg font-medium">Todas as conquistas foram desbloqueadas!</p>
              : <><p className="text-lg font-medium">Nenhuma conquista ainda</p><p className="text-sm mt-1">Continue estudando para desbloquear conquistas!</p></>
          }
        </div>
      )}
    </div>
  )
}
