'use strict'

/**
 * Merge pipeline — combines the two source directories into the file bucket
 * that the launcher serves to players.
 *
 *   sources/client/  +  sources/skse/  →  public/files/root/
 *
 * Both sources are copied in order; skse overwrites client on any collision
 * (shouldn't happen in practice — they contain different files).
 *
 * Skipped files:
 *   .git directories, README.md inside sources/skse/
 *
 * Run standalone:  node scripts/merge-files.js
 * Called by:       scripts/setup-client.js  and  routes/webhook.js
 */

const path = require('path')
const fs   = require('fs')

const ROOT = path.join(__dirname, '..')

const CLIENT_SRC = path.join(ROOT, 'sources', 'client')
const SKSE_SRC   = path.join(ROOT, 'sources', 'skse')
const OUTPUT_DIR = path.join(ROOT, 'public', 'files', 'root')

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Recursively copy srcDir → destDir.
 * skipNames: set of file/dir names to skip at any depth.
 * Returns the number of files copied.
 */
function copyDir(srcDir, destDir, skipNames = new Set()) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`[merge] source not found, skipping: ${srcDir}`)
    return 0
  }

  let count = 0
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue

    const src  = path.join(srcDir, entry.name)
    const dest = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true })
      count += copyDir(src, dest, skipNames)
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(src, dest)
      count++
    }
  }

  return count
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Merge sources/client and sources/skse into public/files/root.
 * Returns { clientFiles, skseFiles, total }.
 */
function mergeSourcesIntoRoot() {
  const startMs = Date.now()

  console.log('[merge] Starting merge…')
  console.log(`[merge]   client  : ${CLIENT_SRC}`)
  console.log(`[merge]   skse    : ${SKSE_SRC}`)
  console.log(`[merge]   output  : ${OUTPUT_DIR}`)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  // 1. Client repo files (Data/, Interface/, Scripts/, etc.)
  const SKIP_ALWAYS = new Set(['.git', '.gitignore', '.gitattributes'])
  const clientFiles = copyDir(CLIENT_SRC, OUTPUT_DIR, SKIP_ALWAYS)
  console.log(`[merge]   ${clientFiles} file(s) from client`)

  // 2. SKSE root binaries (.exe, .dll at top level)
  //    Skip README and any non-binary files so docs don't end up in the game folder.
  const SKSE_SKIP = new Set([...SKIP_ALWAYS, 'README.md', 'README.txt'])
  const skseFiles = copyDir(SKSE_SRC, OUTPUT_DIR, SKSE_SKIP)
  console.log(`[merge]   ${skseFiles} file(s) from skse`)

  const elapsed = Date.now() - startMs
  const total   = clientFiles + skseFiles
  console.log(`[merge] Done: ${total} file(s) total in ${elapsed}ms`)

  // Warn if the loader is missing — launcher cannot start the game without it.
  const loaderPath = path.join(OUTPUT_DIR, 'skse64_loader.exe')
  if (!fs.existsSync(loaderPath)) {
    console.warn('[merge] ⚠  skse64_loader.exe not found in output.')
    console.warn('[merge]    Place SKSE binaries in sources/skse/ and re-run.')
  }

  return { clientFiles, skseFiles, total }
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  mergeSourcesIntoRoot()
}

module.exports = { mergeSourcesIntoRoot }
