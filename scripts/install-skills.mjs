#!/usr/bin/env node
/**
 * Install the skills bundled in this repo (skills/*) into the developer's agent
 * via the `skills` CLI (https://github.com/vercel-labs/skills). This repo acts
 * as a local marketplace: `skills add .` discovers skills/<name>/SKILL.md and
 * lets the user pick which to install through the interactive TUI.
 *
 * Wired as `postinstall`, so it runs after `pnpm install`. To keep that safe it
 * only launches the interactive TUI when attached to a real terminal — in CI or
 * any non-interactive context it prints a hint and exits 0 instead of hanging.
 * Run it on demand with `pnpm skills:install` (which passes --force).
 *
 *   SKIP_SKILLS_INSTALL=1   opt out entirely
 *   pnpm skills:install      force the interactive install
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

const forced = process.argv.includes("--force");
const isCI = Boolean(process.env.CI);
const interactive = Boolean(process.stdout.isTTY && process.stdin.isTTY);
const optedOut = process.env.SKIP_SKILLS_INSTALL === "1";

if (!forced && (isCI || optedOut || !interactive)) {
	console.log(
		"[skills] Skipping interactive skill install (non-interactive/CI/opt-out).\n         Run `pnpm skills:install` to install the bundled skills via the npx skills TUI."
	);
	process.exit(0);
}

console.log("[skills] Launching `npx skills add .` — pick the skills to install in the TUI…\n");

// `--yes` only auto-confirms npx fetching the `skills` package; the skills CLI's
// own selection TUI still shows (we deliberately do not pass skills' `-y`).
const result = spawnSync("npx", ["--yes", "skills", "add", "."], {
	stdio: "inherit",
	shell: process.platform === "win32",
});

if (result.error) {
	console.error(
		`[skills] Could not run npx skills (${result.error.message}).\n         Install manually: npx skills add .`
	);
	process.exit(0); // never fail an install over an optional convenience step
}

process.exit(result.status ?? 0);
