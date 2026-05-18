import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

const USE_MOCK = import.meta.env.VITE_GAMIFICATION_MOCK === 'true'

export function useGamification(weekId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getGamificationProfile(weekId, USE_MOCK)
      setProfile(data)
      return data
    } catch (err) {
      setError(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [weekId])

  useEffect(() => {
    load()
  }, [load])

  return { profile, loading, error, reload: load }
}

export function useSubjectGamification() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getGamificationSubjects()
      .then(setSubjects)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { subjects, loading }
}
