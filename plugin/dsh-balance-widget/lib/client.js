window.__ModuleLoader__.load({
	id: "dsh-whale-pet",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		let react = require("react");
		if (typeof window !== "undefined") window.__dshBalanceLoaded = true;

		// Style tag: a small, unobtrusive pill matching the session-header chrome.
		const css = [
			".dshb-root{min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:3px;padding:3px 6px;font-size:12px;line-height:18px;display:inline-flex;font-variant-numeric:tabular-nums;white-space:nowrap}",
			".dshb-root:hover,.dshb-root:focus-visible{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}",
			".dshb-root[data-state=ok]{color:var(--dsw-alias-label-primary);font-weight:500}",
			".dshb-root[data-state=error]{color:var(--dsw-alias-state-danger-primary)}",
			".dshb-dot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-success-primary)}",
			".dshb-root[data-state=error] .dshb-dot{background:var(--dsw-alias-state-danger-primary)}",
			".dshb-root[data-state=loading] .dshb-dot{background:var(--dsw-alias-label-tertiary)}",
			".dshb-recharge{min-height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;padding:3px 6px;font-size:12px;line-height:18px;display:inline-flex;text-decoration:none}",
			".dshb-recharge:hover,.dshb-recharge:focus-visible{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}"
		].join("\n");
		const tagId = "dsh-balance-widget/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"" + tagId + "\"]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-balance-widget";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		/**
		 * Balance pill in the session-header action strip.
		 * Polls the same-origin /api/balance proxy every minute; click to refresh.
		 * Background refreshes keep the last successful value on screen (no
		 * flicker to a grey "loading" state); only the very first load shows it.
		 */
		function BalanceBadge() {
			const [state, setState] = react.useState({ loading: true, data: null, error: null, stale: false });
			const refresh = react.useCallback(() => {
				setState((prev) => {
					if (prev.data !== null) return prev; // keep showing the last value while refreshing
					return { ...prev, loading: true };
				});
				fetch("/api/balance", { cache: "no-store" })
					.then((r) => r.json())
					.then((payload) => {
						if (payload && payload.ok === true) {
							setState({ loading: false, data: payload, error: null, stale: false });
						} else {
							setState((prev) => ({
								loading: false,
								data: prev.data,
								error: String(payload?.error ?? "failed"),
								stale: prev.data !== null
							}));
						}
					})
					.catch((err) => {
						setState((prev) => ({
							loading: false,
							data: prev.data,
							error: String(err),
							stale: prev.data !== null
						}));
					});
			}, []);
			react.useEffect(() => {
				refresh();
				const timer = setInterval(refresh, 60 * 1000);
				return () => clearInterval(timer);
			}, [refresh]);

			let label = "余额…";
			let title = "DeepSeek 账户余额（点击立即刷新）";
			let dataState = "loading";
			if (state.data) {
				const info = Array.isArray(state.data.balance_infos) ? state.data.balance_infos[0] : null;
				if (info && typeof info.total_balance === "string") {
					const currency = info.currency === "CNY" ? "¥" : (info.currency ? info.currency + " " : "");
					label = "余额 " + currency + info.total_balance;
					dataState = "ok";
					title = "DeepSeek 账户余额（点击立即刷新）" + (state.stale ? "；最近一次更新失败，显示上次余额" : "");
				} else {
					label = "余额不可用";
					title = "余额接口返回异常";
					dataState = "error";
				}
			} else if (state.loading) {
				title = "正在查询余额…（点击立即刷新）";
			} else {
				label = "余额不可用";
				title = "查询失败：" + (state.error ?? "未知错误") + "（点击重试）";
				dataState = "error";
			}
			return react.createElement(react.Fragment, null, [
				react.createElement("button", {
					key: "balance",
					type: "button",
					className: "dshb-root",
					"data-state": dataState,
					title,
					"aria-label": label,
					onClick: refresh,
					children: [
						react.createElement("span", { className: "dshb-dot", key: "dot" }),
						label
					]
				}),
				react.createElement("a", {
					key: "recharge",
					className: "dshb-recharge",
					href: "https://platform.deepseek.com/top_up",
					target: "_blank",
					rel: "noopener noreferrer",
					title: "打开 DeepSeek 开放平台充值页（https://platform.deepseek.com/top_up，登录后充值）",
					children: "充值"
				})
			]);
		}

		/** Required services for the header-slot contribution. */
		const inject = ["slots"];

		// ================= Web floating whale-girl pet =================
		// A small draggable panel (bottom-right) that loads /pet.html in an
		// iframe — the exact same pet page the desktop Electron window uses,
		// so animations / voice / interactions are reused verbatim.
		// =================================================================
		const webPetCss = [
			".dswp-root{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:200px;height:216px;border-radius:14px;background:transparent;box-shadow:0 6px 24px rgba(20,24,40,.25);opacity:.92;transition:opacity .2s ease}",
			".dswp-root:hover{opacity:1}",
			".dswp-root iframe{width:100%;height:100%;border:0;border-radius:14px;background:transparent;pointer-events:auto;position:relative;z-index:1}",
			".dswp-hide{position:absolute;top:-9px;right:-9px;width:22px;height:22px;border-radius:50%;background:rgba(31,42,68,.9);color:#fff;border:2px solid #fff;font-size:12px;line-height:18px;text-align:center;cursor:pointer;z-index:10;padding:0;box-shadow:0 2px 6px rgba(0,0,0,.3)}",
			".dswp-hide:hover{background:rgba(200,60,60,.95)}",
			".dswp-btn{position:fixed;right:14px;bottom:14px;z-index:2147483000;padding:6px 10px;border-radius:12px;border:0;cursor:pointer;background:rgba(31,42,68,.85);color:#fff;font-size:13px}"
		].join("\n");
		const webPetTagId = "dsh-balance-widget-webpet/styles";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"" + webPetTagId + "\"]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-balance-widget-webpet";
			tag.dataset.pluginCss = webPetTagId;
			tag.textContent = webPetCss;
			document.head.appendChild(tag);
		}

		function WebPet() {
			const [hidden, setHidden] = react.useState(false);
			const rootRef = react.useRef(null);
			react.useEffect(() => {
				if (typeof document === "undefined") return;
				const root = document.createElement("div");
				root.className = "dswp-root";
				root.innerHTML =
					'<button class="dswp-hide" title="隐藏桌宠">✕</button>' +
					'<iframe src="/pet.html" title="DeepSeek 鲸鱼娘桌宠" scrolling="no"></iframe>';
				document.body.appendChild(root);
				rootRef.current = root;
				const btn = root.querySelector(".dswp-hide");
				let dragStart = null;
				function onMsg(e) {
					const d = e.data;
					if (!d || d.type !== "dswp-drag") return;
					if (d.phase === "move") {
						if (!dragStart) dragStart = { ox: root.offsetLeft, oy: root.offsetTop, sx: d.dx, sy: d.dy };
						const nx = dragStart.ox + (d.dx - dragStart.sx);
						const ny = dragStart.oy + (d.dy - dragStart.sy);
						root.style.left = Math.max(0, Math.min(window.innerWidth - root.offsetWidth, nx)) + "px";
						root.style.top = Math.max(0, Math.min(window.innerHeight - root.offsetHeight, ny)) + "px";
						root.style.right = "auto";
						root.style.bottom = "auto";
					} else if (d.phase === "end") {
						dragStart = null;
					}
				}
				window.addEventListener("message", onMsg);
				btn.addEventListener("click", (e) => { e.stopPropagation(); setHidden(true); });
				return () => {
					window.removeEventListener("message", onMsg);
					root.remove();
					rootRef.current = null;
				};
			}, []);
			// sync the manually-created root's visibility with the hidden state
			react.useEffect(() => {
				if (rootRef.current) rootRef.current.style.display = hidden ? "none" : "";
			}, [hidden]);
			if (hidden) {
				return react.createElement("button", {
					className: "dswp-btn",
					title: "显示鲸鱼娘桌宠",
					onClick: () => setHidden(false)
				}, "🐋");
			}
			return react.createElement("div", null);
		}
/** Client plugin body: register the balance pill in the session header. */
		function apply(ctx) {
			if (typeof window !== "undefined") {
				try {
					window.__dshBalanceApplied = true;
					window.__dshBalanceInjectTarget = "conversation.session.header.actions";
					window.__dshBalanceHasSlots = !!ctx && !!ctx.slots;
				} catch {}
			}
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "balance-widget",
				order: 10
			}, BalanceBadge));
			// web floating pet: register into shell.overlay when available
			try {
				if (ctx.slots && typeof ctx.slots.inject === "function") {
					ctx.slots.inject("shell.overlay", () => ctx.slots.register({
						name: "shell.overlay",
						id: "dsh-balance-widget-webpet",
						order: 1000
					}, WebPet));
				}
			} catch (e) {
				try { window.__dshWebPetError = String(e && e.message || e); } catch (e2) {}
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
