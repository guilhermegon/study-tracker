import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ProgressBySubject({ data }) {
  if (!data.length) return <p className="text-gray-400 text-sm text-center py-8">Sem dados</p>

  const chartData = data.map(d => ({
    name: d.subject_name.length > 15 ? d.subject_name.substring(0, 13) + '…' : d.subject_name,
    fullName: d.subject_name,
    'Páginas estudadas': d.total_pages,
    'Aulas estudadas': d.aulas_studied,
    'Total aulas': d.total_aulas || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(val, name) => [val, name]}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Páginas estudadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Aulas estudadas" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
