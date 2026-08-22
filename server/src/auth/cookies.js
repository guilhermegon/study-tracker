export function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

export function setSessionCookie(req, res, token, maxAgeSeconds) {
  const attrs = [
    `sid=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (req.secure) attrs.push('Secure')
  res.append('Set-Cookie', attrs.join('; '))
}

export function clearSessionCookie(req, res) {
  const attrs = ['sid=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (req.secure) attrs.push('Secure')
  res.append('Set-Cookie', attrs.join('; '))
}

// Cookie CSRF (padrão double-submit): de propósito SEM HttpOnly, para o
// client conseguir ler o valor e ecoar no header X-CSRF-Token.
export function setCsrfCookie(req, res, token, maxAgeSeconds) {
  const attrs = [`csrf=${token}`, 'Path=/', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`]
  if (req.secure) attrs.push('Secure')
  res.append('Set-Cookie', attrs.join('; '))
}

export function clearCsrfCookie(req, res) {
  const attrs = ['csrf=', 'Path=/', 'SameSite=Lax', 'Max-Age=0']
  if (req.secure) attrs.push('Secure')
  res.append('Set-Cookie', attrs.join('; '))
}
