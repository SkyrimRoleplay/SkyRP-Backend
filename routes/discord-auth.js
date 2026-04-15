const router = require('express').Router()
const https  = require('https')
const fs     = require('fs')
const config = require('../config')

const REDIRECT_URI = 'http://localhost:4000/auth/callback'

function getDiscordConfig() {
  try {
    const settings = JSON.parse(fs.readFileSync(config.serverSettingsPath, 'utf8'))
    return settings.discordAuth || null
  } catch {
    return null
  }
}

// GET /auth/discord/url — returns the Discord OAuth authorization URL
router.get('/url', (_req, res) => {
  const dc = getDiscordConfig()
  if (!dc?.clientId) {
    return res.status(503).json({ error: 'Discord auth not configured on this server' })
  }
  const params = new URLSearchParams({
    client_id:     dc.clientId,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'identify',
  })
  res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` })
})

// GET /auth/discord/exchange?code=... — exchanges code for user info (clientSecret stays here)
router.get('/exchange', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'Missing code' })

  const dc = getDiscordConfig()
  if (!dc?.clientId || !dc?.clientSecret) {
    return res.status(503).json({ error: 'Discord auth not fully configured (missing clientSecret)' })
  }

  try {
    const tokenData = await discordTokenExchange({
      client_id:     dc.clientId,
      client_secret: dc.clientSecret,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
    })

    const user = await discordGetUser(tokenData.access_token)

    res.json({
      ok: true,
      user: {
        id:          user.id,
        username:    user.global_name || user.username,
        tag:         user.discriminator !== '0' ? `${user.username}#${user.discriminator}` : user.username,
        avatar:      user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
          : null,
      },
      accessToken: tokenData.access_token,
    })
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function discordTokenExchange(params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString()
    const req  = https.request(
      {
        hostname: 'discord.com',
        path:     '/api/oauth2/token',
        method:   'POST',
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      res => {
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => {
          const json = JSON.parse(data)
          if (json.error) reject(new Error(json.error_description || json.error))
          else resolve(json)
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function discordGetUser(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: 'discord.com',
        path:     '/api/users/@me',
        headers:  { Authorization: `Bearer ${accessToken}` },
      },
      res => {
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => resolve(JSON.parse(data)))
      }
    )
    req.on('error', reject)
  })
}

module.exports = router
