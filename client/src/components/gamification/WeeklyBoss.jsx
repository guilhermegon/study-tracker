import ProgressBar from './ProgressBar'

export default function WeeklyBoss({ boss }) {
  if (!boss) return null
  return (
    <section className="mb-8 gamification-enter">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Boss da Semana</h2>
      <div className="card border-purple-100 bg-gradient-to-br from-white to-purple-50/30">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{boss.emoji}</span>
          <div>
            <h3 className="font-bold text-gray-800">{boss.title}</h3>
            <p className="text-xs text-gray-500">Recompensa: {boss.rewardBadge?.emoji} {boss.rewardBadge?.name} + {boss.rewardXp} XP</p>
          </div>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progresso geral</span>
            <span className="tabular-nums">{boss.overallProgress}%</span>
          </div>
          <ProgressBar percent={boss.overallProgress} color="purple" size="md" />
        </div>
        <div className="space-y-3">
          {boss.goals?.map(g => (
            <div key={g.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{g.label}</span>
                <span className="text-gray-500 tabular-nums">{g.current} / {g.target}</span>
              </div>
              <ProgressBar percent={g.progress} color="purple" size="sm" />
            </div>
          ))}
        </div>
        {boss.completed && (
          <p className="text-sm font-medium text-purple-700 mt-4 text-center">🎉 Boss derrotado esta semana!</p>
        )}
      </div>
    </section>
  )
}
