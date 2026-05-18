import db from '../../db/connection.js'
import {
  MISSION_POOL, MISSION_COUNT_MIN, MISSION_COUNT_MAX, DAILY_MISSIONS_ALL_BONUS_XP,
  MISSION_RARITY_XP, FIXED_PLANNED_SESSIONS_MISSION, EPIC_MISSIONS,
} from './config.js'
import { buildMissionContext } from './context.js'

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

function createRng(seed) {
  let s = seed
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scaleTarget(def, ctx) {
  if (typeof def.target === 'function') return def.target(ctx)
  if (typeof def.target === 'number')   return def.target
  const { scale, min, max } = def.target
  let base = 10
  if (def.metric === 'pages')    base = ctx.avgPages14d
  else if (def.metric === 'questions' || def.metric === 'correct') base = ctx.avgQuestions14d
  return Math.min(max, Math.max(min, Math.round(base * scale)))
}

function xpForRarity(baseXp, rarity) {
  return Math.round(baseXp * (MISSION_RARITY_XP[rarity] ?? 1))
}

const TITLES = {
  // Páginas
  pages_10: t => `Estudar ${t} páginas`,
  pages_15: t => `Estudar ${t} páginas`,
  pages_25: t => `Estudar ${t} páginas`,
  pages_40: t => `Estudar ${t} páginas`,
  pages_50: t => `Estudar ${t} páginas`,
  // Questões — resolver
  questions_10: t => `Resolver ${t} questões`,
  questions_20: t => `Resolver ${t} questões`,
  questions_30: t => `Resolver ${t} questões`,
  questions_50: t => `Resolver ${t} questões`,
  // Questões — acertar
  correct_10:  t => `Acertar ${t} questões`,
  correct_20:  t => `Acertar ${t} questões`,
  accuracy_80: () => 'Fazer 80%+ de acerto no dia',
  // Disciplinas
  subjects_2: t => `Estudar ${t} disciplinas diferentes`,
  subjects_3: t => `Estudar ${t} disciplinas diferentes`,
  // Consistência
  keep_streak:          () => 'Não perder a sequência hoje',
  all_sessions_studied: () => 'Registrar estudo em todas as sessões do dia',
  planned_sessions:     () => 'Completar todas as sessões planejadas do dia',
  // Especiais
  beat_yesterday_pages:     (t, ctx) => `Superar as ${ctx.yesterdayPages} páginas de ontem`,
  beat_yesterday_questions: (t, ctx) => `Superar as ${ctx.yesterdayQuestions} questões de ontem`,
  // Meta
  complete_all_common: () => 'Completar todas as missões comuns do dia',
  // Épicas
  modo_pos_edital: () => 'Modo Pós-Edital',
  maquina_questoes: () => 'Máquina de Questões',
  trator_pdfs: () => 'Trator de PDFs',
}

function instantiateTemplate(tpl, ctx) {
  const target = tpl.type === 'compound' ? 1 : (tpl.target != null ? scaleTarget(tpl, ctx) : 1)
  const fn = TITLES[tpl.templateId]
  return {
    instanceId:  `${ctx.today}_${tpl.templateId}`,
    templateId:  tpl.templateId,
    emoji:       tpl.emoji,
    category:    tpl.category,
    metric:      tpl.metric ?? tpl.type,
    type:        tpl.type,
    rarity:      tpl.rarity,
    title:       fn ? fn(target, ctx) : (tpl.title ?? 'Missão do dia'),
    description: tpl.description ?? null,
    target,
    rewardXp:    xpForRarity(tpl.baseXp, tpl.rarity),
    fixed:       !!tpl.fixed,
    meta:        !!tpl.meta,
  }
}

function isEligible(tpl, ctx) {
  if (tpl.requires && !tpl.requires(ctx)) return false
  if (tpl.templateId === 'all_sessions_studied' && ctx.plannedSessions === 0) return false
  if (tpl.templateId === 'beat_yesterday_pages' && ctx.yesterdayPages === 0) return false
  if (tpl.templateId === 'beat_yesterday_questions' && ctx.yesterdayQuestions === 0) return false
  return true
}

function loadStoredMissions(date, weekId) {
  const row = db.prepare(
    'SELECT missions_json, week_id FROM gamification_daily_missions WHERE mission_date = ?'
  ).get(date)
  if (!row) return null
  if (weekId != null && row.week_id != null && row.week_id !== weekId) return null
  try {
    const parsed = JSON.parse(row.missions_json)
    if (parsed.some(m => m.templateId === 'neglected_subject')) return null
    return parsed
  } catch { return null }
}

function saveMissions(date, weekId, missions) {
  db.prepare(`
    INSERT INTO gamification_daily_missions (mission_date, week_id, missions_json)
    VALUES (?, ?, ?)
    ON CONFLICT(mission_date) DO UPDATE SET week_id = excluded.week_id, missions_json = excluded.missions_json
  `).run(date, weekId ?? null, JSON.stringify(missions))
}

function generateMissionSet(ctx) {
  const rng = createRng(hashString(`${ctx.today}:${ctx.weekId ?? 0}`))
  const selected      = []
  const usedTemplates = new Set()
  const usedCategories = new Set()

  // Missão fixa de sessões planejadas
  if (ctx.weekId && ctx.todayDia) {
    selected.push(instantiateTemplate({ ...FIXED_PLANNED_SESSIONS_MISSION }, ctx))
    usedTemplates.add('planned_sessions')
    usedCategories.add('consistency')
  }

  // Tenta inserir UMA missão épica por dia (primeira elegível que passar no dado)
  for (const em of EPIC_MISSIONS) {
    if (!usedTemplates.has(em.templateId) && isEligible(em, ctx) && rng() < (em.spawnRate ?? 0.06)) {
      selected.push(instantiateTemplate(em, ctx))
      usedTemplates.add(em.templateId)
      break
    }
  }

  const targetCount = MISSION_COUNT_MIN + Math.floor(rng() * (MISSION_COUNT_MAX - MISSION_COUNT_MIN + 1))
  const pool = MISSION_POOL.filter(t => !t.meta && isEligible(t, ctx))

  let attempts = 0
  while (selected.length < targetCount && attempts < 200) {
    attempts++
    const totalWeight = pool.reduce((s, t) => s + t.weight, 0)
    let roll = rng() * totalWeight
    let pick = pool[0]
    for (const t of pool) { roll -= t.weight; if (roll <= 0) { pick = t; break } }
    if (usedTemplates.has(pick.templateId)) continue
    if (selected.filter(m => m.category === pick.category).length >= 2 && rng() > 0.35) continue
    selected.push(instantiateTemplate(pick, ctx))
    usedTemplates.add(pick.templateId)
    usedCategories.add(pick.category)
  }

  // Adiciona missão meta "complete all common" se houver 3+ missões comuns/raras
  if (selected.filter(m => m.rarity === 'common' || m.rarity === 'rare').length >= 3 && !usedTemplates.has('complete_all_common')) {
    const meta = MISSION_POOL.find(t => t.templateId === 'complete_all_common')
    if (meta) selected.push(instantiateTemplate(meta, ctx))
  }

  return selected
}

function evaluateMission(mission, ctx, allMissions) {
  const metric = mission.metric
  let current = 0, target = mission.target, completed = false, progressLabel = null

  switch (metric) {
    case 'planned_sessions':
      current       = ctx.completedSessions
      target        = Math.max(ctx.plannedSessions, 1)
      completed     = ctx.plannedSessions > 0 && ctx.completedSessions >= ctx.plannedSessions
      progressLabel = ctx.plannedSessions === 0
        ? 'Nenhuma sessão planejada hoje'
        : `${ctx.completedSessions} / ${ctx.plannedSessions} sessões concluídas`
      break

    case 'pages':
      current   = ctx.todayPages
      completed = current >= target
      break

    case 'questions':
      current   = ctx.todayQuestions
      completed = current >= target
      break

    case 'correct':
      current   = ctx.todayCorrect
      completed = current >= target
      break

    case 'distinct_subjects':
      current   = ctx.todayDistinctSubjects
      completed = current >= target
      break

    case 'accuracy_day':
      current       = ctx.todayAccuracy ?? 0
      completed     = ctx.todayQuestions >= 5 && (ctx.todayAccuracy ?? 0) >= target
      progressLabel = ctx.todayQuestions < 5
        ? `Resolva 5+ questões (${ctx.todayQuestions}/5)`
        : `${ctx.todayAccuracy ?? 0}% / ${target}%`
      break

    case 'keep_streak':
      current   = ctx.keepStreak ? 1 : 0
      completed = ctx.keepStreak
      break

    case 'all_sessions_flag':
      current   = ctx.allSessionsStudied ? 1 : 0
      completed = ctx.allSessionsStudied
      break

    case 'beat_yesterday_pages':
      current       = ctx.todayPages
      completed     = ctx.todayPages > ctx.yesterdayPages
      progressLabel = `Hoje: ${ctx.todayPages} pág. | Ontem: ${ctx.yesterdayPages} pág.`
      break

    case 'beat_yesterday_questions':
      current       = ctx.todayQuestions
      completed     = ctx.todayQuestions > ctx.yesterdayQuestions
      progressLabel = `Hoje: ${ctx.todayQuestions} quest. | Ontem: ${ctx.yesterdayQuestions} quest.`
      break

    case 'complete_all_common': {
      const commons = allMissions.filter(x => !x.meta && x.templateId !== 'complete_all_common' && x.rarity !== 'epic')
      const done    = commons.filter(x => x.completed).length
      current       = done
      target        = commons.length || 1
      completed     = commons.length > 0 && done >= commons.length
      progressLabel = `${done} / ${commons.length} missões comuns`
      break
    }

    case 'compound': {
      const parts = [
        ctx.plannedSessions > 0 && ctx.completedSessions >= ctx.plannedSessions,
        ctx.todayQuestions >= 5 && (ctx.todayAccuracy ?? 0) >= 85,
      ]
      current       = parts.filter(Boolean).length
      target        = 2
      completed     = parts.every(Boolean)
      progressLabel = [
        parts[0] ? '✓ Cronograma completo' : '○ Cronograma completo',
        parts[1] ? '✓ 85%+ de acerto'      : '○ 85%+ de acerto',
      ].join(' · ')
      break
    }

    default: break
  }

  const booleanMetrics = ['keep_streak', 'all_sessions_flag']
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : (completed ? 100 : 0)

  if (!progressLabel) {
    if (booleanMetrics.includes(metric)) {
      progressLabel = completed ? 'Concluído ✓' : 'Pendente'
    } else if (!['accuracy_day', 'beat_yesterday_pages', 'beat_yesterday_questions', 'complete_all_common', 'compound', 'planned_sessions'].includes(metric)) {
      progressLabel = `${current} / ${target}`
    }
  }

  return { ...mission, current, target, completed, progress, progressLabel }
}

export function buildDailyMissions(weekId) {
  const ctx = buildMissionContext(weekId)
  let instances = loadStoredMissions(ctx.today, weekId)
  if (!instances?.length) {
    instances = generateMissionSet(ctx)
    saveMissions(ctx.today, weekId, instances)
  }

  let evaluated = instances.map(m => evaluateMission(m, ctx, []))
  evaluated = instances.map(m => evaluateMission(m, ctx, evaluated))

  const list = evaluated.sort((a, b) => {
    if (a.fixed && !b.fixed) return -1
    if (!a.fixed && b.fixed) return 1
    const order = { epic: 0, rare: 1, common: 2 }
    return (order[a.rarity] ?? 3) - (order[b.rarity] ?? 3)
  })

  const allCompleted   = list.length > 0 && list.every(m => m.completed)
  const missionBonusXp = list.filter(m => m.completed).reduce((s, m) => s + m.rewardXp, 0)

  return {
    list,
    allCompleted,
    missionBonusXp,
    allBonusXp:     allCompleted ? DAILY_MISSIONS_ALL_BONUS_XP : 0,
    totalMissionXp: missionBonusXp + (allCompleted ? DAILY_MISSIONS_ALL_BONUS_XP : 0),
    date: ctx.today,
  }
}
