// Ordem arco-íris: vermelho → laranja → amarelo → verde → ciano → azul → índigo → violeta → rosa → neutros
export const SUBJECT_PALETTE = [
  { hex: '#ef4444', rowBg: '#fef2f2', badge: 'bg-red-100 text-red-800'           }, // vermelho
  { hex: '#f43f5e', rowBg: '#fff1f2', badge: 'bg-rose-100 text-rose-800'         }, // rosa-avermelhado
  { hex: '#f97316', rowBg: '#fff7ed', badge: 'bg-orange-100 text-orange-800'     }, // laranja
  { hex: '#f59e0b', rowBg: '#fffbeb', badge: 'bg-amber-100 text-amber-800'       }, // âmbar
  { hex: '#eab308', rowBg: '#fefce8', badge: 'bg-yellow-100 text-yellow-800'     }, // amarelo
  { hex: '#84cc16', rowBg: '#f7fee7', badge: 'bg-lime-100 text-lime-800'         }, // lima
  { hex: '#22c55e', rowBg: '#f0fdf4', badge: 'bg-green-100 text-green-800'       }, // verde
  { hex: '#10b981', rowBg: '#ecfdf5', badge: 'bg-emerald-100 text-emerald-800'   }, // esmeralda
  { hex: '#14b8a6', rowBg: '#f0fdfa', badge: 'bg-teal-100 text-teal-800'         }, // teal
  { hex: '#06b6d4', rowBg: '#ecfeff', badge: 'bg-cyan-100 text-cyan-800'         }, // ciano
  { hex: '#0891b2', rowBg: '#ecfeff', badge: 'bg-cyan-200 text-cyan-900'         }, // ciano escuro
  { hex: '#0ea5e9', rowBg: '#f0f9ff', badge: 'bg-sky-100 text-sky-800'           }, // céu
  { hex: '#3b82f6', rowBg: '#eff6ff', badge: 'bg-blue-100 text-blue-800'         }, // azul
  { hex: '#6366f1', rowBg: '#eef2ff', badge: 'bg-indigo-100 text-indigo-800'     }, // índigo
  { hex: '#8b5cf6', rowBg: '#f5f3ff', badge: 'bg-violet-100 text-violet-800'     }, // violeta
  { hex: '#a855f7', rowBg: '#faf5ff', badge: 'bg-purple-100 text-purple-800'     }, // roxo
  { hex: '#d946ef', rowBg: '#fdf4ff', badge: 'bg-fuchsia-100 text-fuchsia-800'   }, // fúcsia
  { hex: '#ec4899', rowBg: '#fdf2f8', badge: 'bg-pink-100 text-pink-800'         }, // rosa
  { hex: '#64748b', rowBg: '#f8fafc', badge: 'bg-slate-100 text-slate-800'       }, // cinza-azulado
  { hex: '#78716c', rowBg: '#fafaf9', badge: 'bg-stone-100 text-stone-800'       }, // pedra
]

/**
 * Retorna a entrada de paleta para uma disciplina.
 * Se `savedColor` (hex) estiver definido, usa a cor salva; caso contrário, atribui automaticamente pela ID.
 */
export function getSubjectColor(subjectId, savedColor) {
  if (savedColor) {
    return (
      SUBJECT_PALETTE.find(p => p.hex === savedColor) ??
      SUBJECT_PALETTE[(Number(subjectId) - 1) % SUBJECT_PALETTE.length]
    )
  }
  return SUBJECT_PALETTE[(Number(subjectId) - 1) % SUBJECT_PALETTE.length] ?? SUBJECT_PALETTE[0]
}
