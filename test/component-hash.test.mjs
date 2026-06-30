import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalizeSource, hashSource } from "../scripts/lib/canonical-source.mjs";

/**
 * Porting-parity canonicalization. The hash must ignore the bits that
 * legitimately differ when a component is ported sandbox -> plugin (imports,
 * whitespace) and flag everything else (the component body/template).
 */

const SANDBOX = `import { component, html } from "@arrow-js/core";
import { loadStatus } from "../data/loadStatus";

export const Card = component(() => html\`<div class="setting-item">\${() => loadStatus()}</div>\`);
`;

// Same body, plugin-flavored imports (obsidian + real data wiring).
const PLUGIN = `import { component, html } from "@arrow-js/core";
import { loadStatus } from "./rpc";
import { setIcon } from "obsidian";

export const Card = component(() => html\`<div class="setting-item">\${() => loadStatus()}</div>\`);
`;

test("imports are stripped — same body hashes equal across sandbox and plugin", () => {
	assert.equal(hashSource(SANDBOX), hashSource(PLUGIN));
});

test("a body change is detected as drift", () => {
	const drifted = PLUGIN.replace("setting-item", "setting-item is-hacked");
	assert.notEqual(hashSource(SANDBOX), hashSource(drifted));
});

test("whitespace and blank-line differences are normalized away", () => {
	const messy = `${SANDBOX.replace(/\n/g, "\n\n")}   \n`;
	assert.equal(hashSource(SANDBOX), hashSource(messy));
});

test("multi-line imports are stripped", () => {
	const multiline = `import {\n\tcomponent,\n\thtml,\n} from "@arrow-js/core";\n\nexport const X = 1;\n`;
	const singleline = `import { component, html } from "@arrow-js/core";\n\nexport const X = 1;\n`;
	assert.equal(hashSource(multiline), hashSource(singleline));
	assert.match(canonicalizeSource(multiline), /^export const X = 1;\n$/);
});

test("hash is stable sha256 hex", () => {
	assert.match(hashSource(SANDBOX), /^[0-9a-f]{64}$/);
});
