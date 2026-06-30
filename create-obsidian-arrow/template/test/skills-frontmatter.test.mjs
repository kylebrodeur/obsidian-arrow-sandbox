import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * The `skills` CLI parses each SKILL.md's YAML frontmatter; if it can't, the
 * skill is silently skipped (not installed). An unquoted plain-scalar
 * `description:` that contains `: ` (read as a nested key) or an unescaped
 * double-quote breaks the parse — that's a real footgun (it skipped
 * arrow-js-obsidian-templates until caught). These guards keep descriptions
 * installable.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = path.join(root, "skills");

function skillFiles() {
	if (!fs.existsSync(skillsDir)) {
		return [];
	}
	return fs
		.readdirSync(skillsDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(skillsDir, entry.name, "SKILL.md"))
		.filter((file) => fs.existsSync(file));
}

function frontmatter(text) {
	const match = text.match(/^---\n([\s\S]*?)\n---/);
	return match ? match[1] : "";
}

test("every skill has name + description frontmatter", () => {
	for (const file of skillFiles()) {
		const fm = frontmatter(fs.readFileSync(file, "utf8"));
		assert.match(fm, /^name:\s+\S/m, `${path.relative(root, file)}: missing name`);
		assert.match(fm, /^description:\s+\S/m, `${path.relative(root, file)}: missing description`);
	}
});

test("skill descriptions are YAML-safe so the skills CLI installs them", () => {
	const offenders = [];
	for (const file of skillFiles()) {
		const fm = frontmatter(fs.readFileSync(file, "utf8"));
		const desc = (fm.match(/^description:\s+(.*)$/m) ?? [])[1] ?? "";
		const quoted = /^["']/.test(desc);
		if (!quoted && (/: /.test(desc) || desc.includes('"'))) {
			offenders.push(path.relative(root, file));
		}
	}
	assert.deepEqual(
		offenders,
		[],
		"unquoted description must not contain ': ' or a double-quote (breaks YAML; the skills CLI skips it)"
	);
});
