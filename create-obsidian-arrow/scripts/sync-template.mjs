#!/usr/bin/env node
/**
 * Regenerate create-obsidian-arrow/template/ from the sandbox repo itself, so
 * the vendored template never drifts from the real, verified project. Run after
 * changing the sandbox: `pnpm create:sync` (from the repo root).
 *
 * Copies the repo root into template/, excluding build/VCS artifacts and the
 * initializer package itself, and renames .gitignore -> _gitignore (npm omits
 * .gitignore from published tarballs; the initializer restores it on scaffold).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, ".."); // create-obsidian-arrow/
const repoRoot = path.resolve(pkgRoot, ".."); // sandbox root
const templateDir = path.join(pkgRoot, "template");

// Top-level entries never copied into the template.
const EXCLUDE_TOP = new Set(["node_modules", "dist", ".git", "create-obsidian-arrow", ".DS_Store"]);

function copyDir(src, dest, isRoot) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		if (isRoot && EXCLUDE_TOP.has(entry.name)) {
			continue;
		}
		if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".DS_Store") {
			continue;
		}
		// Skip husky internals; only the hook scripts are vendored.
		if (entry.name === "_" && path.basename(src) === ".husky") {
			continue;
		}
		const srcPath = path.join(src, entry.name);
		const destName = isRoot && entry.name === ".gitignore" ? "_gitignore" : entry.name;
		const destPath = path.join(dest, destName);
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath, false);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

fs.rmSync(templateDir, { recursive: true, force: true });
copyDir(repoRoot, templateDir, true);
console.log(`Synced template/ from ${path.relative(process.cwd(), repoRoot) || "."}`);
