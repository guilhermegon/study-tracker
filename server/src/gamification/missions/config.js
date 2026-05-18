export const MISSION_COUNT_MIN = 4
export const MISSION_COUNT_MAX = 7
export const DAILY_MISSIONS_ALL_BONUS_XP = 120

export const MISSION_RARITY_XP = {
  common: 1,
  rare:   1.6,
  epic:   2.8,
}

export const FIXED_PLANNED_SESSIONS_MISSION = {
  templateId: 'planned_sessions',
  emoji: '📅',
  category: 'consistency',
  metric: 'planned_sessions',
  type: 'planned_sessions',
  rarity: 'rare',
  baseXp: 85,
  fixed: true,
  target: 1,
}

export const MISSION_POOL = [
  // ── Páginas ────────────────────────────────────────────────────────────────
  { templateId: 'pages_10', emoji: '📄', category: 'pages', metric: 'pages', rarity: 'common', baseXp: 40, weight: 10, target: { scale: 0.65, min: 8,  max: 15 } },
  { templateId: 'pages_15', emoji: '📄', category: 'pages', metric: 'pages', rarity: 'common', baseXp: 50, weight: 12, target: { scale: 1,    min: 10, max: 25 } },
  { templateId: 'pages_25', emoji: '📄', category: 'pages', metric: 'pages', rarity: 'rare',   baseXp: 70, weight: 7,  target: { scale: 1.4,  min: 15, max: 40 } },
  { templateId: 'pages_40', emoji: '📄', category: 'pages', metric: 'pages', rarity: 'rare',   baseXp: 95, weight: 4,  target: { scale: 2,    min: 25, max: 55 }, requires: c => c.avgPages14d >= 12 },
  { templateId: 'pages_50', emoji: '📄', category: 'pages', metric: 'pages', rarity: 'rare',   baseXp: 120, weight: 3, target: { scale: 2.5,  min: 35, max: 65 }, requires: c => c.avgPages14d >= 20 },

  // ── Questões — resolver ────────────────────────────────────────────────────
  { templateId: 'questions_10', emoji: '🎯', category: 'questions', metric: 'questions', rarity: 'common', baseXp: 45, weight: 10, target: { scale: 0.7, min: 8,  max: 15 } },
  { templateId: 'questions_20', emoji: '🎯', category: 'questions', metric: 'questions', rarity: 'common', baseXp: 55, weight: 11, target: { scale: 1,   min: 12, max: 30 } },
  { templateId: 'questions_30', emoji: '🎯', category: 'questions', metric: 'questions', rarity: 'rare',   baseXp: 75, weight: 6,  target: { scale: 1.5, min: 20, max: 45 }, requires: c => c.avgQuestions14d >= 10 },
  { templateId: 'questions_50', emoji: '🎯', category: 'questions', metric: 'questions', rarity: 'rare',   baseXp: 100, weight: 4, target: { scale: 2,   min: 30, max: 60 }, requires: c => c.avgQuestions14d >= 20 },

  // ── Questões — acertar ─────────────────────────────────────────────────────
  { templateId: 'correct_10',   emoji: '🎯', category: 'questions', metric: 'correct',      rarity: 'common', baseXp: 55, weight: 9,  target: { scale: 0.7, min: 8,  max: 18 } },
  { templateId: 'correct_20',   emoji: '🎯', category: 'questions', metric: 'correct',      rarity: 'rare',   baseXp: 80, weight: 6,  target: { scale: 1.2, min: 12, max: 30 }, requires: c => c.avgQuestions14d >= 10 },
  { templateId: 'accuracy_80',  emoji: '🎯', category: 'questions', metric: 'accuracy_day', rarity: 'rare',   baseXp: 85, weight: 5,  target: 80, requires: c => c.avgQuestions14d >= 5 },

  // ── Disciplinas ────────────────────────────────────────────────────────────
  { templateId: 'subjects_2', emoji: '📚', category: 'subjects', metric: 'distinct_subjects', rarity: 'common', baseXp: 50, weight: 9, target: 2 },
  { templateId: 'subjects_3', emoji: '📚', category: 'subjects', metric: 'distinct_subjects', rarity: 'rare',   baseXp: 70, weight: 5, target: 3, requires: c => c.avgSubjects14d >= 1.5 },

  // ── Consistência ───────────────────────────────────────────────────────────
  { templateId: 'keep_streak',       emoji: '🔥', category: 'consistency', metric: 'keep_streak',     rarity: 'common', baseXp: 40, weight: 8, target: 1, requires: c => c.streak > 0 },
  { templateId: 'all_sessions_studied', emoji: '🔥', category: 'consistency', metric: 'all_sessions_flag', rarity: 'common', baseXp: 55, weight: 7, target: 1, requires: c => c.plannedSessions > 0 },

  // ── Especiais / comparação ─────────────────────────────────────────────────
  { templateId: 'beat_yesterday_pages',     emoji: '📈', category: 'special', metric: 'beat_yesterday_pages',     rarity: 'rare', baseXp: 80, weight: 4, target: c => Math.max(1, c.yesterdayPages),     requires: c => c.yesterdayPages > 0 },
  { templateId: 'beat_yesterday_questions', emoji: '📈', category: 'special', metric: 'beat_yesterday_questions', rarity: 'rare', baseXp: 80, weight: 4, target: c => Math.max(1, c.yesterdayQuestions), requires: c => c.yesterdayQuestions > 0 },

  // ── Meta ───────────────────────────────────────────────────────────────────
  { templateId: 'complete_all_common', emoji: '⚔️', category: 'challenge', metric: 'complete_all_common', rarity: 'rare', baseXp: 120, weight: 0, target: 1, meta: true },
]

/** Missões épicas — cada uma tem sua própria chance de aparecer por dia */
export const EPIC_MISSIONS = [
  {
    templateId: 'modo_pos_edital',
    emoji: '👑',
    category: 'challenge',
    type: 'compound',
    rarity: 'epic',
    baseXp: 500,
    title: 'Modo Pós-Edital',
    description: 'Cronograma completo + 85%+ de acerto no dia',
    spawnRate: 0.06,
    requires: c => c.plannedSessions > 0 && c.avgQuestions14d >= 5,
  },
  {
    templateId: 'maquina_questoes',
    emoji: '⚔️',
    category: 'challenge',
    metric: 'questions',
    rarity: 'epic',
    baseXp: 700,
    title: 'Máquina de Questões',
    description: 'Resolver 100 questões no dia',
    target: 100,
    spawnRate: 0.05,
    requires: c => c.avgQuestions14d >= 20,
  },
  {
    templateId: 'trator_pdfs',
    emoji: '📚',
    category: 'challenge',
    metric: 'pages',
    rarity: 'epic',
    baseXp: 600,
    title: 'Trator de PDFs',
    description: 'Estudar 60 páginas no dia',
    target: 60,
    spawnRate: 0.05,
    requires: c => c.avgPages14d >= 20,
  },
]
