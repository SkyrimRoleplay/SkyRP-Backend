const router = require('express').Router()
const fs     = require('fs')
const path   = require('path')
const config = require('../config')

router.get('/', (_req, res) => {
  let settings = null
  try {
    settings = JSON.parse(fs.readFileSync(config.serverSettingsPath, 'utf8'))
  } catch {
    return res.status(503).json({ error: 'server-settings.json not found or unreadable' })
  }

  // Derive a short gamemode name from the gamemodePath field (if present)
  let gamemode = null
  if (settings.gamemodePath) {
    gamemode = path.basename(settings.gamemodePath, path.extname(settings.gamemodePath))
  }

  res.json({
    name:               settings.name        || 'SkyMP Server',
    maxPlayers:         settings.maxPlayers  || 100,
    port:               settings.port        || 7777,
    offlineMode:        !!settings.offlineMode,
    npcEnabled:         !!settings.npcEnabled,
    gamemode,
    discordAuthRequired: !!(settings.discordAuth && settings.discordAuth.clientId),
  })
})

module.exports = router
