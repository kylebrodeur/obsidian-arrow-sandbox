#!/usr/bin/env node
/**
 * Install / update the skills bundled in this repo (skills/*) via the `skills`
 * CLI (https://github.com/vercel-labs/skills). This repo is a local skills
 * marketplace: the source `.` resolves to skills/<name>/SKILL.md.
 *
 * Modes (auto-detected):
 *   - Interactive terminal       → opens the picker TUI (choose what to install).
 *   - Non-interactive / CI / -y  → installs ALL bundled skills, no prompts.
 *   - --update                   → updates an already-installed setup in place.
 *
 * Wiring:
 *   - `postinstall` (auto on `pnpm install`): only acts in an interactive
 *     terminal; in CI/non-TTY it prints how to install and exits 0 (never hangs).
 *   - `pnpm skills:install`        → picker (TUI) on a terminal, else installs all.
 *   - `pnpm skills:install --yes`  → always non-interactive: install all skills.
 *   - `pnpm skills:update`         → update installed skills to the latest.
 *
 * Flags / env:
 *   --update / -u           update installed skills (runs `skills update -y`)
 *   --yes / -y              non-interactive install of all bundled skills
 *   --agent <name> / SKILLS_AGENT=<name>   install for one agent (e.g. claude-code)
 *                          instead of all detected agents
 *   --dry-run / SKILLS_DRY_RUN=1   print the command instead of running it
 *   SKIP_SKILLS_INSTALL=1   opt out of the postinstall auto-step
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

const BUNDLED =
	"obsidian-arrow-sandbox, arrow-js-obsidian-templates, arrow-js-obsidian-patterns, arrow-js-obsidian-porting";

const has = (flag) => process.argv.includes(flag);
const flagValue = (flag) => {
	const i = process.argv.indexOf(flag);
	return i >= 0 ? process.argv[i + 1] : undefined;
};

const forced = has("--force"); // set by `pnpm skills:install`
const update = has("--update") || has("-u");
const yes = has("--yes") || has("-y");
const agent = flagValue("--agent") || process.env.SKILLS_AGENT;
const dryRun = has("--dry-run") || process.env.SKILLS_DRY_RUN === "1";
const isCI = Boolean(process.env.CI);
const interactive = Boolean(process.stdout.isTTY && process.stdin.isTTY);
const optedOut = process.env.SKIP_SKILLS_INSTALL === "1";

function run(args) {
	const pretty = ["npx", "skills", ...args].join(" ");
	if (dryRun) {
		console.log(`[skills] (dry-run) would run: ${pretty}`);
		process.exit(0);
	}
	console.log(`[skills] ${pretty}`);
	const result = spawnSync("npx", ["--yes", "skills", ...args], {
		stdio: "inherit",
		shell: process.platform === "win32",
	});
	if (result.error) {
		console.error(
			`[skills] could not run npx skills (${result.error.message}). Install manually: npx skills add . --all --yes`
		);
		process.exit(0); // never fail an install over an optional convenience step
	}
	process.exit(result.status ?? 0);
}

if (optedOut && !update && !forced) {
	console.log("[skills] SKIP_SKILLS_INSTALL=1 — skipping skill install.");
	process.exit(0);
}

// Update an existing setup to the latest (works in any context).
if (update) {
	console.log("[skills] Updating installed skills to the latest…");
	run(["update", "-y"]);
}

// Conservative postinstall: only auto-run when a human is at the terminal so
// `pnpm install` in CI never hangs or installs things unprompted.
if (!forced && (isCI || !interactive)) {
	console.log(
		`[skills] Bundled skills: ${BUNDLED}\n         Install:  pnpm skills:install        (interactive picker on a terminal)\n                   pnpm skills:install --yes  (non-interactive — installs all)\n         Update:   pnpm skills:update`
	);
	process.exit(0);
}

// Non-interactive (CI/agent/no TTY, or --yes, or an agent target): install ALL
// bundled skills with no prompts. Target one agent if asked, else all agents.
if (!interactive || yes || agent) {
	console.log(`[skills] Installing all bundled skills non-interactively: ${BUNDLED}`);
	if (agent) {
		// `--all` is shorthand for `-s * -a * -y`, so to target one agent we
		// spell out all-skills + that agent explicitly.
		run(["add", ".", "-s", "*", "-a", agent, "-y"]);
	}
	run(["add", ".", "--all"]);
}

// Interactive terminal: let the user pick in the TUI.
console.log(`[skills] Opening the skills picker. Bundled: ${BUNDLED}`);
run(["add", "."]);
