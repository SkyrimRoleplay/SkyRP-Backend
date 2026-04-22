'use strict'

/**
 * SkyMP Master API compatibility routes.
 *
 * The SkyMP game client (authService.ts) expects three specific endpoints
 * on the master server.  These routes implement that contract and bridge
 * it to the existing Frostfall session / auth infrastructure.
 *
 * Mounted in server.js as:
 *   app.use('/api/users', skympCompatRoute)
 *
 * Endpoints:
 *
 *   GET /api/users/login-discord?state=<hex>
 *     The client generates its own state token and opens this URL in the
 *     system browser.  We redirect straight to Discord OAuth, preserving
 *     the state so the /auth/callback handler can complete the flow and
 *     store the result in completedAuth (discord-auth.js).
 *
 *   GET /api/users/login-discord/status?state=<hex>
 *     The client polls this while waiting for the browser OAuth to finish.
 *     Returns HTTP 401 while pending, HTTP 200 with SkyMP-format payload
 *     once complete:
 *       { token, masterApiId, discordUsername, discordDiscriminator, discordAvatar }
 *     The token returned here IS the play-session token — the two-step
 *     design means /me/play simply validates and echoes it back.
 *
 *   POST /api/users/me/play/:serverKey
 *     Headers: { authorization: <token> }
 *     Body:    {} (ignored)
 *     Validates the token is a live session and returns { session: token }.
 *     Returns 403 if the server key doesn't match, 401 if the token is
 *     unknown or expired.
 */

const router = require('express').Router()
const config = require('../config')

// ── GET /api/users/login-discord ──────────────────────────────────────────────
//
// Browser redirect — the client opens this URL so the user can authorise
// via Discord.  The client-supplied `state` is forwarded as the OAuth state
// so the /auth/callback can match the response to the right poll slot.

router.get('/login-discord', (req, res) => {
  const { state } = req.query
  if (!state) return res.status(400).send('Missing state parameter.')

  if (!config.discordClientId) {
    return res.status(503).send('Discord OAuth is not configured on this server.')
  }

  const params = new URLSearchParams({
    client_id:     config.discordClientId,
    redirect_uri:  config.discordRedirectUri,
    response_type: 'code',
    scope:         'identify',
    state,
  })

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`)
})

// ── GET /api/users/login-discord/status ──────────────────────────────────────
//
// Polling endpoint — the client calls this until it gets a 200.
// Reads from the same completedAuth map that the /auth/callback populates
// (see discord-auth.js → handleInGameCallback).
// Returns the SkyMP MasterApiAuthStatus shape so the client can proceed
// to /me/play.

router.get('/login-discord/status', (req, res) => {
  const { state } = req.query
  if (!state) return res.status(400).json({ error: 'Missing state.' })

  // completedAuth is exported from the discord-auth route module
  const { completedAuth } = require('./discord-auth')

  // Prune expired entries
  const now = Date.now()
  for (const [k, v] of completedAuth)
    if (v.expiresAt < now) completedAuth.delete(k)

  const entry = completedAuth.get(state)
  if (!entry) return res.status(401).json({ error: 'Auth not completed yet.' })

  // Consume the entry — the session itself lives on in master-api's sessions map
  completedAuth.delete(state)

  // Return the SkyMP MasterApiAuthStatus shape.
  // `token` is the play-session token; masterApiId is the stable numeric profileId.
  res.json({
    token:               entry.session,
    masterApiId:         entry.profileId,
    discordUsername:     entry.username   || null,
    discordDiscriminator: null,           // not stored by this backend; nullable in SkyMP
    discordAvatar:       entry.avatar     || null,
  })
})

// ── POST /api/users/me/play/:serverKey ────────────────────────────────────────
//
// The client sends `authorization: <token>` (from the status response above)
// and expects { session } back.  Since our token IS the play session, we just
// validate it's still alive and echo it.

router.post('/me/play/:serverKey', (req, res) => {
  const token = req.headers['authorization']
  if (!token) return res.status(401).json({ error: 'Missing authorization header.' })

  if (req.params.serverKey !== config.serverMasterKey) {
    return res.status(403).json({ error: 'Invalid server key.' })
  }

  const { lookupSession } = require('./master-api')
  const session = lookupSession(token)
  if (!session) return res.status(401).json({ error: 'Invalid or expired session token.' })

  res.json({ session: token })
})

module.exports = router
