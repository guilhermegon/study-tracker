const RARITY = {
  common: 'bg-gray-100 text-gray-600 border-gray-200',
  rare: 'bg-blue-50 text-blue-700 border-blue-200',
  epic: 'bg-purple-50 text-purple-700 border-purple-200',
  legendary: 'bg-amber-50 text-amber-700 border-amber-200',
  mythic: 'bg-rose-50 text-rose-700 border-rose-200',
}

const RARITY_LABEL = {
  common: 'Comum',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Lendária',
  mythic: 'Mítica',
}

export default function RarityBadge({ rarity, small = false }) {
  return (
    <span
      className={`inline-flex items-center border rounded-full font-medium ${
        small ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
      } ${RARITY[rarity] ?? RARITY.common}`}
    >
      {RARITY_LABEL[rarity] ?? rarity}
    </span>
  )
}
