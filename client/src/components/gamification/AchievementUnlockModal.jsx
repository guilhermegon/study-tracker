import Modal from '../shared/Modal'
import RarityBadge from './RarityBadge'

export default function AchievementUnlockModal({ achievement, onClose }) {
  if (!achievement) return null
  return (
    <Modal open={!!achievement} onClose={onClose} title="" size="sm">
      <div className="text-center py-4 achievement-pop">
        <span className="text-6xl block mb-3">{achievement.emoji}</span>
        <p className="text-xs font-medium text-teal-600 uppercase tracking-wider mb-1">Conquista desbloqueada!</p>
        <h3 className="text-xl font-bold text-gray-800 mb-1">{achievement.name}</h3>
        <p className="text-sm text-gray-500 mb-3">{achievement.description}</p>
        <RarityBadge rarity={achievement.rarity} />
        <button onClick={onClose} className="btn-primary mt-6 w-full">Continuar</button>
      </div>
    </Modal>
  )
}
