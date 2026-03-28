import { useState, useEffect } from 'react'
import { api } from '../../api/client'

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const EMPTY = {
  subject_id: '',
  dia: 'Seg',
  estudado: true,
  total_aulas: '',
  aula_estudada: '',
  num_pags_inicio: '',
  num_pags_fim: '',
  qtd_pags_estudadas: '',
  num_exercicios: '',
  num_acertos: '',
  percentual_acerto: '',
  dificuldade: '',
}

export default function EntryForm({ weekId, entry = null, defaultDia = 'Seg', onSaved, onCancel, weekSubjects = [] }) {
  const isEdit = !!entry
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isEdit && entry) {
      setForm({
        subject_id: String(entry.subject_id),
        dia: entry.dia,
        estudado: entry.estudado,
        total_aulas: entry.total_aulas ?? '',
        aula_estudada: entry.aula_estudada || '',
        num_pags_inicio: entry.num_pags_inicio ?? '',
        num_pags_fim: entry.num_pags_fim ?? '',
        qtd_pags_estudadas: entry.qtd_pags_estudadas ?? '',
        num_exercicios: entry.num_exercicios ?? '',
        num_acertos: entry.num_acertos ?? '',
        percentual_acerto: entry.percentual_acerto ?? '',
        dificuldade: entry.dificuldade || '',
      })
    } else {
      setForm(f => ({ ...EMPTY, dia: defaultDia }))
    }
  }, [entry?.id, defaultDia, isEdit])

  function set(key, value) {
    setForm(f => {
      const next = { ...f, [key]: value }
      // Auto-calc qtd_pags
      if ((key === 'num_pags_inicio' || key === 'num_pags_fim')) {
        const ini = Number(key === 'num_pags_inicio' ? value : f.num_pags_inicio)
        const fim = Number(key === 'num_pags_fim' ? value : f.num_pags_fim)
        if (ini > 0 && fim >= ini) next.qtd_pags_estudadas = fim - ini + 1
      }
      // Auto-calc % acerto
      if (key === 'num_exercicios' || key === 'num_acertos') {
        const ex = Number(key === 'num_exercicios' ? value : f.num_exercicios)
        const ac = Number(key === 'num_acertos' ? value : f.num_acertos)
        if (ex > 0 && ac >= 0) next.percentual_acerto = Math.round((ac / ex) * 1000) / 10
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.subject_id) return setError('Selecione uma disciplina')
    setSaving(true)
    try {
      const payload = {
        ...form,
        subject_id: Number(form.subject_id),
        num_pags_inicio: form.num_pags_inicio !== '' ? Number(form.num_pags_inicio) : null,
        num_pags_fim: form.num_pags_fim !== '' ? Number(form.num_pags_fim) : null,
        qtd_pags_estudadas: form.qtd_pags_estudadas !== '' ? Number(form.qtd_pags_estudadas) : null,
        total_aulas: form.total_aulas !== '' ? Number(form.total_aulas) : null,
        num_exercicios: form.num_exercicios !== '' ? Number(form.num_exercicios) : 0,
        num_acertos: form.num_acertos !== '' ? Number(form.num_acertos) : 0,
        percentual_acerto: form.percentual_acerto !== '' ? Number(form.percentual_acerto) : null,
      }
      let saved
      if (isEdit) {
        saved = await api.updateEntry(entry.id, payload)
      } else {
        saved = await api.createEntry(weekId, payload)
      }
      onSaved(saved)
      if (!isEdit) setForm(f => ({ ...EMPTY, dia: f.dia }))
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Disciplina *</label>
          <select className="input" value={form.subject_id}
            onChange={e => set('subject_id', e.target.value)} required>
            <option value="">Selecione...</option>
            {weekSubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Dia *</label>
          <select className="input" value={form.dia} onChange={e => set('dia', e.target.value)}>
            {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.estudado}
            onChange={e => set('estudado', e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600" />
          <span className="text-sm font-medium text-gray-700">Estudei esta disciplina hoje</span>
        </label>
      </div>

      <div>
        <label className="label">Total de aulas</label>
        <input type="number" min="0" className="input" value={form.total_aulas}
          onChange={e => set('total_aulas', e.target.value)}
          placeholder="ex: 20" />
      </div>

      <div>
        <label className="label">Aula / conteúdo estudado</label>
        <input className="input" value={form.aula_estudada}
          onChange={e => set('aula_estudada', e.target.value)}
          placeholder="ex: 02-Deveres e responsabilidades do servidor..." />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Pág. início</label>
          <input type="number" min="0" className="input" value={form.num_pags_inicio}
            onChange={e => set('num_pags_inicio', e.target.value)} placeholder="54" />
        </div>
        <div>
          <label className="label">Pág. fim</label>
          <input type="number" min="0" className="input" value={form.num_pags_fim}
            onChange={e => set('num_pags_fim', e.target.value)} placeholder="67" />
        </div>
        <div>
          <label className="label">Qtd. páginas</label>
          <input type="number" min="0" className="input bg-gray-50" value={form.qtd_pags_estudadas}
            onChange={e => set('qtd_pags_estudadas', e.target.value)} placeholder="auto" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Exercícios feitos</label>
          <input type="number" min="0" className="input" value={form.num_exercicios}
            onChange={e => set('num_exercicios', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Acertos</label>
          <input type="number" min="0" className="input" value={form.num_acertos}
            onChange={e => set('num_acertos', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">% Acerto</label>
          <input type="number" min="0" max="100" step="0.1" className="input bg-gray-50"
            value={form.percentual_acerto}
            onChange={e => set('percentual_acerto', e.target.value)} placeholder="auto" />
        </div>
      </div>

      <div>
        <label className="label">Dificuldade / observações</label>
        <textarea className="input resize-none" rows={3} value={form.dificuldade}
          onChange={e => set('dificuldade', e.target.value)}
          placeholder="Como foi estudar? Alguma dificuldade?" />
      </div>

      <div className="flex justify-end gap-3 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        )}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : '+ Adicionar registro'}
        </button>
      </div>
    </form>
  )
}
