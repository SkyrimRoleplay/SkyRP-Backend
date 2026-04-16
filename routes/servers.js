const router = require('express').Router()
const config = require('../config')

// Returns the list of game servers available for players to connect to.
// The launcher uses this to populate the server selector and to write the
// correct server-ip / server-port into the SkyMP client settings file.
//
// Env vars (all optional, fall back to config.js defaults):
//   SERVER_NAME  – display name shown in the launcher  (default: "Frostfall Roleplay")
router.get('/', (_req, res) => {
  res.json([
    {
      name:    process.env.SERVER_NAME || 'Frostfall Roleplay',
      address: config.skyrimServerHost,
      port:    Number(config.skyrimServerPort),
    },
  ])
})

module.exports = router
