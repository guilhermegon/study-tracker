/** Regras centralizadas de gamificação */

export const XP_RULES = {
  page: 1,
  session: 10,
  studyDay: 20,
  correctQuestion: 2,
  wrongQuestion: -1,
}

export { DAILY_MISSIONS_ALL_BONUS_XP as DAILY_MISSIONS_BONUS } from './missions/config.js'

export const LEVEL_TITLES = [
  'Iniciante',
  'Sobrevivente de PDF',
  'Matadora de Questões',
  'Candidata Perigosa',
  'Máquina de Aprovação',
  'Nomeável no DOU',
]

export const LEVEL_XP_THRESHOLDS = [0, 200, 550, 1100, 2000, 3500, 5500]

export const STREAK_MILESTONES = [
  { days: 3,   xp: 50 },
  { days: 7,   xp: 150 },
  { days: 14,  xp: 200 },
  { days: 30,  xp: 500 },
  { days: 60,  xp: 800 },
  { days: 100, xp: 1500 },
]

export const STREAK_PHRASES = [
  'Consistência vence motivação.',
  'A banca não descansa.',
  'Seu nome está chegando no DOU.',
  'Mais forte que o edital.',
  'Uma questão por vez.',
  'Você já estudou em dias piores.',
  'Cada página é um passo à frente.',
]

export const WEEKLY_BOSS = {
  id: 'defeat_edital',
  title: 'Derrote o Edital',
  emoji: '⚔️',
  goals: [
    { id: 'pages',     label: 'Páginas na semana',  target: 200, metric: 'weekPages' },
    { id: 'questions', label: 'Questões na semana',  target: 100, metric: 'weekQuestions' },
    { id: 'days',      label: 'Dias estudados',      target: 5,   metric: 'weekStudyDays' },
  ],
  rewardXp: 300,
  rewardBadge: { name: 'Medalha do Edital', rarity: 'epic', emoji: '🏅' },
}

export const RARITY_STYLES = {
  common:    { label: 'Comum',    className: 'bg-gray-100 text-gray-600 border-gray-200' },
  rare:      { label: 'Rara',     className: 'bg-blue-50 text-blue-700 border-blue-200' },
  epic:      { label: 'Épica',    className: 'bg-purple-50 text-purple-700 border-purple-200' },
  legendary: { label: 'Lendária', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  mythic:    { label: 'Mítica',   className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

// ── Helpers internos para definições de conquistas ─────────────────────────────
function accuracyCheck(pct, minAnswered) {
  return (m) => {
    const answered = m.totalCorrect + m.totalWrong
    return answered >= minAnswered && (m.totalCorrect / answered) * 100 >= pct
  }
}

// progress: mostrar acurácia atual vs meta (ou progresso até mínimo de questões)
function accuracyProgress(pct, minAnswered) {
  return (m) => {
    const answered = m.totalCorrect + m.totalWrong
    if (answered < minAnswered) return { current: answered, target: minAnswered }
    const current = Math.round((m.totalCorrect / answered) * 100)
    return { current: Math.min(current, pct), target: pct }
  }
}

export const ACHIEVEMENTS = [
  // ── SEQUÊNCIA ────────────────────────────────────────────────────────────────
  {
    id: 'streak_1',   category: 'streak', emoji: '🌱', rarity: 'common',
    name: 'Primeiro Passo',
    description: 'Registrar estudo pela primeira vez',
    check:    (m, s)    => s.bestStreak >= 1 || m.studyDays >= 1,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak || m.studyDays, 1), target: 1 }),
  },
  {
    id: 'streak_3',   category: 'streak', emoji: '🔥', rarity: 'common',
    name: 'Pegando Ritmo',
    description: '3 dias seguidos de estudo',
    check:    (m, s)    => s.bestStreak >= 3,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak, 3), target: 3 }),
  },
  {
    id: 'streak_7',   category: 'streak', emoji: '📚', rarity: 'rare',
    name: 'Rotina Criada',
    description: '7 dias seguidos de estudo',
    check:    (m, s)    => s.bestStreak >= 7,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak, 7), target: 7 }),
  },
  {
    id: 'streak_15',  category: 'streak', emoji: '🧠', rarity: 'rare',
    name: 'Candidata Perigosa',
    description: '15 dias seguidos de estudo',
    check:    (m, s)    => s.bestStreak >= 15,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak, 15), target: 15 }),
  },
  {
    id: 'streak_30',  category: 'streak', emoji: '⚔️', rarity: 'epic',
    name: 'Máquina de Aprovação',
    description: '30 dias seguidos de estudo',
    check:    (m, s)    => s.bestStreak >= 30,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak, 30), target: 30 }),
  },
  {
    id: 'streak_100', category: 'streak', emoji: '👑', rarity: 'legendary',
    name: 'Nomeável no DOU',
    description: '100 dias seguidos de estudo',
    check:    (m, s)    => s.bestStreak >= 100,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak, 100), target: 100 }),
  },
  {
    id: 'streak_365', category: 'streak', emoji: '💀', rarity: 'mythic',
    name: 'Imparável',
    description: '365 dias seguidos de estudo',
    check:    (m, s)    => s.bestStreak >= 365,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak, 365), target: 365 }),
  },
  {
    id: 'streak_730', category: 'streak', emoji: '🏛️', rarity: 'mythic',
    name: 'Funcionária Pública Honorária',
    description: '730 dias seguidos de estudo',
    check:    (m, s)    => s.bestStreak >= 730,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak, 730), target: 730 }),
  },
  {
    id: 'streak_1500', category: 'streak', emoji: '☠️', rarity: 'mythic',
    name: 'Patrimônio do Serviço Público',
    description: '1500 dias seguidos de estudo',
    check:    (m, s)    => s.bestStreak >= 1500,
    progress: (m, s)    => ({ current: Math.min(s.bestStreak, 1500), target: 1500 }),
  },

  // ── VOLUME (PÁGINAS) ─────────────────────────────────────────────────────────
  {
    id: 'pages_10',   category: 'volume', emoji: '📄', rarity: 'common',
    name: 'Primeiras Páginas',
    description: 'Estudar 10 páginas no total',
    check:    (m) => m.totalPages >= 10,
    progress: (m) => ({ current: m.totalPages, target: 10 }),
  },
  {
    id: 'pages_50',   category: 'volume', emoji: '📘', rarity: 'common',
    name: 'Começou o PDF',
    description: 'Estudar 50 páginas no total',
    check:    (m) => m.totalPages >= 50,
    progress: (m) => ({ current: m.totalPages, target: 50 }),
  },
  {
    id: 'pages_200',  category: 'volume', emoji: '📚', rarity: 'rare',
    name: 'Devoradora de PDFs',
    description: 'Estudar 200 páginas no total',
    check:    (m) => m.totalPages >= 200,
    progress: (m) => ({ current: m.totalPages, target: 200 }),
  },
  {
    id: 'pages_500',  category: 'volume', emoji: '🚜', rarity: 'rare',
    name: 'Trator do Estratégia',
    description: 'Estudar 500 páginas no total',
    check:    (m) => m.totalPages >= 500,
    progress: (m) => ({ current: m.totalPages, target: 500 }),
  },
  {
    id: 'pages_1000', category: 'volume', emoji: '💀', rarity: 'epic',
    name: 'PDF Não Mete Medo',
    description: 'Estudar 1000 páginas no total',
    check:    (m) => m.totalPages >= 1000,
    progress: (m) => ({ current: m.totalPages, target: 1000 }),
  },
  {
    id: 'pages_2500', category: 'volume', emoji: '⚔️', rarity: 'epic',
    name: 'Destruidora de Apostilas',
    description: 'Estudar 2500 páginas no total',
    check:    (m) => m.totalPages >= 2500,
    progress: (m) => ({ current: m.totalPages, target: 2500 }),
  },
  {
    id: 'pages_5000', category: 'volume', emoji: '🏛️', rarity: 'legendary',
    name: 'Biblioteca Nacional',
    description: 'Estudar 5000 páginas no total',
    check:    (m) => m.totalPages >= 5000,
    progress: (m) => ({ current: m.totalPages, target: 5000 }),
  },
  {
    id: 'pages_10000', category: 'volume', emoji: '👑', rarity: 'legendary',
    name: 'Arquivista do Estratégia',
    description: 'Estudar 10000 páginas no total',
    check:    (m) => m.totalPages >= 10000,
    progress: (m) => ({ current: m.totalPages, target: 10000 }),
  },
  {
    id: 'pages_25000', category: 'volume', emoji: '☠️', rarity: 'mythic',
    name: 'Entidade Acadêmica',
    description: 'Estudar 25000 páginas no total',
    check:    (m) => m.totalPages >= 25000,
    progress: (m) => ({ current: m.totalPages, target: 25000 }),
  },

  // ── QUESTÕES (TOTAL) ─────────────────────────────────────────────────────────
  {
    id: 'questions_10',   category: 'questions', emoji: '🎯', rarity: 'common',
    name: 'Primeiras Questões',
    description: 'Resolver 10 questões no total',
    check:    (m) => m.totalQuestions >= 10,
    progress: (m) => ({ current: m.totalQuestions, target: 10 }),
  },
  {
    id: 'questions_50',   category: 'questions', emoji: '🎯', rarity: 'common',
    name: 'Resolvendo Bem',
    description: 'Resolver 50 questões no total',
    check:    (m) => m.totalQuestions >= 50,
    progress: (m) => ({ current: m.totalQuestions, target: 50 }),
  },
  {
    id: 'questions_200',  category: 'questions', emoji: '🎯', rarity: 'rare',
    name: 'Caçadora de Questões',
    description: 'Resolver 200 questões no total',
    check:    (m) => m.totalQuestions >= 200,
    progress: (m) => ({ current: m.totalQuestions, target: 200 }),
  },
  {
    id: 'questions_500',  category: 'questions', emoji: '🎯', rarity: 'rare',
    name: 'Maratona de Questões',
    description: 'Resolver 500 questões no total',
    check:    (m) => m.totalQuestions >= 500,
    progress: (m) => ({ current: m.totalQuestions, target: 500 }),
  },
  {
    id: 'questions_1000', category: 'questions', emoji: '⚔️', rarity: 'epic',
    name: 'Questões Sem Fim',
    description: 'Resolver 1000 questões no total',
    check:    (m) => m.totalQuestions >= 1000,
    progress: (m) => ({ current: m.totalQuestions, target: 1000 }),
  },
  {
    id: 'questions_2500', category: 'questions', emoji: '👑', rarity: 'legendary',
    name: 'Fábrica de Gabaritos',
    description: 'Resolver 2500 questões no total',
    check:    (m) => m.totalQuestions >= 2500,
    progress: (m) => ({ current: m.totalQuestions, target: 2500 }),
  },
  {
    id: 'questions_5000', category: 'questions', emoji: '☠️', rarity: 'mythic',
    name: 'Bancas Temem Seu Nome',
    description: 'Resolver 5000 questões no total',
    check:    (m) => m.totalQuestions >= 5000,
    progress: (m) => ({ current: m.totalQuestions, target: 5000 }),
  },

  // ── QUESTÕES (ACERTOS) ───────────────────────────────────────────────────────
  {
    id: 'correct_10',   category: 'questions', emoji: '✅', rarity: 'common',
    name: 'Mira Certa',
    description: 'Acertar 10 questões',
    check:    (m) => m.totalCorrect >= 10,
    progress: (m) => ({ current: m.totalCorrect, target: 10 }),
  },
  {
    id: 'correct_50',   category: 'questions', emoji: '🔫', rarity: 'common',
    name: 'Sniper de Gabarito',
    description: 'Acertar 50 questões',
    check:    (m) => m.totalCorrect >= 50,
    progress: (m) => ({ current: m.totalCorrect, target: 50 }),
  },
  {
    id: 'correct_200',  category: 'questions', emoji: '🎖️', rarity: 'rare',
    name: 'Atiradora de Elite',
    description: 'Acertar 200 questões',
    check:    (m) => m.totalCorrect >= 200,
    progress: (m) => ({ current: m.totalCorrect, target: 200 }),
  },
  {
    id: 'correct_500',  category: 'questions', emoji: '⚔️', rarity: 'epic',
    name: 'Gabaritando',
    description: 'Acertar 500 questões',
    check:    (m) => m.totalCorrect >= 500,
    progress: (m) => ({ current: m.totalCorrect, target: 500 }),
  },
  {
    id: 'correct_1000', category: 'questions', emoji: '👑', rarity: 'legendary',
    name: 'Acurácia Lendária',
    description: 'Acertar 1000 questões',
    check:    (m) => m.totalCorrect >= 1000,
    progress: (m) => ({ current: m.totalCorrect, target: 1000 }),
  },
  {
    id: 'correct_2500', category: 'questions', emoji: '☠️', rarity: 'mythic',
    name: 'Aniquiladora de Distratores',
    description: 'Acertar 2500 questões',
    check:    (m) => m.totalCorrect >= 2500,
    progress: (m) => ({ current: m.totalCorrect, target: 2500 }),
  },

  // ── DESEMPENHO ───────────────────────────────────────────────────────────────
  {
    id: 'positive_balance', category: 'performance', emoji: '💀', rarity: 'common',
    name: 'Saldo Positivo',
    description: 'Ter mais acertos do que erros no total',
    check:    (m) => m.totalCorrect > 0 && m.totalCorrect > m.totalWrong,
    progress: (m) => ({ current: m.totalCorrect, target: Math.max(m.totalCorrect, m.totalWrong + 1) }),
  },
  {
    id: 'revenge_banca', category: 'performance', emoji: '🔥', rarity: 'rare',
    name: 'Vingança Contra a Banca',
    description: 'Acertar uma questão que já errou antes',
    check:    (m, s, pre) => pre.revengeExists,
    progress: null,
  },
  {
    id: 'accuracy_80', category: 'performance', emoji: '🧠', rarity: 'rare',
    name: 'Estudou de Verdade',
    description: 'Atingir 80% de acerto com no mínimo 20 questões respondidas',
    check:    accuracyCheck(80, 20),
    progress: accuracyProgress(80, 20),
  },
  {
    id: 'accuracy_90', category: 'performance', emoji: '👑', rarity: 'epic',
    name: 'Elite dos Concursos',
    description: 'Atingir 90% de acerto com no mínimo 30 questões respondidas',
    check:    accuracyCheck(90, 30),
    progress: accuracyProgress(90, 30),
  },
  {
    id: 'accuracy_95', category: 'performance', emoji: '💎', rarity: 'legendary',
    name: 'Quase Perfeita',
    description: 'Atingir 95% de acerto com no mínimo 50 questões respondidas',
    check:    accuracyCheck(95, 50),
    progress: accuracyProgress(95, 50),
  },
  {
    id: 'accuracy_100', category: 'performance', emoji: '✨', rarity: 'legendary',
    name: 'Gabarito Puro',
    description: '100% de acerto com no mínimo 10 questões respondidas',
    check:    (m) => m.totalWrong === 0 && m.totalCorrect >= 10,
    progress: (m) => ({ current: m.totalCorrect, target: 10 }),
  },
  {
    id: 'consistency_good', category: 'performance', emoji: '🔥', rarity: 'rare',
    name: 'Constância Vence',
    description: 'Manter 65%+ de acerto com 10+ dias de estudo e 30+ questões respondidas',
    check: (m) => {
      const answered = m.totalCorrect + m.totalWrong
      return m.studyDays >= 10 && answered >= 30 && m.totalCorrect / answered >= 0.65
    },
    progress: (m) => ({ current: m.studyDays, target: 10 }),
  },

  // ── DISCIPLINAS ──────────────────────────────────────────────────────────────
  {
    id: 'subjects_3', category: 'subjects', emoji: '📚', rarity: 'common',
    name: 'Multidisciplinar',
    description: 'Estudar 3 disciplinas diferentes',
    check:    (m) => m.distinctSubjectsStudied >= 3,
    progress: (m) => ({ current: m.distinctSubjectsStudied, target: 3 }),
  },
  {
    id: 'subjects_5', category: 'subjects', emoji: '📚', rarity: 'rare',
    name: 'Mente Ampla',
    description: 'Estudar 5 disciplinas diferentes',
    check:    (m) => m.distinctSubjectsStudied >= 5,
    progress: (m) => ({ current: m.distinctSubjectsStudied, target: 5 }),
  },
  {
    id: 'subjects_10', category: 'subjects', emoji: '🏛️', rarity: 'epic',
    name: 'Generalista de Elite',
    description: 'Estudar 10 disciplinas diferentes',
    check:    (m) => m.distinctSubjectsStudied >= 10,
    progress: (m) => ({ current: m.distinctSubjectsStudied, target: 10 }),
  },
  {
    id: 'all_subjects', category: 'subjects', emoji: '👑', rarity: 'rare',
    name: 'Dominando o Edital',
    description: 'Estudar todas as disciplinas cadastradas na semana',
    check:    (m, s, pre) => pre.allSubjectsStudied,
    progress: null,
  },
  {
    id: 'subject_expert', category: 'subjects', emoji: '🏛️', rarity: 'epic',
    name: 'Especialista',
    description: 'Acumular bastante XP em uma única disciplina',
    check:    (m, s, pre) => pre.hasExpertSubject,
    progress: null,
  },
  {
    id: 'no_abandoned', category: 'subjects', emoji: '🔥', rarity: 'rare',
    name: 'Resgate de Disciplina',
    description: 'Retornar a uma disciplina parada há 14+ dias',
    check:    (m, s, pre) => pre.hasReturnedToNeglected,
    progress: null,
  },

  // ── CRONOGRAMA & SESSÕES ─────────────────────────────────────────────────────
  {
    id: 'study_days_7', category: 'schedule', emoji: '📅', rarity: 'common',
    name: 'Uma Semana Inteira',
    description: 'Acumular 7 dias de estudo registrado',
    check:    (m) => m.studyDays >= 7,
    progress: (m) => ({ current: m.studyDays, target: 7 }),
  },
  {
    id: 'study_days_30', category: 'schedule', emoji: '📅', rarity: 'common',
    name: 'Mês de Dedicação',
    description: 'Acumular 30 dias de estudo registrado',
    check:    (m) => m.studyDays >= 30,
    progress: (m) => ({ current: m.studyDays, target: 30 }),
  },
  {
    id: 'study_days_100', category: 'schedule', emoji: '🧠', rarity: 'rare',
    name: 'Cem Dias de Foco',
    description: 'Acumular 100 dias de estudo registrado',
    check:    (m) => m.studyDays >= 100,
    progress: (m) => ({ current: m.studyDays, target: 100 }),
  },
  {
    id: 'study_days_365', category: 'schedule', emoji: '⚔️', rarity: 'epic',
    name: 'Um Ano de Jornada',
    description: 'Acumular 365 dias de estudo registrado',
    check:    (m) => m.studyDays >= 365,
    progress: (m) => ({ current: m.studyDays, target: 365 }),
  },
  {
    id: 'study_days_730', category: 'schedule', emoji: '👑', rarity: 'legendary',
    name: 'Dois Anos de Luta',
    description: 'Acumular 730 dias de estudo registrado',
    check:    (m) => m.studyDays >= 730,
    progress: (m) => ({ current: m.studyDays, target: 730 }),
  },
  {
    id: 'study_days_1500', category: 'schedule', emoji: '☠️', rarity: 'mythic',
    name: 'Vida de Concurseira',
    description: 'Acumular 1500 dias de estudo registrado',
    check:    (m) => m.studyDays >= 1500,
    progress: (m) => ({ current: m.studyDays, target: 1500 }),
  },
  {
    id: 'sessions_5', category: 'schedule', emoji: '📋', rarity: 'common',
    name: 'Iniciando a Rotina',
    description: 'Concluir 5 sessões de estudo',
    check:    (m) => m.sessionsStudied >= 5,
    progress: (m) => ({ current: m.sessionsStudied, target: 5 }),
  },
  {
    id: 'sessions_50', category: 'schedule', emoji: '📋', rarity: 'rare',
    name: 'Dedicação Constante',
    description: 'Concluir 50 sessões de estudo',
    check:    (m) => m.sessionsStudied >= 50,
    progress: (m) => ({ current: m.sessionsStudied, target: 50 }),
  },
  {
    id: 'sessions_200', category: 'schedule', emoji: '📋', rarity: 'epic',
    name: 'Incansável',
    description: 'Concluir 200 sessões de estudo',
    check:    (m) => m.sessionsStudied >= 200,
    progress: (m) => ({ current: m.sessionsStudied, target: 200 }),
  },
  {
    id: 'sessions_500', category: 'schedule', emoji: '👑', rarity: 'legendary',
    name: 'Sessões Sem Fim',
    description: 'Concluir 500 sessões de estudo',
    check:    (m) => m.sessionsStudied >= 500,
    progress: (m) => ({ current: m.sessionsStudied, target: 500 }),
  },
  {
    id: 'schedule_week', category: 'schedule', emoji: '⚔️', rarity: 'rare',
    name: 'Semana Perfeita',
    description: 'Estudar 5 ou mais dias em uma mesma semana',
    check:    (m, s, pre) => pre.bestWeekStudyDays >= 5,
    progress: (m, s, pre) => ({ current: Math.min(pre.bestWeekStudyDays, 5), target: 5 }),
  },

  // ── CONQUISTAS ESPECIAIS ─────────────────────────────────────────────────────
  {
    id: 'composite_perfect_week', category: 'special', emoji: '🏅', rarity: 'epic',
    name: 'Semana Épica',
    description: 'Melhor semana com 5+ dias de estudo e 100+ páginas',
    check:    (m, s, pre) => pre.bestWeekStudyDays >= 5 && pre.bestWeekPages >= 100,
    progress: (m, s, pre) => ({ current: pre.bestWeekPages, target: 100 }),
  },
  {
    id: 'composite_week_monster', category: 'special', emoji: '💥', rarity: 'legendary',
    name: 'Semana Monstra',
    description: 'Melhor semana com 250+ páginas e 100+ questões',
    check:    (m, s, pre) => pre.bestWeekPages >= 250 && pre.bestWeekQuestions >= 100,
    progress: (m, s, pre) => ({ current: pre.bestWeekPages, target: 250 }),
  },

  // ── CONQUISTAS OCULTAS ───────────────────────────────────────────────────────
  {
    id: 'secret_resilience', category: 'secret', emoji: '🥊', rarity: 'common', secret: true,
    name: 'Força Bruta',
    description: 'Algumas quedas fazem parte do caminho',
    check:    (m) => m.totalWrong >= 200,
    progress: (m) => ({ current: m.totalWrong, target: 200 }),
  },
  {
    id: 'secret_comeback', category: 'secret', emoji: '🔄', rarity: 'rare', secret: true,
    name: 'Retorno Triunfal',
    description: 'Voltou mais forte depois de uma pausa longa',
    check:    (m, s, pre) => pre.hasComeback,
    progress: null,
  },
  {
    id: 'secret_sunday', category: 'secret', emoji: '☕', rarity: 'common', secret: true,
    name: 'Domingo de Concurseira',
    description: 'Estudar num domingo? Isso é dedicação',
    check:    (m, s, pre) => pre.hasStudiedSunday,
    progress: null,
  },
  {
    id: 'secret_marathon', category: 'secret', emoji: '🚀', rarity: 'epic', secret: true,
    name: 'Semana das Semanas',
    description: 'Uma semana com volume absurdo de páginas',
    check:    (m, s, pre) => pre.bestWeekPages >= 250,
    progress: (m, s, pre) => ({ current: pre.bestWeekPages, target: 250 }),
  },
  {
    id: 'secret_long_streak', category: 'secret', emoji: '🌙', rarity: 'rare', secret: true,
    name: 'Meio Século',
    description: 'Uma sequência de 50 dias — um número especial',
    check:    (m, s) => s.bestStreak >= 50,
    progress: (m, s) => ({ current: Math.min(s.bestStreak, 50), target: 50 }),
  },
  {
    id: 'secret_big_day', category: 'secret', emoji: '⚡', rarity: 'rare', secret: true,
    name: 'Dia de Questões',
    description: 'Resolver 50 ou mais questões em um único dia',
    check:    (m, s, pre) => pre.bestDailyQuestions >= 50,
    progress: (m, s, pre) => ({ current: Math.min(pre.bestDailyQuestions, 50), target: 50 }),
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getLevelTitle(level) {
  if (level <= LEVEL_TITLES.length) return LEVEL_TITLES[level - 1]
  return LEVEL_TITLES[LEVEL_TITLES.length - 1]
}

export function getLevelFromXp(totalXp) {
  let level = 1
  for (let i = LEVEL_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_XP_THRESHOLDS[i]) { level = i + 1; break }
  }
  const currentThreshold = LEVEL_XP_THRESHOLDS[level - 1] ?? 0
  const nextThreshold    = LEVEL_XP_THRESHOLDS[level] ?? currentThreshold + 2000
  const xpInLevel = totalXp - currentThreshold
  const xpNeeded  = nextThreshold - currentThreshold
  const progress  = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100
  return {
    level,
    title: getLevelTitle(level),
    totalXp,
    xpInLevel,
    xpToNextLevel: Math.max(0, nextThreshold - totalXp),
    nextLevelXp: nextThreshold,
    progress,
  }
}

export function getStreakPhrase(streak) {
  const idx = streak > 0 ? streak % STREAK_PHRASES.length : Math.floor(Math.random() * STREAK_PHRASES.length)
  return STREAK_PHRASES[idx]
}

export function getNextStreakReward(streak) {
  return STREAK_MILESTONES.find(m => m.days > streak) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1]
}

export function getStreakRewardProgress(streak) {
  const next = getNextStreakReward(streak)
  const prev = [...STREAK_MILESTONES].reverse().find(m => m.days <= streak)
  const prevDays = prev?.days ?? 0
  const range    = next.days - prevDays
  const current  = streak - prevDays
  return {
    next,
    progress: range > 0 ? Math.min(100, Math.round((current / range) * 100)) : 100,
  }
}
