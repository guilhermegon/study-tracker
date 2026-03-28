import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function AccuracyChart({ data }) {
  if (!data.length) return <p className="text-gray-400 text-sm text-center py-8">Sem dados de exercícios</p>

  const chartData = data.map(d => ({
    name: d.subject_name.length > 15 ? d.subject_name.substring(0, 13) + '…' : d.subject_name,
    fullName: d.subject_name,
    accuracy: d.avg_accuracy,
    exercicios: d.total_exercicios,
    acertos: d.total_acertos,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
        <Tooltip
          formatter={(val, name, props) => [
            `${val}% (${props.payload.acertos}/${props.payload.exercicios} exercícios)`,
            '% Acerto'
          ]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
        />
        <ReferenceLine x={70} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '70%', fontSize: 10, fill: '#f59e0b' }} />
        <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.accuracy >= 70 ? '#10b981' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
