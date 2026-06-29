/**
 * Stand-in async data source for the boundary() demo. In the real plugin this
 * would be an RPC call (session scan, model list, connection probe). The
 * artificial delay lets us actually see the async fallback render.
 */
export interface StatusInfo {
	label: string;
	detail: string;
}

export async function loadStatus(): Promise<StatusInfo> {
	await new Promise((resolve) => setTimeout(resolve, 900));
	return {
		label: "Connected",
		detail: "pi daemon reachable · 12ms latency · 3 vaults synced",
	};
}
