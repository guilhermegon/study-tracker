const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Erro na requisição')
  }
  return res.json()
}

export const api = {
  // Weeks
  getWeeks: () => request('/weeks'),
  getWeek: (id) => request(`/weeks/${id}`),
  createWeek: (data) => request('/weeks', { method: 'POST', body: data }),
  updateWeek: (id, data) => request(`/weeks/${id}`, { method: 'PUT', body: data }),
  deleteWeek: (id) => request(`/weeks/${id}`, { method: 'DELETE' }),
  duplicateWeek: (id, data) => request(`/weeks/${id}/duplicate`, { method: 'POST', body: data }),

  // Week subjects
  getWeekSubjects: (weekId) => request(`/weeks/${weekId}/subjects`),
  addWeekSubject: (weekId, data) => request(`/weeks/${weekId}/subjects`, { method: 'POST', body: data }),
  removeWeekSubject: (weekId, subjectId) => request(`/weeks/${weekId}/subjects/${subjectId}`, { method: 'DELETE' }),

  // Subjects
  getSubjects: () => request('/subjects'),
  createSubject: (data) => request('/subjects', { method: 'POST', body: data }),
  updateSubject: (id, data) => request(`/subjects/${id}`, { method: 'PUT', body: data }),
  deleteSubject: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),

  // Entries
  getEntries: (weekId, params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/weeks/${weekId}/entries${qs ? '?' + qs : ''}`)
  },
  createEntry: (weekId, data) => request(`/weeks/${weekId}/entries`, { method: 'POST', body: data }),
  updateEntry: (id, data) => request(`/entries/${id}`, { method: 'PUT', body: data }),
  deleteEntry: (id) => request(`/entries/${id}`, { method: 'DELETE' }),

  // Dashboard
  getProgress: (weekId) => request(`/dashboard/progress?week_id=${weekId}`),
  getAccuracy: (weekId) => request(`/dashboard/accuracy?week_id=${weekId}`),
  getComparison: (weekIds) => request(`/dashboard/comparison?week_ids=${weekIds.join(',')}`),
  getStudiedVsPlanned: (weekId) => request(`/dashboard/studied-vs-planned?week_id=${weekId}`),
  getSummary: (weekId) => request(`/dashboard/summary?week_id=${weekId}`),
  getTotals: (weekIds) => request(`/dashboard/totals?week_ids=${weekIds.join(',')}`),
}
