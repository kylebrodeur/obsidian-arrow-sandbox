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
 *   --agent <name> | --agent=<name>   install for one agent (e.g. claude-code)
 *                          instead of all detected agents
 *   --project-dir=<path>    install into another project root (e.g. the outer repo
 *                          a scaffold is nested in); project-scoped there
 *   --global / -g           install at user level (~/.<agent>/…), available
 *                          everywhere; some agents don't support global
 *   SKILLS_AGENT / SKILLS_PROJECT_DIR / SKILLS_GLOBAL   env forms (for the auto
 *                          `postinstall` step, which can't take CLI args, and CI)
 *   --dry-run / SKILLS_DRY_RUN=1   print the command instead of running it
 *   SKIP_SKILLS_INSTALL=1   opt out of the postinstall auto-step
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUNDLED =
	"obsidian-arrow-sandbox, arrow-js-obsidian-templates, arrow-js-obsidian-patterns, arrow-js-obsidian-porting";

const has = (flag) => process.argv.includes(flag);
// Accepts both `--flag value` and `--flag=value`.
const flagValue = (flag) => {
	const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
	if (eq) {
		return eq.slice(flag.length + 1);
	}
	const i = process.argv.indexOf(flag);
	return i >= 0 ? process.argv[i + 1] : undefined;
};

/** Nearest ancestor *above* `dir` that is a git repo, or null. Used to warn
 * when this project is nested inside another repo (skills install per-project,
 * relative to cwd — not the outer root). */
function outerRepoAbove(dir) {
	let current = path.dirname(path.resolve(dir));
	const fsRoot = path.parse(current).root;
	while (current && current !== fsRoot) {
		if (fs.existsSync(path.join(current, ".git"))) {
			return current;
		}
		current = path.dirname(current);
	}
	return null;
}

const forced = has("--force"); // set by `pnpm skills:install`
const update = has("--update") || has("-u");
const yes = has("--yes") || has("-y");
const global = has("--global") || has("-g") || process.env.SKILLS_GLOBAL === "1";
const agent = flagValue("--agent") || process.env.SKILLS_AGENT;
const projectDir = flagValue("--project-dir") || process.env.SKILLS_PROJECT_DIR;
const dryRun = has("--dry-run") || process.env.SKILLS_DRY_RUN === "1";
const isCI = Boolean(process.env.CI);
const interactive = Boolean(process.stdout.isTTY && process.stdin.isTTY);
const optedOut = process.env.SKIP_SKILLS_INSTALL === "1";

// `skills add` installs project-scope relative to cwd. To install into another
// root (e.g. the outer repo a scaffold is nested in), run the CLI there while
// sourcing the skills from THIS folder by absolute path.
const skillsSource = projectDir ? path.resolve(".") : ".";
const targetCwd = projectDir ? path.resolve(projectDir) : process.cwd();

if (projectDir && !fs.existsSync(targetCwd)) {
	console.error(`[skills] --project-dir not found: ${targetCwd}`);
	process.exit(1);
}

function run(args, cwd = process.cwd()) {
	const where = cwd === process.cwd() ? "" : ` (in ${cwd})`;
	const pretty = ["npx", "skills", ...args].join(" ");
	if (dryRun) {
		console.log(`[skills] (dry-run) would run: ${pretty}${where}`);
		process.exit(0);
	}
	console.log(`[skills] ${pretty}${where}`);
	const result = spawnSync("npx", ["--yes", "skills", ...args], {
		cwd,
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

// Non-interactive (CI/agent/no TTY, or --yes, or an agent/global target): install
// ALL bundled skills with no prompts. Target one agent if asked, else all agents.
if (!interactive || yes || agent || global || projectDir) {
	console.log(`[skills] Installing all bundled skills non-interactively: ${BUNDLED}`);
	const outer = global || projectDir ? null : outerRepoAbove(process.cwd());
	if (outer) {
		console.log(
			`[skills] note: this folder is nested inside ${outer}. Skills install here, scoped to THIS project. To install at the outer repo instead, re-run with --project-dir=${outer} (or --global for user-level).`
		);
	}
	// `--all` is shorthand for `-s * -a * -y`; to target one agent we spell out
	// all-skills + that agent explicitly. `skillsSource` is absolute when
	// --project-dir redirects cwd elsewhere.
	const args = agent
		? ["add", skillsSource, "-s", "*", "-a", agent, "-y"]
		: ["add", skillsSource, "--all"];
	if (global) {
		args.push("--global");
	}
	run(args, targetCwd);
}

// Interactive terminal: let the user pick in the TUI.
console.log(`[skills] Opening the skills picker. Bundled: ${BUNDLED}`);
run(["add", "."]);
