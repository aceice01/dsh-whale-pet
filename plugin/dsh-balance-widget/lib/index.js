import { readFileSync } from "node:fs";
import { credentialRef } from "@deepseek-ai/dsh-credentials";

/**
 * dsh-balance-widget (server half) — whale-girl pet edition (whale-v3)
 *
 * Registers:
 *  - GET /api/balance  — DeepSeek account balance through the credential seam
 *    (the browser half of this plugin polls it; the API key never reaches the
 *    renderer), with a short TTL cache and last-known-value fallback.
 *  - GET /api/status   — live agent work status derived from the durable
 *    session firehose: turn/start|end, tool/call|result, todo/write,
 *    goal/change, approval/asked|decided, command/run|done. The desktop pet
 *    polls it to drive its mood, coquetry lines and completion celebration.
 *  - GET /pet.html     — the desktop-pet page the Electron pet window loads.
 */

/** Stable Cordis plugin name (must match the loader entry name). */
const name = "balance-widget";

/** Services required before this plugin mounts. */
const inject = ["webServer"];

/** Official DeepSeek account-balance endpoint. */
const BALANCE_URL = "https://api.deepseek.com/user/balance";

/** Serve cached results within this window to stay responsive on flaky networks. */
const CACHE_TTL_MS = 30 * 1000;

function apply(ctx) {
	/** Last successful balance payload plus its fetch time. */
	let cache = null;

	/** Live agent work state, updated from the session/event firehose. */
	const work = {
		status: "idle", // "idle" | "running"
		runningSince: null,
		doneAt: null,
		doneCount: 0,
		lastTool: null, // { name, at } — most recent tool/call
		lastToolError: null, // { name, code, at } — most recent failed tool
		todos: null, // { total, done, summary } — latest todo/write snapshot
		goal: null, // { state, reason? } — latest goal/change
		waitingApproval: null, // { toolName, reason, at }
		command: null, // { name, running, at } — latest command/run|done
		lastEvent: null, // { type, at }
	};

	ctx.on("session/event", (session, event) => {
		if (!event?.type) return;
		const at = event.time ?? Date.now();
		work.lastEvent = { type: event.type, at };
		switch (event.type) {
			case "turn/start": {
				work.status = "running";
				work.runningSince = at;
				break;
			}
			case "turn/end": {
				const wasRunning = work.status === "running";
				work.status = "idle";
				work.runningSince = null;
				if (wasRunning) {
					work.doneAt = at;
					work.doneCount += 1;
				}
				break;
			}
			case "tool/call": {
				const d = event.data ?? {};
				work.lastTool = { name: d.name ?? "unknown", at };
				break;
			}
			case "tool/result": {
				const d = event.data ?? {};
				if (d.error) {
					work.lastToolError = { name: d.error.name ?? "error", code: d.error.code ?? "", at };
				}
				break;
			}
			case "todo/write": {
				const d = event.data ?? {};
				const list = Array.isArray(d.todos) ? d.todos : [];
				const done = list.filter((t) => t && (t.status === "done" || t.done)).length;
				work.todos = { total: list.length, done, summary: list.map((t) => t?.content ?? "").filter(Boolean).slice(0, 3) };
				break;
			}
			case "goal/change": {
				const d = event.data ?? {};
				work.goal = { state: d.state ?? d.status ?? "active", reason: d.reason ?? d.blocked_reason ?? null };
				break;
			}
			case "approval/asked": {
				const d = event.data ?? {};
				work.waitingApproval = { toolName: d.toolName ?? d.tool ?? "tool", reason: d.reason ?? null, at };
				break;
			}
			case "approval/decided": {
				work.waitingApproval = null;
				break;
			}
			case "command/run": {
				const d = event.data ?? {};
				work.command = { name: d.name ?? "command", running: true, at };
				break;
			}
			case "command/done": {
				if (work.command) work.command.running = false;
				break;
			}
		}
	});

	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/balance",
		handler: async (_req, res) => {
			const write = (payload) => {
				const body = JSON.stringify(payload);
				res.writeHead(200, {
					"Content-Type": "application/json; charset=utf-8",
					"Cache-Control": "no-store"
				});
				res.end(body);
			};
			const now = Date.now();
			if (cache !== null && now - cache.at < CACHE_TTL_MS) {
				write(cache.payload);
				return;
			}
			try {
				const credentials = ctx.get("credentials");
				const hit = credentials ? await credentials.resolve(credentialRef("DEEPSEEK_API_KEY")) : void 0;
				if (!hit?.value) {
					write({ ok: false, error: "missing-api-key" });
					return;
				}
				const response = await fetch(BALANCE_URL, {
					headers: { Authorization: `Bearer ${hit.value}` },
					signal: AbortSignal.timeout(15000)
				});
				const data = await response.json();
				const payload = { ok: true, ...data };
				cache = { payload, at: Date.now() };
				write(payload);
			} catch (error) {
				// Fall back to the last known balance instead of failing the badge.
				if (cache !== null) {
					write({ ...cache.payload, ok: true, stale: true });
					return;
				}
				write({ ok: false, error: String(error?.message ?? error) });
			}
		}
	}), "balance-widget: /api/balance route");

	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/status",
		handler: (_req, res) => {
			const body = JSON.stringify({ ok: true, ...work });
			res.writeHead(200, {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "no-store"
			});
			res.end(body);
		}
	}), "balance-widget: /api/status route");

	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/pet.html",
		handler: (_req, res) => {
			const html = readFileSync(new URL("./pet.html", import.meta.url), "utf8");
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(html);
		}
	}), "balance-widget: /pet.html route");
}

export { apply, inject, name };
