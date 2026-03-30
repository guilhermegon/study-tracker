import { Router } from 'express'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../../../')

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'))
  return pkg.version
}

function semverGt(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true
    if ((pa[i] || 0) < (pb[i] || 0)) return false
  }
  return false
}

const router = Router()

// GET /api/update/check
router.get('/check', async (_req, res) => {
  try {
    const response = await fetch('https://api.github.com/repos/guilhermegon/study-tracker/tags', {
      headers: { 'User-Agent': 'study-tracker-app' }
    })
    if (!response.ok) return res.json({ available: false })
    const tags = await response.json()
    const current = getCurrentVersion()
    const latest = tags
      .map(t => t.name.replace(/^v/, ''))
      .filter(v => /^\d+\.\d+\.\d+$/.test(v))
      .sort((a, b) => semverGt(a, b) ? -1 : 1)[0]
    if (!latest) return res.json({ available: false, current })
    const available = semverGt(latest, current)
    res.json({ available, current, latest: `v${latest}` })
  } catch {
    res.json({ available: false })
  }
})

// POST /api/update/apply  body: { version: "v1.1.0" }
router.post('/apply', (req, res) => {
  const { version } = req.body
  if (!version) return res.status(400).json({ error: 'version required' })

  const isWin = process.platform === 'win32'
  const scriptName = isWin ? 'update.bat' : 'update.sh'
  const scriptPath = join(PROJECT_ROOT, scriptName)
  const downloadUrl = `https://github.com/guilhermegon/study-tracker/archive/refs/tags/${version}.zip`

  const child = isWin
    ? spawn('cmd.exe', ['/c', scriptPath], {
        detached: true,
        stdio: 'ignore',
        cwd: PROJECT_ROOT,
        env: { ...process.env, UPDATE_URL: downloadUrl, UPDATE_VERSION: version }
      })
    : spawn('/bin/bash', [scriptPath], {
        detached: true,
        stdio: 'ignore',
        cwd: PROJECT_ROOT,
        env: { ...process.env, UPDATE_URL: downloadUrl, UPDATE_VERSION: version }
      })

  child.unref()
  res.json({ ok: true, message: 'Atualização iniciada. O servidor será reiniciado.' })
  setTimeout(() => process.exit(0), 1500)
})

export default router
