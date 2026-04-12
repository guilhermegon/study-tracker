import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend, LabelList,
} from 'recharts'

const COLORS = ['#0d9488', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4']

function shortName(name) {
  return name.length > 14 ? name.substring(0, 12) + '…' : name
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{payload[0]?.payload?.fullName ?? label}</p>
      {payload.map(p => (
        p.value != null && (
          <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.fill }} />
            <span className="text-gray-600">{p.name}:</span>
            <span className="font-semibold" style={{ color: p.fill }}>
              {p.value}%
              {p.payload[`_ex_${p.dataKey}`] > 0 && (
                <span className="text-gray-400 font-normal ml-1">
                  ({p.payload[`_ac_${p.dataKey}`]}/{p.payload[`_ex_${p.dataKey}`]})
                </span>
              )}
            </span>
          </div>
        )
      ))}
    </div>
  )
}

export default function AccuracyComparison({ data, weeks }) {
  // data: [{weekId, rows: [{subject_name, avg_accuracy, total_exercicios, total_acertos}]}]
  const allSubjects = [...new Set(data.flatMap(d => d.rows.map(r => r.subject_name)))]

  if (allSubjects.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">Sem dados de exercícios nas semanas selecionadas</p>
  }

  const weekEntries = data.map((d, i) => ({
    key: String(d.weekId),
    label: weeks.find(w => w.id === d.weekId)?.name ?? `Semana ${i + 1}`,
    color: COLORS[i % COLORS.length],
    rows: d.rows,
  }))

  const chartData = allSubjects.map(subject => {
    const entry = { name: shortName(subject), fullName: subject }
    weekEntries.forEach(({ key, label, rows }) => {
      const row = rows.find(r => r.subject_name === subject)
      entry[key] = row?.avg_accuracy ?? null
      entry[`_ex_${key}`] = row?.total_exercicios ?? 0
      entry[`_ac_${key}`] = row?.total_acertos ?? 0
    })
    return entry
  })

  return (
    <div>
      {/* Legenda manual acima */}
      <div className="flex flex-wrap gap-4 mb-4">
        {weekEntries.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 48 }} barCategoryGap="25%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            angle={allSubjects.length > 5 ? -35 : 0}
            textAnchor={allSubjects.length > 5 ? 'end' : 'middle'}
            interval={0}
          />
          <YAxis
            domain={[0, 100]}
            unit="%"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <ReferenceLine
            y={70} stroke="#f59e0b" strokeDasharray="4 4"
            label={{ value: '70%', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
          />
          {weekEntries.map(({ key, label, color }) => (
            <Bar key={key} dataKey={key} name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={32}>
              <LabelList
                dataKey={key}
                position="top"
                formatter={v => v != null ? `${v}%` : ''}
                style={{ fontSize: 9, fill: '#6b7280' }}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
