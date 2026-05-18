import { Router } from 'express'
import db from '../db/connection.js'
import {
  computeGamificationProfile,
  computeSubjectGamification,
  getMockGamificationProfile,
} from '../gamification/compute.js'
import { ACHIEVEMENTS } from '../gamification/config.js'

const router = Router()

router.get('/profile', (req, res) => {
  if (req.query.mock === '1') return res.json(getMockGamificationProfile())
  const weekId = req.query.week_id ? Number(req.query.week_id) : null
  res.json(computeGamificationProfile(weekId))
})

router.get('/subjects', (_req, res) => {
  res.json(computeSubjectGamification())
})

router.get('/achievements', (req, res) => {
  const profile = req.query.mock === '1'
    ? getMockGamificationProfile()
    : computeGamificationProfile(req.query.week_id ? Number(req.query.week_id) : null)
  res.json({ achievements: profile.achievements.all, definitions: ACHIEVEMENTS })
})

router.post('/streak-protection', (req, res) => {
  const { enabled } = req.body
  db.prepare(`
    INSERT INTO gamification_settings (key, value) VALUES ('streak_protection', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(enabled ? 'true' : 'false')
  res.json({ protection: !!enabled })
})

export default router
