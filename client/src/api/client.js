const BASE = '/api'

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (!['GET', 'HEAD'].includes(method)) {
    const csrfToken = getCsrfToken()
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  const res = await fetch(`${BASE}${path}`, {
    headers,
    credentials: 'include',
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
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  // Users
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

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

  // Week day order (drag-and-drop persistence)
  getWeekOrder: (weekId) => request(`/weeks/${weekId}/order`),
  saveWeekDayOrder: (weekId, dia, subjectIds) => request(`/weeks/${weekId}/order/${dia}`, { method: 'PUT', body: { subject_ids: subjectIds } }),

  // Concursos
  getConcursos: () => request('/concursos'),
  createConcurso: (data) => request('/concursos', { method: 'POST', body: data }),
  updateConcurso: (id, data) => request(`/concursos/${id}`, { method: 'PUT', body: data }),
  deleteConcurso: (id) => request(`/concursos/${id}`, { method: 'DELETE' }),
  getMaterias: (concursoId) => request(`/concursos/${concursoId}/materias`),
  addConcursoSubject: (concursoId, subjectId) => request(`/concursos/${concursoId}/materias`, { method: 'POST', body: { subject_id: subjectId } }),
  removeConcursoSubject: (id) => request(`/materias/${id}`, { method: 'DELETE' }),
  createConteudo: (concursoSubjectId, data) => request(`/materias/${concursoSubjectId}/conteudos`, { method: 'POST', body: data }),
  updateConteudo: (id, data) => request(`/conteudos/${id}`, { method: 'PUT', body: data }),
  deleteConteudo: (id) => request(`/conteudos/${id}`, { method: 'DELETE' }),
  toggleConteudo: (id) => request(`/conteudos/${id}/toggle`, { method: 'PATCH' }),

  // Notes
  getNotes: () => request('/notes'),
  createNote: (data) => request('/notes', { method: 'POST', body: data }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: data }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),

  // Dashboard
  getProgress: (weekId) => request(`/dashboard/progress?week_id=${weekId}`),
  getAccuracy: (weekId) => request(`/dashboard/accuracy?week_id=${weekId}`),
  getComparison: (weekIds) => request(`/dashboard/comparison?week_ids=${weekIds.join(',')}`),
  getStudiedVsPlanned: (weekId) => request(`/dashboard/studied-vs-planned?week_id=${weekId}`),
  getSummary: (weekId) => request(`/dashboard/summary?week_id=${weekId}`),
  getTotals: (weekIds) => request(`/dashboard/totals?week_ids=${weekIds.join(',')}`),
  getConsistency: (weekIds = []) => request(`/dashboard/consistency${weekIds.length ? '?week_ids=' + weekIds.join(',') : ''}`),
  getStreak: () => request('/dashboard/streak'),

  // Gamification
  getGamificationProfile: (weekId, mock = false) => {
    const params = new URLSearchParams()
    if (weekId) params.set('week_id', weekId)
    if (mock) params.set('mock', '1')
    const qs = params.toString()
    return request(`/gamification/profile${qs ? '?' + qs : ''}`)
  },
  getGamificationSubjects: () => request('/gamification/subjects'),
  getGamificationAchievements: (weekId) => {
    const qs = weekId ? `?week_id=${weekId}` : ''
    return request(`/gamification/achievements${qs}`)
  },
  setStreakProtection: (enabled) =>
    request('/gamification/streak-protection', { method: 'POST', body: { enabled } }),

  // Provas
  getProvas: () => request('/provas'),
  createProva: (data) => request('/provas', { method: 'POST', body: data }),
  updateProva: (id, data) => request(`/provas/${id}`, { method: 'PUT', body: data }),
  deleteProva: (id) => request(`/provas/${id}`, { method: 'DELETE' }),

  // Questões (nested em prova)
  getProvaQuestoes: (provaId) => request(`/provas/${provaId}/questoes`),
  createQuestao: (provaId, data) => request(`/provas/${provaId}/questoes`, { method: 'POST', body: data }),
  updateQuestao: (provaId, questaoId, data) => request(`/provas/${provaId}/questoes/${questaoId}`, { method: 'PUT', body: data }),
  deleteQuestao: (provaId, questaoId) => request(`/provas/${provaId}/questoes/${questaoId}`, { method: 'DELETE' }),
}
