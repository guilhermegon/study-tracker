import { useState, useRef } from 'react'

async function downloadBackup() {
  const res = await fetch('/api/backup/download')
  if (!res.ok) throw new Error('Erro ao baixar backup.')
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="(.+?)"/)
  const filename = match ? match[1] : 'study-tracker-backup.db'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function BackupPage() {
  const [restoreFile, setRestoreFile] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [restoreState, setRestoreState] = useState('idle') // 'idle' | 'loading' | 'done' | 'error'
  const [downloadState, setDownloadState] = useState('idle') // 'idle' | 'loading' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef(null)

  async function handleDownload() {
    setDownloadState('loading')
    try {
      await downloadBackup()
      setDownloadState('idle')
    } catch (err) {
      setDownloadState('error')
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.db')) {
      setErrorMsg('Selecione um arquivo .db gerado pelo Study Tracker.')
      setRestoreFile(null)
      return
    }
    setErrorMsg('')
    setRestoreFile(file)
    setRestoreState('idle')
  }

  function handleRestoreClick() {
    if (!restoreFile) return
    setShowConfirm(true)
  }

  async function confirmRestore() {
    setShowConfirm(false)
    setRestoreState('loading')
    setErrorMsg('')
    try {
      const buffer = await restoreFile.arrayBuffer()
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao restaurar.')
      setRestoreState('done')
    } catch (err) {
      setRestoreState('error')
      setErrorMsg(err.message || 'Erro desconhecido ao restaurar o backup.')
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Backup e Restauração</h1>
      <p className="text-gray-500 mb-8">Gerencie os dados do seu Study Tracker com segurança.</p>

      {/* Download */}
      <section className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💾</div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Baixar Backup</h2>
            <p className="text-sm text-gray-500 mb-4">
              Faz o download do banco de dados atual com todas as suas semanas, disciplinas,
              registros de estudo, concursos e anotações.
            </p>
            <button
              onClick={handleDownload}
              disabled={downloadState === 'loading'}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
            >
              {downloadState === 'loading' ? '⏳ Baixando...' : '⬇️ Baixar backup'}
            </button>
            {downloadState === 'error' && (
              <p className="text-sm text-red-600 mt-2">⚠️ Erro ao baixar o backup. Tente novamente.</p>
            )}
          </div>
        </div>
      </section>

      {/* Restore */}
      <section className="card">
        <div className="flex items-start gap-4">
          <div className="text-3xl">📂</div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Restaurar Backup</h2>
            <p className="text-sm text-gray-500 mb-4">
              Substitui todos os dados atuais pelos dados do arquivo de backup selecionado.
              O servidor será reiniciado automaticamente após a restauração.
            </p>

            {restoreState === 'done' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                ✅ Backup restaurado com sucesso! O servidor está reiniciando —{' '}
                <strong>recarregue a página em alguns segundos.</strong>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".db"
                    onChange={handleFileChange}
                    className="hidden"
                    id="backup-file-input"
                  />
                  <label
                    htmlFor="backup-file-input"
                    className="cursor-pointer border border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Selecionar arquivo .db
                  </label>
                  {restoreFile && (
                    <span className="text-sm text-gray-600 truncate max-w-xs">
                      📄 {restoreFile.name}
                    </span>
                  )}
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-600 mb-3">⚠️ {errorMsg}</p>
                )}

                <button
                  onClick={handleRestoreClick}
                  disabled={!restoreFile || restoreState === 'loading'}
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
                >
                  {restoreState === 'loading' ? (
                    <>⏳ Restaurando...</>
                  ) : (
                    <>🔄 Restaurar backup</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Modal de confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-4xl text-center mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
              Confirmar restauração
            </h3>
            <p className="text-sm text-gray-600 text-center mb-2">
              Todos os dados atuais serão <strong className="text-red-600">deletados permanentemente</strong> e
              substituídos pelos dados do arquivo:
            </p>
            <p className="text-sm font-medium text-gray-800 text-center bg-gray-100 rounded-lg px-3 py-2 mb-5">
              📄 {restoreFile?.name}
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              Esta ação não pode ser desfeita. Certifique-se de que o arquivo selecionado
              é um backup válido do Study Tracker.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRestore}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                Sim, restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
