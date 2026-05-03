import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const WeekContext = createContext(null)

export function WeekProvider({ children }) {
  const [selectedWeekId, setSelectedWeekId] = useState(() => {
    const saved = localStorage.getItem('selectedWeekId')
    return saved ? Number(saved) : null
  })
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [subjectsKey, setSubjectsKey] = useState(0)

  const bumpSubjectsKey = () => setSubjectsKey(k => k + 1)

  const loadWeeks = async () => {
    try {
      const data = await api.getWeeks()
      setWeeks(data)
      // Auto-select first week if none selected or current one was deleted
      if (data.length > 0) {
        const exists = data.some(w => w.id === selectedWeekId)
        if (!exists) {
          setSelectedWeekId(data[0].id)
        }
      }
    } catch (e) {
      console.error('Erro ao carregar semanas', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadWeeks() }, [])

  useEffect(() => {
    if (selectedWeekId != null) {
      localStorage.setItem('selectedWeekId', selectedWeekId)
    }
  }, [selectedWeekId])

  const selectedWeek = weeks.find(w => w.id === selectedWeekId) ?? null

  return (
    <WeekContext.Provider value={{ selectedWeekId, selectedWeek, setSelectedWeekId, weeks, loadWeeks, loading, subjectsKey, bumpSubjectsKey }}>
      {children}
    </WeekContext.Provider>
  )
}

export function useWeekContext() {
  const ctx = useContext(WeekContext)
  if (!ctx) throw new Error('useWeekContext deve ser usado dentro de WeekProvider')
  return ctx
}
