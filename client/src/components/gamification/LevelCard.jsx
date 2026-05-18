import ProgressBar from './ProgressBar'

export default function LevelCard({ level }) {
  if (!level) return null

  return (
    <div className="card mb-8 gamification-enter">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 flex items-center justify-center text-2xl">
          ⭐
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-500">Nível {level.level}</span>
            <span className="text-lg font-bold text-gray-800">{level.title}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-semibold text-teal-600 tabular-nums">
              {(level.totalXp ?? 0).toLocaleString('pt-BR')}
            </span>{' '}
            XP total
            {level.xpToNextLevel > 0 && (
              <span className="text-gray-400">
                {' '}
                · faltam {level.xpToNextLevel.toLocaleString('pt-BR')} XP
              </span>
            )}
          </p>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progresso</span>
              <span className="tabular-nums">{level.progress}% até o nível {level.level + 1}</span>
            </div>
            <ProgressBar percent={level.progress} color="teal" size="md" />
          </div>
        </div>
      </div>
    </div>
  )
}
