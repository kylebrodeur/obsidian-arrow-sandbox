#!/usr/bin/env node
/**
 * create-obsidian-arrow — scaffold a new Obsidian-styled Arrow.js UI sandbox.
 *
 *   pnpm create obsidian-arrow my-app      # once published
 *   node create-obsidian-arrow/index.mjs my-app   # locally, before publishing
 *
 * Copies the vendored template/ into <dir>, restores .gitignore (npm strips it
 * from packages, so it's vendored as _gitignore), rewrites the project name,
 * and runs `git init`. The template is a full, verified sandbox — see template/.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.join(here, "template");

function fail(message) {
	console.error(`create-obsidian-arrow: ${message}`);
	process.exit(1);
}

const targetArg = process.argv[2];
if (!targetArg) {
	fail("usage: create-obsidian-arrow <directory>");
}

const destRoot = path.resolve(process.cwd(), targetArg);
const appName = path.basename(destRoot);

if (fs.existsSync(destRoot) && fs.readdirSync(destRoot).length > 0) {
	fail(`target "${targetArg}" already exists and is not empty.`);
}
if (!fs.existsSync(templateDir)) {
	fail("template/ is missing — run scripts/sync-template.mjs to build it.");
}

function copyDir(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const srcPath = path.join(src, entry.name);
		// Vendored as _gitignore because npm omits .gitignore from published tarballs.
		const destName = entry.name === "_gitignore" ? ".gitignore" : entry.name;
		const destPath = path.join(dest, destName);
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

copyDir(templateDir, destRoot);

// Personalize the project name. Use a targeted replace (not JSON.parse +
// stringify) so the template's existing Biome formatting stays byte-identical
// and the fresh project passes `pnpm lint` out of the box.
const pkgPath = path.join(destRoot, "package.json");
const pkgText = fs.readFileSync(pkgPath, "utf8");
const renamed = pkgText.replace(
	/("name":\s*)"[^"]*"/,
	(_match, prefix) => `${prefix}${JSON.stringify(appName)}`
);
fs.writeFileSync(pkgPath, renamed);

// Initialize a git repo (best-effort; ignore if git is unavailable).
spawnSync("git", ["init", "-q"], { cwd: destRoot, stdio: "ignore" });

console.log(`\nScaffolded ${appName} in ${path.relative(process.cwd(), destRoot) || "."}\n`);
console.log("Next steps:");
console.log(`  cd ${targetArg}`);
console.log("  pnpm install");
console.log("  pnpm pull-css     # extract Obsidian's app.css (macOS auto-detect)");
console.log("  pnpm dev\n");
