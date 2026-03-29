import { useState, useEffect } from 'react'
import { api } from '../api/client'

export function useDashboard(weekId, weekIds = []) {
  const [progress, setProgress] = useState([])
  const [accuracy, setAccuracy] = useState([])
  const [accuracyByWeek, setAccuracyByWeek] = useState([])
  const [comparison, setComparison] = useState([])
  const [studiedVsPlanned, setStudiedVsPlanned] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!weekId) return
    setLoading(true)
    const ids = weekIds.length > 0 ? weekIds : [weekId]

    Promise.all([
      api.getProgress(weekId),
      api.getAccuracy(weekId),
      Promise.all(ids.map(id => api.getAccuracy(id).then(rows => ({ weekId: id, rows })))),
      api.getComparison(ids),
      api.getStudiedVsPlanned(weekId),
    ]).then(([prog, acc, accByWeek, comp, svp]) => {
      setProgress(prog)
      setAccuracy(acc)
      setAccuracyByWeek(accByWeek)
      setComparison(comp)
      setStudiedVsPlanned(svp)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [weekId, JSON.stringify(weekIds)])

  return { progress, accuracy, accuracyByWeek, comparison, studiedVsPlanned, loading }
}
