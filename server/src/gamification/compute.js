import db from '../db/connection.js'
import {
  XP_RULES, ACHIEVEMENTS, DAILY_MISSIONS_BONUS, WEEKLY_BOSS,
  getLevelFromXp, getStreakPhrase, getStreakRewardProgress, getNextStreakReward,
} from './config.js'
import {
  collectGlobalMetrics, collectWeekMetrics, collectStreakData, collectPersonalRecords,
  getStudyDatesQuery,
} from './metrics.js'
import { buildDailyMissions } from './missions/generator.js'

function computeBaseXp(m) {
  return (
    m.totalPages   * XP_RULES.page +
    m.sessionsStudied * XP_RULES.session +
    m.studyDays    * XP_RULES.studyDay +
    m.totalCorrect * XP_RULES.correctQuestion +
    m.totalWrong   * XP_RULES.wrongQuestion
  )
}

function buildWeeklyBoss(weekId) {
  const wm = collectWeekMetrics(weekId)
  if (!wm) {
    return { ...WEEKLY_BOSS, goals: WEEKLY_BOSS.goals.map(g => ({ ...g, current: 0, progress: 0, completed: false })), overallProgress: 0, completed: false }
  }
  const values = { weekPages: wm.pages, weekQuestions: wm.questions, weekStudyDays: wm.study_days }
  const goals = WEEKLY_BOSS.goals.map(g => {
    const current  = values[g.metric] ?? 0
    const progress = g.target > 0 ? Math.min(100, Math.round((current / g.target) * 100)) : 0
    return { ...g, current, progress, completed: current >= g.target }
  })
  const overallProgress = Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
  const completed       = goals.every(g => g.completed)
  return { ...WEEKLY_BOSS, goals, overallProgress, completed, rewardXp: completed ? WEEKLY_BOSS.rewardXp : 0 }
}

/** Pré-computa verificações custosas uma única vez */
function buildPrecomputed(m, streakData) {
  const bestWeekStudyDays = db.prepare(`
    SELECT COALESCE(MAX(days), 0) AS max FROM (
      SELECT COUNT(DISTINCT dia) AS days FROM entries WHERE estudado = 1 GROUP BY week_id
    )
  `).get().max

  const bestWeekPages = db.prepare(`
    SELECT COALESCE(MAX(pages), 0) AS max FROM (
      SELECT COALESCE(SUM(qtd_pags_estudadas), 0) AS pages FROM entries GROUP BY week_id
    )
  `).get().max

  const bestWeekQuestions = db.prepare(`
    SELECT COALESCE(MAX(q), 0) AS max FROM (
      SELECT COALESCE(SUM(num_exercicios), 0) AS q FROM entries GROUP BY week_id
    )
  `).get().max

  const hasExpertSubject = db.prepare(`
    SELECT COUNT(*) AS count FROM (
      SELECT subject_id,
        COALESCE(SUM(qtd_pags_estudadas), 0) +
        COUNT(CASE WHEN estudado = 1 THEN 1 END) * 10 AS approx_xp
      FROM entries
      GROUP BY subject_id
      HAVING approx_xp >= 550
    )
  `).get().count > 0

  const hasReturnedToNeglected = db.prepare(`
    SELECT COUNT(*) AS count FROM subjects s
    WHERE (
      SELECT COUNT(*) FROM entries e WHERE e.subject_id = s.id AND e.estudado = 1
        AND date(e.created_at) < date('now', '-14 days')
    ) > 0
    AND (
      SELECT COUNT(*) FROM entries e WHERE e.subject_id = s.id AND e.estudado = 1
        AND date(e.created_at) >= date('now', '-7 days')
    ) > 0
  `).get().count > 0

  const totalActiveSubjects = db.prepare(
    'SELECT COUNT(DISTINCT subject_id) AS count FROM week_subjects'
  ).get().count
  const allSubjectsStudied = totalActiveSubjects > 0 && m.distinctSubjectsStudied >= totalActiveSubjects

  const revengeExists = db.prepare(`
    SELECT COUNT(*) AS count FROM questoes q1
    WHERE q1.acertou = 1 AND q1.nome != ''
    AND EXISTS (
      SELECT 1 FROM questoes q2
      WHERE q2.nome = q1.nome AND q2.acertou = 0 AND q2.id != q1.id
    )
  `).get().count > 0

  const hasStudiedSunday = db.prepare(`
    SELECT COUNT(*) AS count FROM (
      SELECT study_date FROM (${getStudyDatesQuery()})
      WHERE estudado = 1 AND strftime('%w', study_date) = '0'
    )
  `).get().count > 0

  const bestDailyQuestions = db.prepare(`
    SELECT COALESCE(MAX(q), 0) AS max FROM (
      SELECT SUM(num_exercicios) AS q FROM (${getStudyDatesQuery()})
      GROUP BY study_date
    )
  `).get().max

  // hasComeback: resumed studying after a 7+ day gap
  let hasComeback = false
  const studiedRows = streakData.rows.filter(r => r.studied)
  for (let i = 1; i < studiedRows.length; i++) {
    const prev = new Date(studiedRows[i - 1].study_date)
    const curr = new Date(studiedRows[i].study_date)
    if ((curr - prev) / 86400000 >= 7) { hasComeback = true; break }
  }

  return {
    bestWeekStudyDays, bestWeekPages, bestWeekQuestions,
    hasExpertSubject, hasReturnedToNeglected, allSubjectsStudied, revengeExists,
    hasStudiedSunday, hasComeback, bestDailyQuestions,
  }
}

function evaluateAchievement(def, m, streak, unlocks, pre) {
  let unlocked = false
  try { unlocked = !!def.check(m, streak, pre) } catch { unlocked = false }

  let progress = null
  if (!unlocked && typeof def.progress === 'function') {
    try { progress = def.progress(m, streak, pre) } catch { progress = null }
  }

  return {
    unlocked,
    unlockedAt: unlocked ? (unlocks[def.id] ?? new Date().toISOString()) : null,
    progress,
  }
}

function syncUnlocks(achievements) {
  for (const a of achievements.filter(x => x.unlocked && !x.wasStored)) {
    db.prepare('INSERT OR IGNORE INTO gamification_unlocks (achievement_id, unlocked_at) VALUES (?, ?)')
      .run(a.id, a.unlockedAt)
  }
  return achievements.filter(a => a.unlocked && !a.wasStored).map(a => a.id)
}

function loadUnlocks() {
  const map = {}
  for (const r of db.prepare('SELECT achievement_id, unlocked_at FROM gamification_unlocks').all()) {
    map[r.achievement_id] = r.unlocked_at
  }
  return map
}

export function computeGamificationProfile(weekId) {
  const m           = collectGlobalMetrics()
  const streakData  = collectStreakData()
  const unlocks     = loadUnlocks()
  const settings    = Object.fromEntries(
    db.prepare('SELECT key, value FROM gamification_settings').all().map(r => [r.key, r.value])
  )

  const pre          = buildPrecomputed(m, streakData)
  const missionsData = buildDailyMissions(weekId)
  const boss         = buildWeeklyBoss(weekId)
  const bonusXp      = missionsData.totalMissionXp + (boss.completed ? boss.rewardXp : 0)
  const totalXp      = Math.max(0, computeBaseXp(m) + bonusXp)
  const level        = getLevelFromXp(totalXp)

  const achievements = ACHIEVEMENTS.map(def => {
    const { check: _c, progress: _p, ...defData } = def
    const result   = evaluateAchievement(def, m, streakData, unlocks, pre)
    const wasStored = !!unlocks[def.id]
    const unlocked  = result.unlocked || wasStored
    return {
      ...defData,
      unlocked,
      unlockedAt: wasStored ? unlocks[def.id] : (result.unlocked ? result.unlockedAt : null),
      wasStored,
      progress: unlocked ? null : result.progress,
      secret: def.secret ?? false,
    }
  })

  const newUnlockIds      = syncUnlocks(achievements)
  const recentAchievements = achievements
    .filter(a => a.unlocked && a.unlockedAt)
    .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
    .slice(0, 8)

  return {
    level,
    xp: { base: computeBaseXp(m), bonus: bonusXp, total: totalXp, rules: XP_RULES },
    streak: {
      current:        streakData.streak,
      best:           streakData.bestStreak,
      phrase:         getStreakPhrase(streakData.streak),
      nextReward:     { ...getNextStreakReward(streakData.streak), label: `Próxima recompensa: +${getNextStreakReward(streakData.streak).xp} XP` },
      rewardProgress: getStreakRewardProgress(streakData.streak).progress,
      protection:     settings.streak_protection === 'true',
      protectionActive: settings.streak_protection === 'true' && streakData.streak > 0,
    },
    missions:     { list: missionsData.list, allCompleted: missionsData.allCompleted, allBonusXp: missionsData.allBonusXp, date: missionsData.date },
    achievements: { all: achievements, recent: recentAchievements },
    boss,
    records:      collectPersonalRecords(),
    newUnlockIds,
  }
}

export function computeSubjectGamification() {
  return db.prepare('SELECT id, name, color FROM subjects ORDER BY name').all().map(s => {
    const stats = db.prepare(`
      SELECT COUNT(CASE WHEN estudado = 1 THEN 1 END) AS sessions,
        COALESCE(SUM(qtd_pags_estudadas), 0) AS pages,
        COALESCE(SUM(num_exercicios), 0)      AS exercises,
        COALESCE(SUM(num_acertos), 0)         AS correct
      FROM entries WHERE subject_id = ?
    `).get(s.id)
    const subjectXp = stats.pages * XP_RULES.page + stats.sessions * XP_RULES.session
      + stats.correct * XP_RULES.correctQuestion
      + Math.max(0, stats.exercises - stats.correct) * Math.abs(XP_RULES.wrongQuestion)
    const level = getLevelFromXp(subjectXp)
    return {
      id: s.id, name: s.name, color: s.color, xp: subjectXp,
      level: level.level, levelTitle: level.title, progress: level.progress,
      xpToNextLevel: level.xpToNextLevel, pages: stats.pages, questions: stats.exercises,
      accuracy: stats.exercises > 0 ? Math.round((stats.correct / stats.exercises) * 1000) / 10 : null,
    }
  })
}

export function getMockGamificationProfile() {
  const level = getLevelFromXp(1250)
  return {
    level,
    xp: { base: 1100, bonus: 150, total: 1250, rules: XP_RULES },
    streak: {
      current: 5, best: 12,
      phrase: 'Consistência vence motivação.',
      nextReward: { days: 7, xp: 150, label: 'Próxima recompensa: +150 XP' },
      rewardProgress: 71, protection: true, protectionActive: true,
    },
    missions: {
      list: [
        { instanceId: 'm1', templateId: 'planned_sessions', emoji: '📅', title: 'Completar todas as sessões planejadas do dia', rarity: 'rare',   rewardXp: 85,  current: 2, target: 3, completed: false, progress: 67,  progressLabel: '2 / 3 sessões concluídas', fixed: true },
        { instanceId: 'm2', templateId: 'pages_15',         emoji: '📄', title: 'Estudar 15 páginas',                           rarity: 'common', rewardXp: 50,  current: 12, target: 15, completed: false, progress: 80, progressLabel: '12 / 15' },
        { instanceId: 'm3', templateId: 'questions_20',     emoji: '🎯', title: 'Resolver 20 questões',                         rarity: 'common', rewardXp: 55,  current: 20, target: 20, completed: true,  progress: 100, progressLabel: '20 / 20' },
        { instanceId: 'm4', templateId: 'subjects_2',       emoji: '📚', title: 'Estudar 2 disciplinas diferentes',             rarity: 'common', rewardXp: 50,  current: 1,  target: 2,  completed: false, progress: 50, progressLabel: '1 / 2' },
      ],
      allCompleted: false, allBonusXp: 0, date: new Date().toISOString().split('T')[0],
    },
    achievements: {
      all: ACHIEVEMENTS.map((def, i) => {
        const { check: _c, progress: _p, ...defData } = def
        return { ...defData, unlocked: i < 6, unlockedAt: i < 6 ? new Date().toISOString() : null, wasStored: i < 6, progress: i < 6 ? null : null, secret: def.secret ?? false }
      }),
      recent: [],
    },
    boss:    { ...WEEKLY_BOSS, goals: WEEKLY_BOSS.goals.map(g => ({ ...g, current: 0, progress: 0, completed: false })), overallProgress: 0, completed: false, rewardXp: 0 },
    records: { bestStreak: 12, bestWeek: null, maxPagesDay: null, maxQuestionsDay: null, bestWeeklyAccuracy: null, maxDailyXp: { xp: 0, date: null }, currentStreak: 5 },
    newUnlockIds: [],
  }
}
