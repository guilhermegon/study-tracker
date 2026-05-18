import { Link } from 'react-router-dom'
import RarityBadge from './RarityBadge'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function RecentAchievements({ achievements }) {
  const list = achievements ?? []
  if (!list.length) return null
  return (
    <section className="mb-8 gamification-enter">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Conquistas Recentes</h2>
        <Link to="/conquistas" className="text-sm text-teal-600 hover:text-teal-700 font-medium">Ver todas →</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {list.map(a => (
          <div key={a.id} className="flex-shrink-0 w-36 card py-3 px-3 text-center hover:shadow-md transition-shadow">
            <span className="text-2xl">{a.emoji}</span>
            <p className="text-xs font-semibold text-gray-800 mt-1 line-clamp-2">{a.name}</p>
            <div className="mt-1.5 flex justify-center"><RarityBadge rarity={a.rarity} small /></div>
            <p className="text-[10px] text-gray-400 mt-1">{formatDate(a.unlockedAt)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
