const express  = require('express')
const cors     = require('cors')
const path     = require('path')

const newsRoute       = require('./routes/news')
const statusRoute     = require('./routes/status')
const manifestRoute   = require('./routes/manifest')
const versionRoute    = require('./routes/version')
const serverinfoRoute = require('./routes/serverinfo')
const metricsRoute    = require('./routes/metrics')
const discordRoute    = require('./routes/discord-auth')

const app  = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Static file serving — root/ is installed into Skyrim/ (Data/ sub-dir + SKSE base files)
app.use('/files/root', express.static(path.join(__dirname, 'public', 'files', 'root')))

app.use('/api/news',       newsRoute)
app.use('/api/status',     statusRoute)
app.use('/api/manifest',   manifestRoute)
app.use('/api/version',    versionRoute)
app.use('/api/serverinfo', serverinfoRoute)
app.use('/api/metrics',    metricsRoute)
app.use('/auth/discord',   discordRoute)

app.listen(PORT, () => {
  console.log(`Frostfall backend running on http://localhost:${PORT}`)
})
