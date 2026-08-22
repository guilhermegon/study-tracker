import db from '../db/connection.js'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Marca "houve alteração de dados" para o job de backup diário por e-mail
// decidir se há algo novo pra enviar. Ignora /api/auth/* (login/logout/troca
// de senha não são "dados de estudo" que valham um backup extra).
export default function trackActivity(req, res, next) {
  if (!MUTATING.has(req.method) || req.path.startsWith('/api/auth')) return next()

  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      db.prepare(
        `INSERT INTO app_meta (key, value) VALUES ('last_data_change_at', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      ).run(new Date().toISOString())
    }
  })

  next()
}
