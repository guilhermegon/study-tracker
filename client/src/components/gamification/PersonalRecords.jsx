export default function PersonalRecords({ records }) {
  if (!records) return null
  const items = [
    { icon: '🔥', label: 'Maior sequência', value: records.bestStreak, unit: 'dias' },
    { icon: '📅', label: 'Melhor semana', value: records.bestWeek?.pages, sub: records.bestWeek?.name },
    { icon: '📄', label: 'Máx. páginas/dia', value: records.maxPagesDay?.value, sub: records.maxPagesDay?.date },
    { icon: '❓', label: 'Máx. questões/dia', value: records.maxQuestionsDay?.value, sub: records.maxQuestionsDay?.date },
    { icon: '🎯', label: 'Melhor taxa semanal', value: records.bestWeeklyAccuracy?.value != null ? records.bestWeeklyAccuracy.value + '%' : null, sub: records.bestWeeklyAccuracy?.name },
    { icon: '⚡', label: 'Maior XP diário', value: records.maxDailyXp?.xp, sub: records.maxDailyXp?.date },
  ].filter(i => i.value != null)

  if (!items.length) return null

  return (
    <section className="mb-8 gamification-enter">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Recordes Pessoais</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={i} className="card py-4">
            <span className="text-xl">{item.icon}</span>
            <p className="text-2xl font-bold text-gray-800 mt-1 tabular-nums">{item.value}{typeof item.value === 'number' && item.unit ? <span className="text-sm font-medium text-gray-400 ml-0.5">{item.unit}</span> : null}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{item.label}</p>
            {item.sub && <p className="text-[10px] text-gray-400 truncate">{item.sub}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
