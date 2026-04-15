const router = require('express').Router()
const http   = require('http')
const fs     = require('fs')
const config = require('../config')

// Read metricsAuth credentials from server-settings.json (if configured)
function metricsAuthHeader() {
  try {
    const settings = JSON.parse(fs.readFileSync(config.serverSettingsPath, 'utf8'))
    const auth = settings.metricsAuth
    if (auth && auth.user && auth.password) {
      const token = Buffer.from(`${auth.user}:${auth.password}`).toString('base64')
      return { Authorization: `Basic ${token}` }
    }
  } catch {}
  return {}
}

// Fetch raw Prometheus text from the SkyMP HTTP UI and parse into a JSON map
function fetchRaw(host, port) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: host,
        port,
        path:    '/metrics',
        timeout: 5000,
        headers: metricsAuthHeader(),
      },
      res => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        let raw = ''
        res.on('data', c => { raw += c })
        res.on('end', () => resolve(raw))
      }
    )
    req.on('error',   reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function parsePrometheus(raw) {
  const result = {}
  for (const line of raw.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue
    const m = line.match(/^(skymp_\S+)\s+([\d.e+\-]+)/)
    if (m) result[m[1]] = parseFloat(m[2])
  }
  return result
}

router.get('/', async (_req, res) => {
  const { skyrimServerHost: host, skympUiPort: port } = config
  try {
    const raw     = await fetchRaw(host, port)
    const metrics = parsePrometheus(raw)
    res.json({ ok: true, metrics })
  } catch (err) {
    res.json({ ok: false, error: err.message })
  }
})

module.exports = router
