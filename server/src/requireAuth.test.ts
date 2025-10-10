import express from 'express'
import request from 'supertest'
import { requireAuth } from './requireAuth.js'
import { describe, it, expect } from 'vitest'

describe('requireAuth middleware', () => {
  it('returns 401 when no session user', async () => {
    const app = express()
    app.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/protected')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('message')
  })

  it('allows when session user exists', async () => {
    const app = express()
    app.use((req, _res, next) => {
      req.session = req.session || {}
      req.session.user = { email: 'a@b.com', loggedInAt: new Date().toISOString() }
      next()
    })
    app.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/protected')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
