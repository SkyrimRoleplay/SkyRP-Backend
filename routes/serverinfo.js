const router      = require('express').Router()
const config      = require('../config')
const { lookupSession } = require('./master-api')

router.get('/', (req, res) => {
  const token = req.headers['x-session']

  let sessionValid = false
  let allowed      = true   // true when no session provided (offline / launcher handles it)

  if (token) {
    const entry = lookupSession(token)
    if (!entry) {
      sessionValid = false
      allowed      = false
    } else {
      sessionValid = true
      allowed      = config.serverLocked
        ? config.serverLockedAllowList.includes(entry.discordId)
        : true
    }
  }

  res.json({
    name:                config.serverName,
    maxPlayers:          config.serverMaxPlayers,
    port:                config.skyrimServerPort,
    offlineMode:         config.serverOfflineMode,
    npcEnabled:          config.serverNpcEnabled,
    gamemode:            config.serverGamemode,
    discordAuthRequired: !!config.discordClientId,
    masterKey:           config.serverMasterKey  || null,
    masterUrl:           config.masterUrl         || null,
    locked:              config.serverLocked,
    lockedAllowList:     config.serverLockedAllowList,
    // Session-aware fields — only meaningful when X-Session header is present
    sessionValid,
    allowed,
  })
})

module.exports = router
