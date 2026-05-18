import ProgressBar from './ProgressBar'

export default function DailyMissions({ missions, allCompleted, allBonusXp }) {
  if (!missions?.list?.length) return null
  return (
    <section className="mb-8 gamification-enter">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Missões de Hoje</h2>
        {allCompleted && <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">✓ Bônus +{allBonusXp} XP</span>}
      </div>
      <div className="grid gap-3">
        {missions.list.map(m => (
          <div key={m.instanceId ?? m.id} className={`card py-4 transition-all ${m.completed ? 'mission-complete ring-1 ring-teal-200' : ''}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center text-xs flex-shrink-0 ${m.completed ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300'}`}>
                {m.completed ? '✓' : ''}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800">{m.title}</p>
                  <span className="text-xs font-semibold text-teal-600">+{m.rewardXp} XP</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{m.progressLabel ?? `${m.current} / ${m.target}`}</p>
                <ProgressBar percent={m.progress} color="teal" size="sm" className="mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
