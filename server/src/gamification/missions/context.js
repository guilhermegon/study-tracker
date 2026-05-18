import db from '../../db/connection.js'
import { getStudyDatesQuery, collectStreakData, localDateString } from '../metrics.js'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function getTodayDiaForWeek(week) {
  if (!week?.date_start) return null
  const today = localDateString()
  const start = new Date(week.date_start + 'T12:00:00')
  const end   = new Date((week.date_end || week.date_start) + 'T12:00:00')
  const cur   = new Date(today + 'T12:00:00')
  if (cur < start || cur > end) return null
  const diff = Math.round((cur - start) / 86400000)
  if (diff < 0 || diff > 6) return null
  return WEEKDAYS[diff]
}

function avg(nums) {
  const valid = nums.filter(n => n > 0)
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
}

export function buildMissionContext(weekId) {
  const today     = localDateString()
  const d = new Date(); d.setDate(d.getDate() - 1)
  const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const { streak } = collectStreakData()

  const todayEntry = db.prepare(`
    SELECT
      COALESCE(SUM(qtd_pags_estudadas), 0)                                AS pages,
      COALESCE(SUM(num_exercicios), 0)                                     AS questions,
      COALESCE(SUM(num_acertos), 0)                                        AS correct,
      COUNT(DISTINCT CASE WHEN estudado = 1 THEN subject_id END)          AS distinct_subjects,
      COUNT(CASE WHEN estudado = 1 THEN 1 END)                            AS studied_entries
    FROM (${getStudyDatesQuery()}) WHERE study_date = ?
  `).get(today)

  const yesterdayEntry = db.prepare(`
    SELECT
      COALESCE(SUM(qtd_pags_estudadas), 0) AS pages,
      COALESCE(SUM(num_exercicios), 0)      AS questions,
      COALESCE(SUM(num_acertos), 0)         AS correct
    FROM (${getStudyDatesQuery()}) WHERE study_date = ?
  `).get(yesterday)

  const dailyHistory = db.prepare(`
    SELECT study_date,
      COALESCE(SUM(qtd_pags_estudadas), 0)             AS pages,
      COALESCE(SUM(num_exercicios), 0)                  AS questions,
      COUNT(DISTINCT subject_id)                        AS subjects
    FROM (${getStudyDatesQuery()})
    WHERE study_date < ? AND study_date >= date(?, '-14 days')
    GROUP BY study_date
  `).all(today, today)

  let week = null, todayDia = null, plannedSessions = 0, completedSessions = 0
  if (weekId) {
    week    = db.prepare('SELECT * FROM weeks WHERE id = ?').get(weekId)
    todayDia = getTodayDiaForWeek(week)
    if (todayDia) {
      const sess = db.prepare(`
        SELECT COUNT(*) AS planned, COUNT(CASE WHEN estudado = 1 THEN 1 END) AS completed
        FROM entries WHERE week_id = ? AND dia = ?
      `).get(weekId, todayDia)
      plannedSessions  = sess?.planned   ?? 0
      completedSessions = sess?.completed ?? 0
    }
  }

  const neglectedRow = db.prepare(`
    SELECT s.id, s.name FROM subjects s
    WHERE NOT EXISTS (
      SELECT 1 FROM (${getStudyDatesQuery()}) e
      WHERE e.subject_id = s.id AND e.estudado = 1 AND e.study_date >= date('now', '-7 days')
    )
    AND EXISTS (SELECT 1 FROM week_subjects ws WHERE ws.subject_id = s.id)
    ORDER BY s.name LIMIT 1
  `).get()

  const studiedNeglectedToday = neglectedRow && todayDia && weekId
    ? db.prepare(`SELECT COUNT(*) AS c FROM entries WHERE week_id = ? AND dia = ? AND subject_id = ? AND estudado = 1`)
        .get(weekId, todayDia, neglectedRow.id)?.c > 0
    : false

  const todayQuestions = todayEntry?.questions ?? 0
  const todayCorrect   = todayEntry?.correct   ?? 0
  const studiedToday   = (todayEntry?.studied_entries ?? 0) > 0

  const yPages     = yesterdayEntry?.pages     ?? 0
  const yQuestions = yesterdayEntry?.questions ?? 0
  const yCorrect   = yesterdayEntry?.correct   ?? 0

  return {
    today, weekId, todayDia, streak,
    todayPages:            todayEntry?.pages ?? 0,
    todayQuestions,
    todayCorrect,
    todayDistinctSubjects: todayEntry?.distinct_subjects ?? 0,
    todayAccuracy:         todayQuestions >= 5 ? Math.round((todayCorrect / todayQuestions) * 1000) / 10 : null,
    plannedSessions,
    completedSessions,
    allSessionsStudied:    plannedSessions > 0 && completedSessions >= plannedSessions,
    avgPages14d:           avg(dailyHistory.map(r => r.pages))    || 10,
    avgQuestions14d:       avg(dailyHistory.map(r => r.questions)) || 10,
    avgSubjects14d:        avg(dailyHistory.map(r => r.subjects))  || 1,
    neglectedSubject:      neglectedRow,
    studiedNeglectedToday,
    yesterdayPages:        yPages,
    yesterdayQuestions:    yQuestions,
    yesterdayAccuracy:     yQuestions >= 5 ? Math.round((yCorrect / yQuestions) * 1000) / 10 : null,
    studiedToday,
    keepStreak:            streak === 0 || studiedToday,
  }
}
