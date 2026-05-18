import ProgressBar from './ProgressBar'

export default function StreakCard({ streak }) {
  if (!streak) return null
  const active = streak.current > 0
  return (
    <div className={`mb-8 rounded-2xl px-6 py-5 ${active ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'} gamification-enter`}>
      <div className="flex items-start gap-6 flex-wrap">
        <span className={`text-5xl leading-none select-none ${active ? '' : 'grayscale opacity-40'}`}>🔥</span>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-extrabold tabular-nums leading-none ${active ? 'text-orange-500' : 'text-gray-300'}`}>{streak.current}</span>
            <span className={`text-lg font-semibold ${active ? 'text-orange-400' : 'text-gray-400'}`}>
              {streak.current === 1 ? 'dia seguido' : 'dias seguidos'}
            </span>
          </div>
          <p className="text-sm mt-1 text-gray-600 italic">"{streak.phrase}"</p>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{streak.nextReward?.label ?? 'Próxima recompensa'}</span>
              <span className="tabular-nums">{streak.rewardProgress ?? 0}%</span>
            </div>
            <ProgressBar percent={streak.rewardProgress ?? 0} color="orange" size="sm" />
          </div>
          {streak.protectionActive && (
            <p className="text-xs text-teal-600 mt-2 flex items-center gap-1">🛡️ Proteção de streak ativa</p>
          )}
        </div>
        <div className="w-px self-stretch bg-orange-100 shrink-0 hidden sm:block" />
        <div className="text-center shrink-0">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-3xl font-extrabold tabular-nums text-amber-500">{streak.best}</span>
            <span className="text-sm font-medium text-amber-400">{streak.best === 1 ? 'dia' : 'dias'}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">🏆 Melhor sequência</p>
        </div>
      </div>
    </div>
  )
}
