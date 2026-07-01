// Side-effect import installs the framework runtime (async components + boundary).
// This is the one extra line a plugin would add to adopt @arrow-js/framework.
import "@arrow-js/framework";

import { startRouter } from "./router/client";
import { applyTheme } from "./sandbox/theme";
import "./utilities.css";
import "./sandbox/sandbox.css";

applyTheme();

const root = document.getElementById("app");
if (!root) {
	throw new Error("Sandbox mount point #app not found.");
}

// Routes resolve through routeToPage() and mount via template(container) —
// the same call an Obsidian ItemView.onOpen() makes.
startRouter(root);
