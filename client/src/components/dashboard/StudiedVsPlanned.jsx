const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function StudiedVsPlanned({ data }) {
  if (!data.length) return <p className="text-gray-400 text-sm text-center py-8">Sem dados</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 pr-4 font-medium text-gray-600 min-w-[140px]">Disciplina</th>
            {DIAS.map(d => (
              <th key={d} className="text-center py-2 px-3 font-medium text-gray-500 w-14">{d}</th>
            ))}
            <th className="text-center py-2 px-3 font-medium text-gray-500 w-16">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {data.map(row => (
            <tr key={row.subject_name} className="hover:bg-gray-50">
              <td className="py-2.5 pr-4 font-medium text-gray-700 text-xs">{row.subject_name}</td>
              {DIAS.map(d => {
                const val = row[d]
                return (
                  <td key={d} className="text-center py-2.5 px-3">
                    {val === null ? (
                      <span className="inline-block w-6 h-6 rounded bg-gray-100 text-gray-400 text-xs leading-6">–</span>
                    ) : val.studied > 0 ? (
                      <span className="inline-block w-6 h-6 rounded bg-green-100 text-green-700 text-xs leading-6 font-bold">✓</span>
                    ) : (
                      <span className="inline-block w-6 h-6 rounded bg-red-100 text-red-500 text-xs leading-6">✗</span>
                    )}
                  </td>
                )
              })}
              {(() => {
                const studied = DIAS.reduce((s, d) => s + (row[d]?.studied ?? 0), 0)
                const total   = DIAS.reduce((s, d) => s + (row[d]?.total   ?? 0), 0)
                const color = total === 0 ? 'bg-gray-100 text-gray-400'
                  : studied === total ? 'bg-green-100 text-green-700'
                  : studied === 0     ? 'bg-red-100 text-red-500'
                  : 'bg-yellow-100 text-yellow-700'
                return (
                  <td className="text-center py-2.5 px-3">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
                      {studied}/{total}
                    </span>
                  </td>
                )
              })()}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
