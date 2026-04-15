/**
 * Copies client files from the skymp build output (and optional SKSE source)
 * into the backend's file bucket:
 *
 *   public/files/root/   → installed into {skyrimPath}/ root
 *     Data/              → sub-directory for all Data/ files
 *
 * Run from the backend/ directory:  npm run populate
 */

const fs   = require('fs')
const path = require('path')

// ── Source paths ──────────────────────────────────────────────────────────────

// skymp build output Data/ directory
const SKYMP_DATA = 'E:\\Github\\skymp\\build\\dist\\client\\Data'

// SKSE base files directory (skse_loader.exe, skse*.dll, etc.)
// Point this at your SKSE installation/download folder.
// Leave empty ('') to skip — you can place the files manually in
// backend/public/files/root/ instead.
const SKSE_SRC = ''

// ── Destination ───────────────────────────────────────────────────────────────

const ROOT_DEST = path.join(__dirname, '..', 'public', 'files', 'root')
const DATA_DEST = path.join(ROOT_DEST, 'Data')

fs.mkdirSync(DATA_DEST, { recursive: true })

let copied  = 0
let missing = 0

// ── Helper ────────────────────────────────────────────────────────────────────

function copyEntry(srcAbs, destAbs, label) {
  const stat = fs.statSync(srcAbs, { throwIfNoEntry: false })
  if (!stat) {
    console.warn(`  MISSING  ${label}`)
    missing++
    return
  }
  if (stat.isDirectory()) {
    fs.cpSync(srcAbs, destAbs, { recursive: true })
    console.log(`  Copied   ${label}/`)
  } else {
    fs.mkdirSync(path.dirname(destAbs), { recursive: true })
    fs.copyFileSync(srcAbs, destAbs)
    console.log(`  Copied   ${label}`)
  }
  copied++
}

// ── 1. Data/ files (go to public/files/root/Data/) ───────────────────────────

console.log('\n── Data files ────────────────────────────────')

const DATA_FILES = [
  ['Platform\\Plugins\\skymp5-client.js',           'Platform/Plugins/skymp5-client.js'],
  ['Platform\\Plugins\\skymp5-client-settings.txt', 'Platform/Plugins/skymp5-client-settings.txt'],
  ['Platform\\Distribution',                         'Platform/Distribution'],
  ['SKSE\\Plugins\\SkyrimPlatform.dll',              'SKSE/Plugins/SkyrimPlatform.dll'],
  ['SKSE\\Plugins\\MpClientPlugin.dll',              'SKSE/Plugins/MpClientPlugin.dll'],
]

// .pex scripts — flat copy
const scriptsSrc  = path.join(SKYMP_DATA, 'Scripts')
const scriptsDest = path.join(DATA_DEST, 'Scripts')
fs.mkdirSync(scriptsDest, { recursive: true })
try {
  const pex = fs.readdirSync(scriptsSrc).filter(f => f.endsWith('.pex'))
  for (const f of pex) {
    fs.copyFileSync(path.join(scriptsSrc, f), path.join(scriptsDest, f))
    console.log(`  Copied   Scripts/${f}`)
    copied++
  }
} catch (e) {
  console.warn(`  WARNING  Cannot read Scripts/: ${e.message}`)
}

for (const [srcRel, destRel] of DATA_FILES) {
  copyEntry(
    path.join(SKYMP_DATA, srcRel),
    path.join(DATA_DEST, destRel.replace(/\//g, path.sep)),
    srcRel
  )
}

// ── 2. Root files (SKSE base — go to public/files/root/) ─────────────────────

console.log('\n── SKSE root files ───────────────────────────')

if (!SKSE_SRC) {
  console.log('  SKSE_SRC not set — skipping automatic SKSE copy.')
  console.log('  Place skse_loader.exe and skse*.dll manually in:')
  console.log(`  ${ROOT_DEST}`)
} else {
  const stat = fs.statSync(SKSE_SRC, { throwIfNoEntry: false })
  if (!stat || !stat.isDirectory()) {
    console.warn(`  WARNING  SKSE_SRC path not found: ${SKSE_SRC}`)
  } else {
    const skseFiles = fs.readdirSync(SKSE_SRC).filter(f =>
      f.toLowerCase().endsWith('.exe') || f.toLowerCase().endsWith('.dll')
    )
    if (skseFiles.length === 0) {
      console.warn(`  WARNING  No .exe or .dll files found in SKSE_SRC`)
    }
    for (const f of skseFiles) {
      copyEntry(path.join(SKSE_SRC, f), path.join(ROOT_DEST, f), f)
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\nDone. ${copied} item(s) copied, ${missing} missing.\n`)

const loaderPresent = fs.existsSync(path.join(ROOT_DEST, 'skse64_loader.exe'))
if (!loaderPresent) {
  console.warn('⚠  skse64_loader.exe is NOT in public/files/root/')
  console.warn('   The launcher cannot start Skyrim without it.')
  console.warn('   Set SKSE_SRC at the top of this script, or copy the file manually.\n')
} else {
  console.log('✓  skse64_loader.exe found in public/files/root/\n')
}
