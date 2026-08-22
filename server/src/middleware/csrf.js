import { parseCookies } from '../auth/cookies.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Double-submit cookie: o cookie "csrf" (legível por JS) precisa bater com
// o header X-CSRF-Token enviado pelo client. Um site externo não consegue
// ler o cookie (same-origin policy), logo não consegue montar o header.
export default function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next()
  if (req.path === '/api/auth/login') return next() // ainda não existe sessão/cookie

  const { csrf } = parseCookies(req.headers.cookie)
  const header = req.headers['x-csrf-token']
  if (!csrf || !header || csrf !== header) {
    return res.status(403).json({ error: 'Token CSRF inválido ou ausente' })
  }
  next()
}
