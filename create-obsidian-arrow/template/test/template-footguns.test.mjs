import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Arrow v1.0.6 footgun guards. Arrow parses html`` templates by treating HTML
 * comments as expression-slot markers, so a *literal* HTML comment inside a
 * template inflates the slot count and throws "Invalid HTML position" at
 * render. Every module under src/ is an Arrow component module, so no literal
 * HTML comment should appear in any of them. (Use JS // comments instead.)
 */

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

function tsFiles(dir) {
	const out = [];
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		const stat = fs.statSync(full);
		if (stat.isDirectory()) out.push(...tsFiles(full));
		else if (name.endsWith(".ts")) out.push(full);
	}
	return out;
}

test("no literal HTML comments in Arrow template modules", () => {
	const offenders = tsFiles(srcDir).filter((file) =>
		fs.readFileSync(file, "utf8").includes("<!--")
	);
	assert.deepEqual(
		offenders.map((f) => path.relative(srcDir, f)),
		[],
		"HTML comments break Arrow templates — move them to JS // comments"
	);
});

/**
 * Footgun #3 (type-level): an Arrow `@event` handler must type its parameter as
 * `Event`, not a narrowed subtype like `MouseEvent`. Parameter contravariance
 * makes `(e: MouseEvent) => void` fail to assign to Arrow's ArrowExpression
 * (TS2345). `tsc` catches this, but this guard flags the common *inline* form
 * with a clearer message. Fix: type the param `Event` and narrow inside.
 */
const NARROWED_INLINE_HANDLER =
	/@[\w-]+="\$\{\s*(?:async\s*)?\(?[^)]*:\s*(?:Mouse|Keyboard|Pointer|Input|Focus|Touch|Wheel|Drag|Clipboard|Submit|Composition|Animation|Transition|UI)Event\b/;

test("inline @event handlers type the param as Event, not a narrowed subtype", () => {
	const offenders = tsFiles(srcDir).filter((file) =>
		NARROWED_INLINE_HANDLER.test(fs.readFileSync(file, "utf8"))
	);
	assert.deepEqual(
		offenders.map((f) => path.relative(srcDir, f)),
		[],
		"Arrow @event handlers must use (e: Event), not a narrowed subtype (e.g. MouseEvent); narrow inside the handler instead"
	);
});
