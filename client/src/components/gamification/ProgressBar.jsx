export default function ProgressBar({
  value = 0,
  max = 100,
  percent,
  color = 'teal',
  size = 'md',
  showLabel = false,
  className = '',
}) {
  const pct = percent != null ? percent : (max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0)
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }
  const colors = {
    teal: 'bg-teal-500',
    orange: 'bg-orange-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
  }
  const h = heights[size] ?? heights.md

  return (
    <div className={className}>
      <div className={`w-full ${h} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          className={`${h} ${colors[color] ?? colors.teal} rounded-full transition-all duration-700 ease-out progress-bar-fill`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <p className="text-xs text-gray-400 mt-1 tabular-nums">{pct}%</p>}
    </div>
  )
}
