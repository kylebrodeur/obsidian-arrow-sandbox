#!/usr/bin/env node
/**
 * component-hash — sandbox -> plugin porting parity check.
 *
 * The sandbox is the source of truth for a component; the plugin gets a
 * near-verbatim copy. This hashes the canonical *portable body* (imports +
 * whitespace normalized out; see lib/canonical-source.mjs) so the hook flags
 * only meaningful drift, not benign import/mount deltas.
 *
 * Usage:
 *   node scripts/component-hash.mjs <file>
 *       print the canonical hash of one component.
 *
 *   node scripts/component-hash.mjs --verify <sandbox-file> <plugin-file>
 *       compare two files; exit 0 (PARITY OK) or 1 (DRIFT).
 *
 *   node scripts/component-hash.mjs --check <manifest.json> [--update]
 *       check every entry; exit 1 on any drift. --update re-records the baseline
 *       from the source of truth (sandbox if present, else the plugin copy).
 *
 * Manifest shape (paths resolved relative to the manifest file):
 *   { "entries": [
 *       { "plugin": "src/chat/arrow/Foo.ts",
 *         "sandbox": "../obsidian-arrow-sandbox/src/components/Foo.ts",  // optional
 *         "hash": "<sha256>" }                                          // optional fallback
 *   ] }
 *
 * Pure Node, no dependencies. Runs at the dev/commit boundary (husky/CI).
 */
import fs from "node:fs";
import path from "node:path";
import { hashSource } from "./lib/canonical-source.mjs";

function fail(message) {
	console.error(`component-hash: ${message}`);
	process.exit(2);
}

function hashFile(file) {
	try {
		return hashSource(fs.readFileSync(file, "utf8"));
	} catch (error) {
		fail(`cannot read ${file} (${error.code ?? error.message})`);
		return ""; // unreachable; fail() exits
	}
}

const argv = process.argv.slice(2);

if (argv.length === 0) {
	fail("usage: component-hash <file> | --verify <a> <b> | --check <manifest> [--update]");
}

if (argv[0] === "--verify") {
	const [, a, b] = argv;
	if (!a || !b) {
		fail("--verify needs <sandbox-file> <plugin-file>");
	}
	const ha = hashFile(a);
	const hb = hashFile(b);
	if (ha === hb) {
		console.log(`PARITY OK  ${path.basename(b)}  ${ha.slice(0, 12)}`);
		process.exit(0);
	}
	console.error(`DRIFT  ${b}\n  sandbox ${ha.slice(0, 12)}  !=  plugin ${hb.slice(0, 12)}`);
	console.error("  -> edit the sandbox component and re-port (don't hand-edit the copy).");
	process.exit(1);
}

if (argv[0] === "--check") {
	const manifestPath = argv[1];
	const update = argv.includes("--update");
	if (!manifestPath) {
		fail("--check needs <manifest.json>");
	}
	const manifestDir = path.dirname(path.resolve(manifestPath));
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	const entries = manifest.entries ?? [];
	const resolve = (p) => path.resolve(manifestDir, p);

	const drifts = [];
	for (const entry of entries) {
		const pluginHash = hashFile(resolve(entry.plugin));
		const hasSandbox = entry.sandbox && fs.existsSync(resolve(entry.sandbox));
		const sourceHash = hasSandbox ? hashFile(resolve(entry.sandbox)) : undefined;
		const expected = sourceHash ?? entry.hash;

		if (update) {
			entry.hash = sourceHash ?? pluginHash;
			continue;
		}
		if (expected === undefined) {
			drifts.push(`${entry.plugin}: no reference (add a sandbox path or a recorded hash)`);
		} else if (pluginHash !== expected) {
			const ref = hasSandbox ? "sandbox" : "recorded";
			drifts.push(
				`${entry.plugin}: DRIFT (plugin ${pluginHash.slice(0, 12)} != ${ref} ${expected.slice(0, 12)})`
			);
		}
	}

	if (update) {
		fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`);
		console.log(
			`Re-recorded ${entries.length} baseline hash(es) in ${path.basename(manifestPath)}.`
		);
		process.exit(0);
	}

	if (drifts.length > 0) {
		console.error(`Port parity: ${drifts.length} drift(s).`);
		for (const d of drifts) {
			console.error(`  ${d}`);
		}
		console.error("  -> edit the sandbox component and re-port, or --update to re-bless.");
		process.exit(1);
	}
	console.log(`Port parity OK (${entries.length} component(s)).`);
	process.exit(0);
}

// Default: print the hash of one file.
console.log(hashFile(argv[0]));
