// Side-effect import installs the framework runtime (async components + boundary).
// This is the one extra line a plugin would add to adopt @arrow-js/framework.
import '@arrow-js/framework'

import { applyTheme } from './sandbox/theme'
import { Frame } from './sandbox/frame'
import { SettingsPanel } from './components/SettingsPanel'
import './sandbox/sandbox.css'

applyTheme()

const root = document.getElementById('app')
if (!root) {
  throw new Error('Sandbox mount point #app not found.')
}

// Mount exactly like an Obsidian ItemView would: template(container).
Frame(SettingsPanel())(root)
