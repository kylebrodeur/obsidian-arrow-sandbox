#!/usr/bin/env node
/**
 * Install / update the obsidian-arrow agent skills via the `skills` CLI
 * (https://github.com/vercel-labs/skills).
 *
 * Skills are NOT vendored into scaffolds — they're pulled from the published
 * repo (the source of truth), so installs are always current and don't depend on
 * a bundled copy. The sandbox repo itself (which has a local `skills/` dir) uses
 * that local copy instead, so you can test edits before publishing.
 *
 * Modes (auto-detected):
 *   - Interactive terminal       → opens the picker TUI (choose what to install).
 *   - Non-interactive / CI / -y  → installs ALL skills, no prompts.
 *   - --update                   → updates an already-installed setup in place.
 *
 * Wiring:
 *   - `postinstall` (auto on `pnpm install`): only acts in an interactive
 *     terminal; in CI/non-TTY it prints how to install and exits 0 (never hangs).
 *   - `pnpm skills:install [--yes]`  → picker, or non-interactive install of all.
 *   - `pnpm skills:update`           → update installed skills to the latest.
 *
 * Flags / env:
 *   --source <ref> | SKILLS_SOURCE=<ref>   where to pull skills from (default: the
 *                          published repo; a local `skills/` dir is used if present)
 *   --update / -u           update installed skills (runs `skills update -y`)
 *   --yes / -y              non-interactive install of all skills
 *   --agent <name> | --agent=<name>   install for one agent instead of all
 *   --project-dir=<path>    install into another project root (e.g. the outer repo
 *                          a scaffold is nested in); project-scoped there
 *   --global / -g           install at user level (~/.<agent>/…), everywhere
 *   SKILLS_AGENT / SKILLS_PROJECT_DIR / SKILLS_GLOBAL   env forms (for the auto
 *                          `postinstall` step, which can't take CLI args, and CI)
 *   --dry-run / SKILLS_DRY_RUN=1   print the command instead of running it
 *   SKIP_SKILLS_INSTALL=1   opt out of the postinstall auto-step
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO = "kylebrodeur/obsidian-arrow-sandbox";
const SKILLS =
	"obsidian-arrow-sandbox, arrow-js-obsidian-templates, arrow-js-obsidian-patterns, arrow-js-obsidian-porting, obsidian-arrow-maintenance";

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

/** Nearest ancestor *above* `dir` that is a git repo, or null. */
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

// Pull from the published repo by default; prefer a local `skills/` dir if
// present (the sandbox repo itself); honor an explicit --source override.
const explicitSource = flagValue("--source") || process.env.SKILLS_SOURCE;
const hasLocalSkills = fs.existsSync(path.join(process.cwd(), "skills"));
const baseSource = explicitSource ?? (hasLocalSkills ? "." : REPO);
// A repo ref is cwd-independent; a local "." must be made absolute when
// --project-dir redirects cwd so it still resolves.
const source = projectDir && baseSource === "." ? path.resolve(".") : baseSource;
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
			`[skills] could not run npx skills (${result.error.message}). Install manually: npx skills add ${REPO} --all --yes`
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
		`[skills] Agent skills: ${SKILLS}\n         Install:  pnpm skills:install        (interactive picker on a terminal)\n                   pnpm skills:install --yes  (non-interactive — installs all)\n         Update:   pnpm skills:update`
	);
	process.exit(0);
}

// Non-interactive (CI/agent/no TTY, or --yes, or an agent/global target): install
// ALL skills with no prompts. Target one agent if asked, else all agents.
if (!interactive || yes || agent || global || projectDir) {
	console.log(`[skills] Installing all skills non-interactively from ${source}: ${SKILLS}`);
	const outer = global || projectDir ? null : outerRepoAbove(process.cwd());
	if (outer) {
		console.log(
			`[skills] note: this folder is nested inside ${outer}, and skills install scoped to cwd. For session/skill:// discovery they must live at the repo root — install there with:\n         pnpm skills:install --yes --project-dir=${outer}\n         (or, from ${outer}: npx skills add ${REPO} --all --yes). Reload the session afterwards.`
		);
	}
	// `--all` is shorthand for `-s * -a * -y`; to target one agent we spell out
	// all-skills + that agent explicitly.
	const args = agent ? ["add", source, "-s", "*", "-a", agent, "-y"] : ["add", source, "--all"];
	if (global) {
		args.push("--global");
	}
	run(args, targetCwd);
}

// Interactive terminal: let the user pick in the TUI.
console.log(`[skills] Opening the skills picker (source: ${source}). Skills: ${SKILLS}`);
run(["add", source]);
