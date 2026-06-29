#!/usr/bin/env node
/**
 * Extract Obsidian's `app.css` from the local install and write it to
 * `public/app.css`, so the sandbox renders against the *real* Obsidian default
 * theme (every `var(--…)` token plus the semantic component rules like
 * `.setting-item`, `.clickable-icon`, `.vertical-tab-nav-item`).
 *
 * On macOS `app.css` lives inside the asar archive
 * `Obsidian.app/Contents/Resources/obsidian.asar`. The asar parsing lives in
 * ./lib/extract-app-css.mjs (unit-tested separately).
 *
 * Usage:
 *   node scripts/pull-app-css.mjs                # auto-locate per platform
 *   node scripts/pull-app-css.mjs --path <asar>  # explicit asar/app.css path
 *   OBSIDIAN_ASAR=<path> node scripts/pull-app-css.mjs
 *
 * Pure Node, no dependencies, no running Obsidian required.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { extractAppCss, assertLooksLikeAppCss } from './lib/extract-app-css.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.resolve(__dirname, '..', 'public', 'app.css')

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--path') args.path = argv[++i]
  }
  return args
}

/** Candidate asar locations per platform, in priority order. */
function candidateAsarPaths() {
  const home = os.homedir()
  switch (process.platform) {
    case 'darwin':
      return [
        '/Applications/Obsidian.app/Contents/Resources/obsidian.asar',
        path.join(home, 'Applications/Obsidian.app/Contents/Resources/obsidian.asar'),
      ]
    case 'win32':
      return [path.join(home, 'AppData/Local/Obsidian/resources/obsidian.asar')]
    default:
      return [
        '/opt/Obsidian/resources/obsidian.asar',
        '/usr/lib/obsidian/resources/obsidian.asar',
        path.join(home, '.local/share/obsidian/resources/obsidian.asar'),
      ]
  }
}

function locateSource(explicit) {
  if (explicit) return explicit
  if (process.env.OBSIDIAN_ASAR) return process.env.OBSIDIAN_ASAR
  for (const p of candidateAsarPaths()) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function main() {
  const { path: explicit } = parseArgs(process.argv.slice(2))
  const source = locateSource(explicit)

  if (!source) {
    console.error(
      'Could not locate Obsidian. Pass --path <obsidian.asar | app.css> or set OBSIDIAN_ASAR.\n' +
        `Looked in:\n  ${candidateAsarPaths().join('\n  ')}`
    )
    process.exit(1)
  }

  const css = source.endsWith('.css')
    ? fs.readFileSync(source, 'utf8')
    : extractAppCss(fs.readFileSync(source))

  assertLooksLikeAppCss(css)

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, css)
  console.log(
    `Wrote ${(css.length / 1024).toFixed(1)}KB to ${path.relative(process.cwd(), outFile)}\n` +
      `  source: ${source}`
  )
}

main()
