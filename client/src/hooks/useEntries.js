import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

export function useEntries(weekId, params = {}) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!weekId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getEntries(weekId, params)
      setEntries(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [weekId, JSON.stringify(params)])

  useEffect(() => { load() }, [load])

  return { entries, loading, error, reload: load }
}
