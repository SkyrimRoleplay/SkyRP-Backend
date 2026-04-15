/**
 * Backend server configuration — developer-set.
 * Override any value with environment variables before deploying.
 */
const path = require('path')

const SKYMP_PORT = parseInt(process.env.SKYMP_PORT || '7777', 10)

module.exports = {
  skyrimServerHost: process.env.SKYMP_HOST || '127.0.0.1',
  skyrimServerPort: SKYMP_PORT,

  // SkyMP HTTP UI port: always 3000 when game port is 7777, else port+1
  // (matches skymp5-server internals)
  skympUiPort: SKYMP_PORT === 7777 ? 3000 : SKYMP_PORT + 1,

  // Path to the SkyMP server-settings.json
  // Override with SKYMP_SETTINGS env var in production
  serverSettingsPath: process.env.SKYMP_SETTINGS
    || path.join(__dirname, '..', '..', 'skymp', 'build', 'dist', 'server', 'server-settings.json'),
}
