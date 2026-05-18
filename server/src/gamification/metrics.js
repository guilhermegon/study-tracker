import db from '../db/connection.js'
import { XP_RULES } from './config.js'

export function localDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getStudyDatesQuery() {
  return `
    SELECT
      e.id, e.week_id, e.subject_id, e.dia, e.estudado,
      e.qtd_pags_estudadas, e.num_exercicios, e.num_acertos, e.created_at,
      date(w.date_start, '+' || CASE e.dia
        WHEN 'Dom' THEN 0 WHEN 'Seg' THEN 1 WHEN 'Ter' THEN 2
        WHEN 'Qua' THEN 3 WHEN 'Qui' THEN 4 WHEN 'Sex' THEN 5
        WHEN 'Sáb' THEN 6 END || ' days') AS study_date
    FROM entries e
    JOIN weeks w ON w.id = e.week_id
  `
}

export function collectGlobalMetrics() {
  const today = localDateString()

  const entryTotals = db.prepare(`
    SELECT
      COUNT(CASE WHEN estudado = 1 THEN 1 END)           AS sessions_studied,
      COALESCE(SUM(qtd_pags_estudadas), 0)               AS total_pages,
      COALESCE(SUM(num_exercicios), 0)                   AS total_exercises,
      COALESCE(SUM(num_acertos), 0)                      AS total_correct,
      COALESCE(SUM(num_exercicios - num_acertos), 0)     AS total_wrong_entries
    FROM entries
  `).get()

  const studyDays = db.prepare(`
    SELECT COUNT(DISTINCT study_date) AS count FROM (
      ${getStudyDatesQuery()} WHERE estudado = 1
    )
  `).get().count

  const questaoTotals = db.prepare(`
    SELECT
      COUNT(CASE WHEN branco = 0 AND acertou = 1 THEN 1 END) AS correct,
      COUNT(CASE WHEN branco = 0 AND acertou = 0 THEN 1 END) AS wrong,
      COUNT(CASE WHEN branco = 1 THEN 1 END)                 AS blank
    FROM questoes
  `).get()

  const distinctSubjectsStudied = db.prepare(`
    SELECT COUNT(DISTINCT subject_id) AS count FROM entries WHERE estudado = 1
  `).get().count

  const todayStats = db.prepare(`
    SELECT
      COALESCE(SUM(qtd_pags_estudadas), 0)                                  AS pages,
      COALESCE(SUM(num_exercicios), 0)                                       AS questions,
      COUNT(DISTINCT subject_id)                                             AS distinct_subjects,
      COUNT(DISTINCT CASE WHEN estudado = 1 THEN subject_id END)            AS subjects_studied
    FROM (${getStudyDatesQuery()})
    WHERE study_date = ?
  `).get(today)

  const questaoTotal = questaoTotals.correct + questaoTotals.wrong + questaoTotals.blank

  return {
    today,
    sessionsStudied:         entryTotals.sessions_studied,
    totalPages:              entryTotals.total_pages,
    studyDays,
    totalExercises:          entryTotals.total_exercises,
    entryCorrect:            entryTotals.total_correct,
    entryWrong:              entryTotals.total_wrong_entries,
    questaoCorrect:          questaoTotals.correct,
    questaoWrong:            questaoTotals.wrong,
    totalCorrect:            entryTotals.total_correct + questaoTotals.correct,
    totalWrong:              entryTotals.total_wrong_entries + questaoTotals.wrong,
    totalQuestions:          entryTotals.total_exercises + questaoTotal,
    todayPages:              todayStats.pages,
    todayQuestions:          todayStats.questions,
    todayDistinctSubjects:   todayStats.distinct_subjects,
    todaySubjectsStudied:    todayStats.subjects_studied,
    distinctSubjectsStudied,
  }
}

export function collectWeekMetrics(weekId) {
  if (!weekId) return null
  const week = db.prepare('SELECT * FROM weeks WHERE id = ?').get(weekId)
  if (!week) return null
  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(qtd_pags_estudadas), 0)                         AS pages,
      COALESCE(SUM(num_exercicios), 0)                              AS questions,
      COUNT(DISTINCT CASE WHEN estudado = 1 THEN dia END)          AS study_days
    FROM entries WHERE week_id = ?
  `).get(weekId)
  return { week, ...stats }
}

export function collectStreakData() {
  const rows = db.prepare(`
    SELECT study_date, MAX(estudado) AS studied FROM (${getStudyDatesQuery()})
    GROUP BY study_date ORDER BY study_date ASC
  `).all()

  const today = localDateString()
  let bestStreak = 0, running = 0
  for (const row of rows) {
    if (row.study_date > today) continue
    if (row.study_date === today && !row.studied) continue
    if (row.studied) { running++; if (running > bestStreak) bestStreak = running }
    else running = 0
  }
  let streak = 0
  for (const row of [...rows].reverse()) {
    if (row.study_date > today) continue
    if (row.study_date === today && !row.studied) continue
    if (!row.studied) break
    streak++
  }
  return { streak, bestStreak, rows }
}

export function collectPersonalRecords() {
  const pagesByDay = db.prepare(`
    SELECT study_date, SUM(qtd_pags_estudadas) AS total FROM (${getStudyDatesQuery()})
    WHERE estudado = 1 GROUP BY study_date ORDER BY total DESC LIMIT 1
  `).get()

  const questionsByDay = db.prepare(`
    SELECT study_date, SUM(num_exercicios) AS total FROM (${getStudyDatesQuery()})
    GROUP BY study_date ORDER BY total DESC LIMIT 1
  `).get()

  const weekPages = db.prepare(`
    SELECT w.id, w.name, COALESCE(SUM(e.qtd_pags_estudadas), 0) AS pages
    FROM weeks w LEFT JOIN entries e ON e.week_id = w.id
    GROUP BY w.id ORDER BY pages DESC LIMIT 1
  `).get()

  const accuracyWeeks = db.prepare(`
    SELECT w.id, w.name,
      ROUND(CAST(SUM(e.num_acertos) AS REAL) / NULLIF(SUM(e.num_exercicios), 0) * 100, 1) AS accuracy
    FROM weeks w JOIN entries e ON e.week_id = w.id
    WHERE e.num_exercicios > 0 GROUP BY w.id
    HAVING SUM(e.num_exercicios) >= 10 ORDER BY accuracy DESC LIMIT 1
  `).get()

  const dailyXpRows = db.prepare(`
    SELECT study_date,
      COALESCE(SUM(qtd_pags_estudadas), 0)              AS pages,
      COUNT(CASE WHEN estudado = 1 THEN 1 END)          AS sessions,
      COALESCE(SUM(num_exercicios), 0)                  AS questions,
      COALESCE(SUM(num_acertos), 0)                     AS correct
    FROM (${getStudyDatesQuery()}) GROUP BY study_date
  `).all()

  let maxDailyXp = { xp: 0, date: null }
  for (const row of dailyXpRows) {
    const dayXp = row.pages * XP_RULES.page + row.sessions * XP_RULES.session
      + row.correct * XP_RULES.correctQuestion
      + Math.max(0, row.questions - row.correct) * Math.abs(XP_RULES.wrongQuestion)
    if (dayXp > maxDailyXp.xp) maxDailyXp = { xp: dayXp, date: row.study_date }
  }

  const { streak, bestStreak } = collectStreakData()
  return {
    bestStreak,
    bestWeek:             weekPages ? { name: weekPages.name, pages: weekPages.pages } : null,
    maxPagesDay:          pagesByDay ? { date: pagesByDay.study_date, value: pagesByDay.total } : null,
    maxQuestionsDay:      questionsByDay ? { date: questionsByDay.study_date, value: questionsByDay.total } : null,
    bestWeeklyAccuracy:   accuracyWeeks ? { name: accuracyWeeks.name, value: accuracyWeeks.accuracy } : null,
    maxDailyXp,
    currentStreak:        streak,
  }
}
