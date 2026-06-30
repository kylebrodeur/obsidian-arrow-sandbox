#!/usr/bin/env node
/**
 * create-obsidian-arrow — scaffold or update an Obsidian-styled Arrow.js sandbox.
 *
 *   create-obsidian-arrow <dir>            scaffold a new project into <dir>
 *   create-obsidian-arrow update [dir]     refresh an existing project's tooling
 *                                          (default dir: cwd) — preserves your code
 *
 *   pnpm create obsidian-arrow my-app
 *   node create-obsidian-arrow/index.mjs my-app          # locally
 *   node create-obsidian-arrow/index.mjs update ./my-app
 *
 * Scaffold copies the vendored template/, restores .gitignore (vendored as
 * _gitignore), names the project, and runs `git init`.
 *
 * Update refreshes only the *managed* tooling files from the template and merges
 * package.json scripts + missing deps — it never touches your src/, public/,
 * index.html, or the core build configs. Use --dry-run to preview.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.join(here, "template");

// Files/dirs the template owns and `update` may overwrite/merge. Everything else
// (src/, public/, index.html, vite.config.ts, tsconfig.json, lockfile, .gitignore,
// port-parity.json, …) is treated as user-owned and left alone.
const MANAGED = [
	"scripts",
	"skills",
	"docs",
	".github",
	".husky",
	"biome.json",
	"AGENTS.md",
	"CLAUDE.md",
];

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");

function fail(message) {
	console.error(`create-obsidian-arrow: ${message}`);
	process.exit(1);
}

if (!fs.existsSync(templateDir)) {
	fail("template/ is missing — run scripts/sync-template.mjs to build it.");
}

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

/** Recursively copy src→dest; returns the list of written file paths (relative
 * to `base`). Honors --dry-run (records but doesn't write). */
function copyTree(src, dest, base, written) {
	const stat = fs.statSync(src);
	if (stat.isDirectory()) {
		if (!dryRun) {
			fs.mkdirSync(dest, { recursive: true });
		}
		for (const entry of fs.readdirSync(src)) {
			copyTree(path.join(src, entry), path.join(dest, entry), base, written);
		}
		return;
	}
	written.push(path.relative(base, dest));
	if (!dryRun) {
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.copyFileSync(src, dest);
	}
}

function scaffold(targetArg) {
	const destRoot = path.resolve(process.cwd(), targetArg);
	const appName = path.basename(destRoot);

	if (fs.existsSync(destRoot) && fs.readdirSync(destRoot).length > 0) {
		fail(`target "${targetArg}" already exists and is not empty (use \`update\` to refresh it).`);
	}

	const written = [];
	copyTree(templateDir, destRoot, destRoot, written);
	// Restore .gitignore (npm omits .gitignore from packages; vendored as _gitignore).
	const vendoredIgnore = path.join(destRoot, "_gitignore");
	if (fs.existsSync(vendoredIgnore)) {
		fs.renameSync(vendoredIgnore, path.join(destRoot, ".gitignore"));
	}

	// Personalize the project name via targeted replace (keeps Biome formatting).
	const pkgPath = path.join(destRoot, "package.json");
	const renamed = fs
		.readFileSync(pkgPath, "utf8")
		.replace(/("name":\s*)"[^"]*"/, (_m, prefix) => `${prefix}${JSON.stringify(appName)}`);
	fs.writeFileSync(pkgPath, renamed);

	spawnSync("git", ["init", "-q"], { cwd: destRoot, stdio: "ignore" });

	console.log(`\nScaffolded ${appName} in ${path.relative(process.cwd(), destRoot) || "."}\n`);
	console.log("Next steps:");
	console.log(`  cd ${targetArg}`);
	console.log("  pnpm install");
	console.log("  pnpm pull-css     # extract Obsidian's app.css (macOS auto-detect)");
	console.log("  pnpm dev\n");

	const outer = outerRepoAbove(destRoot);
	if (outer) {
		console.log(`Note: this project is nested inside the repo at ${outer}.`);
		console.log("  Bundled skills install scoped to THIS project. To install them at the");
		console.log(`  outer repo instead:  pnpm skills:install --yes --project-dir=${outer}\n`);
	}
}

/** Merge template package.json scripts + missing deps into the target's,
 * preserving name/version/identity and existing dep versions. */
function mergePackageJson(targetPkgPath) {
	const tpl = JSON.parse(fs.readFileSync(path.join(templateDir, "package.json"), "utf8"));
	const pkg = JSON.parse(fs.readFileSync(targetPkgPath, "utf8"));
	const changes = [];

	pkg.scripts ??= {};
	for (const [name, cmd] of Object.entries(tpl.scripts ?? {})) {
		if (pkg.scripts[name] !== cmd) {
			changes.push(`script ${name}`);
			pkg.scripts[name] = cmd;
		}
	}
	for (const field of ["dependencies", "devDependencies"]) {
		pkg[field] ??= {};
		for (const [name, version] of Object.entries(tpl[field] ?? {})) {
			if (!(name in pkg[field])) {
				changes.push(`${field}: ${name}`);
				pkg[field][name] = version;
			}
		}
	}

	if (changes.length > 0 && !dryRun) {
		fs.writeFileSync(targetPkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
	}
	return changes;
}

function update(targetArg) {
	const root = path.resolve(process.cwd(), targetArg ?? ".");
	if (!fs.existsSync(path.join(root, "package.json"))) {
		fail(`no package.json in ${root} — is this a scaffolded project?`);
	}

	const written = [];
	for (const name of MANAGED) {
		const src = path.join(templateDir, name);
		if (fs.existsSync(src)) {
			copyTree(src, path.join(root, name), root, written);
		}
	}
	const pkgChanges = mergePackageJson(path.join(root, "package.json"));

	const verb = dryRun ? "Would refresh" : "Refreshed";
	console.log(
		`${verb} ${written.length} managed file(s) in ${path.relative(process.cwd(), root) || "."}:`
	);
	for (const file of written) {
		console.log(`  ${file}`);
	}
	if (pkgChanges.length > 0) {
		console.log(`package.json: ${dryRun ? "would update" : "updated"} ${pkgChanges.join(", ")}`);
	}
	console.log(
		dryRun
			? "\n(dry run — nothing written.)"
			: "\nLeft alone: src/, public/, index.html, vite.config.ts, tsconfig.json, .gitignore.\nRun `pnpm install` then `pnpm check`.\n"
	);
}

const command = argv[0];
if (command === "update") {
	update(argv.find((a) => a !== "update" && !a.startsWith("--")));
} else if (!command || command.startsWith("--")) {
	fail("usage: create-obsidian-arrow <directory> | update [directory]");
} else {
	scaffold(command);
}
