import db from '../db/connection.js'
import { parseCookies } from '../auth/cookies.js'

export default function requireAuth(req, res, next) {
  const { sid } = parseCookies(req.headers.cookie)
  if (!sid) return res.status(401).json({ error: 'Não autenticado' })

  const session = db.prepare(
    `SELECT s.user_id, u.username, u.must_change_password
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).get(sid)

  if (!session) return res.status(401).json({ error: 'Não autenticado' })

  req.user = { id: session.user_id, username: session.username, must_change_password: !!session.must_change_password }
  next()
}
