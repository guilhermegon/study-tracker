import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function WeekComparison({ data, weeks }) {
  if (!data.length) return <p className="text-gray-400 text-sm text-center py-8">Sem dados</p>

  // Pivot: rows = subjects, bars = weeks
  const subjects = [...new Set(data.map(d => d.subject_name))]
  const weekNames = [...new Set(data.map(d => d.week_name))]

  const chartData = subjects.map(sub => {
    const row = { subject: sub.length > 15 ? sub.substring(0, 13) + '…' : sub, fullName: sub }
    for (const w of weekNames) {
      const found = data.find(d => d.subject_name === sub && d.week_name === w)
      row[w] = found?.total_pages || 0
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {weekNames.map((w, i) => (
          <Bar key={w} dataKey={w} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
