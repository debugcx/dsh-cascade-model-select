/**
 * dsh-cascade-model-select — browser half.
 *
 * A two-level (provider -> model) cascade replacement for the composer model
 * seat (`conversation.input.model`) and the /model popup. The root menu lists
 * provider groups; each provider opens a submenu with exactly its own models,
 * instead of one long flat list with sticky provider headings.
 *
 * Data rides a per-session directory over the same Host contracts the built-in
 * selector uses: remote.session.modelCatalog() for the shared catalog, the
 * session's "modelSelection" projection face for the durable selection, and
 * remote.session.selectModel() to submit a complete provider/model/effort
 * selection.
 *
 * This file is a hand-written client-module bundle: executing it only
 * registers the factory; module side effects run at materialization.
 */
window.__ModuleLoader__.load({
	id: "dsh-cascade-model-select",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const React = require("react");
		const ReactDOM = require("react-dom");
		const cordis = require("@deepseek-ai/cordis");
		const { createSnapshotStore } = require("@deepseek-ai/dsh-client-store");
		const ui = require("@deepseek-ai/dsh-client-ui-primitives");

		const h = React.createElement;
		const { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } = React;

		//#region styles
		const CSS_TAG_ID = "dsh-cascade-model-select/cascade.css";
		const css = `
.dshcms-root{min-width:0;position:relative}
.dshcms-trigger{border-radius:var(--dsw-radius-sm);min-width:0;max-width:min(360px,45cqw);height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;outline:none;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:400;line-height:20px;display:flex}
.dshcms-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dshcms-trigger:focus-visible:not([data-selection-focus]){box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}
.dshcms-trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
.dshcms-triggerLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}
.dshcms-triggerEffort{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-caption);flex-shrink:1000;overflow:hidden}
.dshcms-triggerIcon{display:var(--dsh-composer-model-icon-display,none);flex:none}
.dshcms-triggerLabel,.dshcms-triggerEffort{display:var(--dsh-composer-model-text-display,block)}
.dshcms-chevron{color:var(--dsw-alias-label-caption);flex:none;transition:transform .12s}
.dshcms-chevronOpen{transform:rotate(180deg)}
.dshcms-menu{z-index:1100;--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:max-content;min-width:min(230px,calc(100vw - 32px));max-width:min(340px,calc(100vw - 32px));max-height:min(360px,calc(100vh - 96px));box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border:0;flex-direction:column;padding:4px;display:flex;position:fixed;overflow:hidden}
.dshcms-submenu{min-width:min(250px,calc(100vw - 32px));max-width:min(430px,calc(100vw - 32px))}
.dshcms-list{overflow-y:auto;min-height:0;overscroll-behavior:contain}
.dshcms-row{border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;outline:none;align-items:center;gap:6px;padding:5px 8px;font-size:13px;font-weight:400;line-height:20px;display:flex;width:100%;text-align:left}
.dshcms-row:hover:not(:disabled),.dshcms-row:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}
.dshcms-row[data-open]{background:var(--dsw-alias-interactive-bg-hover)}
.dshcms-row:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
.dshcms-rowMain{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden;flex:1}
.dshcms-rowValue{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-caption);font-size:12px;flex-shrink:10;overflow:hidden}
.dshcms-rowChevron{color:var(--dsw-alias-label-caption);flex:none;display:inline-flex}
.dshcms-check{color:var(--dsw-alias-state-business-primary);width:18px;flex:none;display:inline-flex;justify-content:center}
.dshcms-check:empty{visibility:hidden}
.dshcms-divider{border-top:1px solid var(--dsw-alias-border-l1);margin:4px 2px;flex:none}
.dshcms-searchRow{padding:2px 2px 6px;display:flex;align-items:center;gap:4px;flex:none}
.dshcms-search{flex:1;min-width:0}
.dshcms-searchClear{border:none;background:0 0;color:var(--dsw-alias-label-caption);cursor:pointer;padding:2px;display:inline-flex;border-radius:var(--dsw-radius-sm)}
.dshcms-searchClear:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshcms-status,.dshcms-empty{color:var(--dsw-alias-label-tertiary);padding:8px;font-size:12px;line-height:18px}
.dshcms-error,.dshcms-warning{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary);justify-content:space-between;align-items:center;gap:8px;padding:6px 8px;font-size:12px;line-height:18px;display:flex;margin:2px 0}
.dshcms-warning{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dshcms-retry{border:none;background:0 0;color:var(--dsw-alias-state-business-primary);cursor:pointer;font-size:12px;padding:2px 4px;border-radius:var(--dsw-radius-sm);flex:none}
.dshcms-retry:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshcms-option[data-highlighted]{background:var(--dsw-alias-interactive-bg-hover)}
`;
		function injectCss() {
			if (typeof document === "undefined") return () => {};
			let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG_ID) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = "dsh-cascade-model-select";
				tag.dataset.pluginCss = CSS_TAG_ID;
				tag.textContent = css;
				document.head.appendChild(tag);
				return () => tag.remove();
			}
			return () => {};
		}
		//#endregion

		//#region locales
		/** Dictionary namespace owned by this plugin. */
		const NS = "cascadeModel";
		const zh = {
			"provider.account": "DeepSeek 账号",
			"command.label": "模型",
			"command.description": "选择本会话使用的模型",
			"option.loadError": "目录加载失败：{message}",
			"trigger.fallback": "请选择模型",
			"trigger.loading": "正在加载模型…",
			"trigger.selectAria": "请选择模型",
			"trigger.aria": "选择模型，当前 {model}",
			"trigger.ariaEffort": "选择模型，当前 {model}，推理等级 {effort}",
			"menu.aria": "模型与推理等级",
			"menu.providers": "厂家列表",
			"menu.effort": "推理等级",
			"menu.providerAria": "{name} 的模型",
			"provider.count": "{count} 个模型",
			"effort.providerDefault": "Default",
			"status.loading": "正在刷新模型列表…",
			"error.action": "模型操作失败：{message}",
			"error.sessionInUse": "当前会话已被占用，可能是其他正在运行的 DSH 导致的（如其他 dsh web、桌面端），请退出其他正在运行的 DSH 后重试。",
			"action.reload": "重新加载",
			"warning.groupLoad": "{name} 加载失败：{message}",
			"search.placeholder": "搜索模型…",
			"search.providerPlaceholder": "搜索 {name} 的模型…",
			"search.clear": "清除搜索",
			"search.empty": "没有匹配的模型。",
			"empty.models": "暂无可用模型",
			"empty.efforts": "当前模型未提供推理等级。"
		};
		const en = {
			"provider.account": "DeepSeek Account",
			"command.label": "Model",
			"command.description": "Select the model for this conversation",
			"option.loadError": "Catalog failed to load: {message}",
			"trigger.fallback": "Select model",
			"trigger.loading": "Loading models…",
			"trigger.selectAria": "Select model",
			"trigger.aria": "Select model, current {model}",
			"trigger.ariaEffort": "Select model, current {model}, reasoning effort {effort}",
			"menu.aria": "Model and reasoning effort",
			"menu.providers": "Providers",
			"menu.effort": "Effort",
			"menu.providerAria": "{name} models",
			"provider.count": "{count} models",
			"effort.providerDefault": "Default",
			"status.loading": "Refreshing model list…",
			"error.action": "Model operation failed: {message}",
			"error.sessionInUse": "This session is already in use, possibly by another running DSH instance (such as dsh web or the desktop app). Quit other running DSH instances and try again.",
			"action.reload": "Reload",
			"warning.groupLoad": "{name} failed to load: {message}",
			"search.placeholder": "Search models…",
			"search.providerPlaceholder": "Search {name} models…",
			"search.clear": "Clear search",
			"search.empty": "No matching models.",
			"empty.models": "No models available.",
			"empty.efforts": "This model provides no reasoning effort levels."
		};
		//#endregion

		//#region provider order
		/** Account and official providers first; every other group keeps catalog order. */
		function orderModelProviders(groups) {
			return groups.toSorted((left, right) => (left.id === "deepseek-account" ? 0 : left.id === "deepseek-official" ? 1 : 2) - (right.id === "deepseek-account" ? 0 : right.id === "deepseek-official" ? 1 : 2));
		}
		//#endregion

		//#region catalog
		/** One Host-generation model catalog shared by every Session selector. */
		class ModelCatalogDirectory {
			ctx;
			store = createSnapshotStore({ value: null, status: "idle", error: null });
			reasoning = new Map();
			generation = 0;
			inflight;
			constructor(ctx) {
				this.ctx = ctx;
			}
			reasoningFor(selection) {
				return this.reasoning.get(JSON.stringify([selection.provider, selection.model]));
			}
			load() {
				const state = this.store.getSnapshot();
				if (state.status === "ready" && state.value !== null) return Promise.resolve(state.value);
				if (this.inflight !== void 0) return this.inflight;
				const generation = this.generation;
				this.store.update((draft) => {
					draft.status = "loading";
					draft.error = null;
				});
				const operation = this.ctx.remote.session.modelCatalog().then((response) => {
					if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
					if (generation === this.generation) {
						for (const group of response.value.groups) for (const model of group.models) this.reasoning.set(JSON.stringify([group.id, model.id]), model.reasoning);
						this.store.set({ value: response.value, status: "ready", error: null });
					}
					return response.value;
				}).catch((error) => {
					if (generation === this.generation) this.store.update((draft) => {
						draft.status = "error";
						draft.error = error instanceof Error ? error.message : String(error);
					});
					throw error;
				}).finally(() => {
					if (generation === this.generation && this.inflight === operation) this.inflight = void 0;
				});
				this.inflight = operation;
				return operation;
			}
			invalidate(clear = false) {
				this.generation += 1;
				this.inflight = void 0;
				const value = clear ? null : this.store.getSnapshot().value;
				this.store.set({ value, status: "idle", error: null });
			}
			refresh() {
				this.invalidate();
				this.load().catch(() => {});
			}
			resetGeneration() {
				this.reasoning.clear();
				this.invalidate(true);
				this.load().catch(() => {});
			}
		}
		//#endregion

		//#region session directory
		/** One session's shared directory controller; disposed with the session scope. */
		class SessionModelDirectory {
			sessions;
			sessionId;
			available;
			catalog;
			projected;
			isBlank;
			track;
			store = createSnapshotStore({
				current: null,
				routable: null,
				groups: [],
				failures: [],
				status: "idle",
				pending: null,
				error: null
			});
			generation = 0;
			disposed = false;
			unsubscribeCatalog;
			unsubscribeSelection;
			constructor(sessions, sessionId, available, catalog, projected, isBlank, track) {
				this.sessions = sessions;
				this.sessionId = sessionId;
				this.available = available;
				this.catalog = catalog;
				this.projected = projected;
				this.isBlank = isBlank;
				this.track = track;
				this.unsubscribeCatalog = catalog.store.subscribe(() => this.syncInputs());
				this.unsubscribeSelection = projected.subscribe(() => this.syncInputs());
				this.syncInputs();
			}
			async load() {
				this.assertAvailable();
				await this.catalog.load();
				this.syncInputs();
				return this.store.getSnapshot();
			}
			async select(selection) {
				this.assertAvailable();
				const previous = this.store.getSnapshot().current;
				const previousEffort = previous?.reasoningEffort ?? (previous === null ? void 0 : this.catalog.reasoningFor(previous)?.defaultEffort);
				const nextEffort = selection.reasoningEffort ?? this.catalog.reasoningFor(selection)?.defaultEffort;
				const generation = ++this.generation;
				this.store.update((s) => {
					s.status = "selecting";
					s.pending = selection;
					s.error = null;
				});
				const result = await this.sessions.selectModel({
					sessionId: this.sessionId,
					provider: selection.provider,
					model: selection.model,
					...selection.reasoningEffort === void 0 ? {} : { reasoningEffort: selection.reasoningEffort }
				});
				if (this.disposed || generation !== this.generation) return result.ok ? { ok: true, value: void 0 } : result;
				if (!result.ok) {
					this.store.update((s) => {
						s.status = "error";
						s.pending = null;
						s.error = `${result.error.code}: ${result.error.message}`;
					});
					return result;
				}
				if (previous !== null) {
					const from = `${previous.provider}/${previous.model}`;
					const to = `${selection.provider}/${selection.model}`;
					if (from !== to) this.track?.("model_switch", {
						...this.isBlank() ? {} : { session_id: this.sessionId },
						switch_from: from,
						switch_to: to
					});
					if (from === to && previousEffort !== nextEffort) this.track?.("thinking_level_switch", {
						...this.isBlank() ? {} : { session_id: this.sessionId },
						model_name: to,
						switch_from: previousEffort ?? "default",
						switch_to: nextEffort ?? "default"
					});
				}
				this.store.update((s) => {
					s.status = "ready";
					s.pending = null;
					s.error = null;
				});
				this.syncInputs();
				return { ok: true, value: void 0 };
			}
			resetConnected() {
				if (this.disposed) return;
				++this.generation;
				this.store.update((state) => {
					if (state.status === "selecting") state.status = "idle";
					state.pending = null;
					state.error = null;
				});
				this.syncInputs();
			}
			dispose() {
				this.disposed = true;
				this.unsubscribeSelection();
				this.unsubscribeCatalog();
			}
			assertAvailable() {
				if (!this.available()) throw new Error("model selection is unavailable for addressed subagent sessions");
			}
			syncInputs() {
				if (this.disposed) return;
				const catalog = this.catalog.store.getSnapshot();
				const projected = this.projected.getSnapshot();
				const intended = projected?.next ?? catalog.value?.default;
				const reasoning = intended === void 0 ? void 0 : this.catalog.reasoningFor(intended);
				const effort = intended?.reasoningEffort ?? reasoning?.defaultEffort;
				const retainedEffort = effort === void 0 ? void 0 : reasoning?.efforts.find((level) => level.id === effort)?.name ?? effort;
				if (catalog.status !== "ready" || catalog.value === null || projected === void 0) {
					this.store.set({
						current: catalog.value === null ? null : this.store.getSnapshot().current,
						...retainedEffort === void 0 ? {} : { retainedEffort },
						routable: null,
						groups: catalog.value?.groups ?? [],
						failures: catalog.value?.failures ?? [],
						status: catalog.status === "error" ? "error" : "loading",
						pending: this.store.getSnapshot().pending,
						error: catalog.error
					});
					return;
				}
				const selection = projected.next ?? catalog.value.default;
				const routable = catalog.value.groups.some((group) => group.id === selection.provider && group.models.some((model) => model.id === selection.model));
				this.store.set({
					current: selection,
					...retainedEffort === void 0 ? {} : { retainedEffort },
					routable,
					groups: catalog.value.groups,
					failures: catalog.value.failures,
					status: this.store.getSnapshot().status === "selecting" ? "selecting" : "ready",
					pending: this.store.getSnapshot().pending,
					error: null
				});
			}
		}
		//#endregion

		//#region resolver service
		/** The `ctx.cascadeModelDirectories` session model-selection service. */
		class CascadeModelDirectoryResolver extends cordis.Service {
			static inject = ["sessions", "remote", "remote.session"];
			live = { directories: new Map() };
			catalog;
			constructor(ctx) {
				super(ctx, "cascadeModelDirectories");
				this.catalog = new ModelCatalogDirectory(ctx);
				this.catalog.load().catch(() => {});
				ctx.on("connection/reset", () => {
					this.catalog.resetGeneration();
					for (const directory of this.live.directories.values()) directory.resetConnected();
				});
				ctx.remote.$on("llm/adapters-updated", () => this.catalog.refresh());
				ctx.remote.$on("settings/document-updated", () => this.catalog.refresh());
				ctx.remote.$on("credentials/record-updated", () => this.catalog.refresh());
				ctx.remote.$on("credentials/reference-updated", () => this.catalog.refresh());
			}
			directoryFor(sessionId) {
				const { live } = this;
				const sessions = this.ctx.sessions;
				const actx = sessions.scope(sessionId);
				if (actx === void 0) throw new Error(`cascade-model-select: session "${String(sessionId)}" resolved no scope`);
				const binding = sessions.binding(sessionId);
				if (binding === void 0) throw new Error(`cascade-model-select: session "${String(sessionId)}" resolved no binding`);
				const existing = live.directories.get(sessionId);
				if (existing !== void 0) return existing;
				const directory = new SessionModelDirectory(
					this.ctx.remote.session,
					sessionId,
					() => sessions.subagentAddress(sessionId) === void 0,
					this.catalog,
					binding.session.projections.faceOf("modelSelection"),
					() => binding.session.getSnapshot().blank,
					(name, attributes) => this.ctx.get("productAnalytics")?.track(name, attributes)
				);
				live.directories.set(sessionId, directory);
				actx.effect(() => () => {
					directory.dispose();
					live.directories.delete(sessionId);
				}, "cascade-model-select: session directory");
				return directory;
			}
		}
		//#endregion

		//#region cascade component
		const MEASURE_STYLE = { visibility: "hidden", left: 0, top: 0 };
		const OPEN_DELAY = 60;
		const CLOSE_DELAY = 220;
		const SEARCH_THRESHOLD = 6;

		/**
		 * The composer model seat, cascade edition: the root menu lists providers
		 * (plus the Effort row); hovering or opening a provider shows its models in
		 * a second-level submenu; the Effort row drills into the effort list inside
		 * the root menu, like the built-in selector.
		 */
		function CascadeModelSelect({ locked, available, directory, load, select, t, renderSlot }) {
			const state = useSyncExternalStore((fn) => directory.subscribe(fn), () => directory.getSnapshot());
			const [open, setOpen] = useState(false);
			const [pane, setPane] = useState("root"); // "root" | "effort"
			const [activeProvider, setActiveProvider] = useState(null);
			const [query, setQuery] = useState("");
			const [highlightedIndex, setHighlightedIndex] = useState(null);
			const [selectionFocus, setSelectionFocus] = useState(false);
			const lastActionRef = useRef("load");
			const [toast, setToast] = useState(null);
			const toastSeq = useRef(0);
			const rootRef = useRef(null);
			const triggerRef = useRef(null);
			const menuRef = useRef(null);
			const subRef = useRef(null);
			const searchRef = useRef(null);
			const [menuPos, setMenuPos] = useState(null);
			const [subPos, setSubPos] = useState(null);
			const providerRowRefs = useRef(new Map());
			const openTimer = useRef(0);
			const closeTimer = useRef(0);
			const focusIntent = useRef(null); // null | {kind:"submenu"} | {kind:"effort"} | {kind:"provider", id}
			const id = useId();
			const accountProviderName = t("provider.account");

			const groups = useMemo(() => orderModelProviders(state.groups).map((group) => ({
				...group,
				provider: { id: group.id, name: group.id === "deepseek-account" ? accountProviderName : group.name }
			})), [state.groups, accountProviderName]);
			const choices = useMemo(() => groups.flatMap((group) => group.models.map((model) => ({ group, model }))), [groups]);
			const currentChoice = state.current === null ? void 0 : choices.find((c) => c.group.id === state.current.provider && c.model.id === state.current.model);
			const reasoning = currentChoice?.model.reasoning;
			const effectiveEffort = state.current?.reasoningEffort ?? reasoning?.defaultEffort;
			const effortLabel = currentChoice === void 0 ? void 0 : reasoning === void 0 ? state.retainedEffort : effectiveEffort === void 0 ? t("effort.providerDefault") : reasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
			const effortChoices = useMemo(() => reasoning === void 0 ? [] : [
				...reasoning.defaultEffort === void 0 ? [{ key: "provider-default", effort: void 0, label: t("effort.providerDefault") }] : [],
				...reasoning.efforts.map((effort) => ({ key: `effort:${effort.id}`, effort: effort.id, label: effort.name }))
			], [reasoning, t]);
			const { pending } = state;
			const busy = pending !== null;

			const activeGroup = activeProvider === null ? void 0 : groups.find((group) => group.id === activeProvider);
			const subSearch = activeGroup !== void 0 && activeGroup.models.length > SEARCH_THRESHOLD;
			const subModels = useMemo(() => {
				if (activeGroup === void 0) return [];
				return ui.rankByName(activeGroup.models, subSearch ? query.trim() : "");
			}, [activeGroup, query, subSearch]);
			const currentSubIndex = subModels.findIndex((model) => state.current?.provider === activeProvider && state.current.model === model.id);
			const activeSubIndex = Math.min(highlightedIndex ?? Math.max(0, currentSubIndex), subModels.length - 1);

			const clearTimers = () => {
				window.clearTimeout(openTimer.current);
				window.clearTimeout(closeTimer.current);
			};
			const scheduleOpenProvider = (providerId) => {
				clearTimers();
				// Switching submenus uses a longer delay so diagonal pointer travel
				// across sibling provider rows does not flicker through them.
				const delay = activeProvider === null ? OPEN_DELAY : 300;
				openTimer.current = window.setTimeout(() => {
					setActiveProvider(providerId);
					setQuery("");
					setHighlightedIndex(null);
				}, delay);
			};
			const scheduleCloseSub = () => {
				window.clearTimeout(openTimer.current);
				window.clearTimeout(closeTimer.current);
				closeTimer.current = window.setTimeout(() => {
					setActiveProvider(null);
					setQuery("");
					setHighlightedIndex(null);
				}, CLOSE_DELAY);
			};
			const cancelCloseSub = () => {
				window.clearTimeout(closeTimer.current);
			};

			const reload = () => {
				lastActionRef.current = "load";
				load();
			};

			// Close on outside press.
			useEffect(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (rootRef.current?.contains(event.target) === true) return;
					if (menuRef.current?.contains(event.target) === true) return;
					if (subRef.current?.contains(event.target) === true) return;
					setOpen(false);
				};
				document.addEventListener("mousedown", closeOutside);
				return () => document.removeEventListener("mousedown", closeOutside);
			}, [open]);
			// Release timers with the seat.
			useEffect(() => () => clearTimers(), []);
			// Reset submenu state when the menu closes or the provider list changes underneath.
			useEffect(() => {
				if (!open) {
					clearTimers();
					setActiveProvider(null);
					setQuery("");
					setHighlightedIndex(null);
					setPane("root");
				}
			}, [open]);
			useEffect(() => {
				if (activeProvider !== null && activeGroup === void 0) setActiveProvider(null);
			}, [activeProvider, activeGroup]);

			// Focus management after open / pane / provider transitions.
			useEffect(() => {
				const intent = focusIntent.current;
				focusIntent.current = null;
				if (!open || intent === null) return;
				if (intent.kind === "submenu") {
					if (subSearch) {
						searchRef.current?.focus();
						return;
					}
					(subRef.current?.querySelector("[role=\"menuitemradio\"][aria-checked=\"true\"]:not([disabled])") ?? subRef.current?.querySelector("[role=\"menuitemradio\"]:not([disabled])"))?.focus();
					return;
				}
				if (intent.kind === "effort") {
					(menuRef.current?.querySelector("[role=\"menuitemradio\"][aria-checked=\"true\"]:not([disabled])") ?? menuRef.current?.querySelector("[role=\"menuitemradio\"]:not([disabled])"))?.focus();
					return;
				}
				if (intent.kind === "provider") {
					(providerRowRefs.current.get(intent.id) ?? triggerRef.current)?.focus();
				}
			}, [open, pane, activeProvider, subSearch]);

			const subRowNodes = (index) => subRef.current?.querySelectorAll("[role=\"menuitemradio\"]")[index];
			// Keep the highlighted model visible while keyboard-navigating the submenu.
			useLayoutEffect(() => {
				if (!open || activeProvider === null || activeSubIndex < 0) return;
				subRowNodes(activeSubIndex)?.scrollIntoView({ block: "nearest" });
			}, [open, activeProvider, activeSubIndex, subModels]);

			// Position the root menu above the trigger.
			useLayoutEffect(() => {
				if (!available || !open) {
					setMenuPos(null);
					return;
				}
				const place = () => {
					const rect = triggerRef.current?.getBoundingClientRect();
					if (rect === void 0) return;
					const MARGIN = 12;
					const lw = menuRef.current?.offsetWidth ?? 0;
					const lh = menuRef.current?.offsetHeight ?? 0;
					let x = rect.right - lw;
					let y = rect.top - 8 - lh;
					if (lw > 0) x = Math.min(Math.max(x, MARGIN), window.innerWidth - lw - MARGIN);
					if (lh > 0) y = Math.min(Math.max(y, MARGIN), window.innerHeight - lh - MARGIN);
					setMenuPos({ left: x, top: y });
				};
				place();
				window.addEventListener("scroll", place, true);
				window.addEventListener("resize", place);
				const menu = menuRef.current;
				const observer = typeof ResizeObserver !== "undefined" && menu !== null ? new ResizeObserver(place) : null;
				if (menu !== null) observer?.observe(menu);
				return () => {
					observer?.disconnect();
					window.removeEventListener("scroll", place, true);
					window.removeEventListener("resize", place);
				};
			}, [available, open, pane, activeProvider, state, query]);

			// Position the provider submenu beside the root menu, aligned to its row.
			useLayoutEffect(() => {
				if (!open || activeProvider === null) {
					setSubPos(null);
					return;
				}
				const place = () => {
					const menuRect = menuRef.current?.getBoundingClientRect();
					const rowRect = providerRowRefs.current.get(activeProvider)?.getBoundingClientRect();
					if (menuRect === void 0 || rowRect === void 0) return;
					const MARGIN = 8;
					const sw = subRef.current?.offsetWidth ?? 0;
					const sh = subRef.current?.offsetHeight ?? 0;
					let x = menuRect.right - 2;
					if (sw > 0 && x + sw > window.innerWidth - MARGIN) x = Math.max(MARGIN, menuRect.left + 2 - sw);
					let y = rowRect.top - 5;
					if (sh > 0) y = Math.min(y, window.innerHeight - sh - MARGIN);
					y = Math.max(y, MARGIN);
					setSubPos({ left: x, top: y });
				};
				place();
				window.addEventListener("scroll", place, true);
				window.addEventListener("resize", place);
				const sub = subRef.current;
				const observer = typeof ResizeObserver !== "undefined" && sub !== null ? new ResizeObserver(place) : null;
				if (sub !== null) observer?.observe(sub);
				return () => {
					observer?.disconnect();
					window.removeEventListener("scroll", place, true);
					window.removeEventListener("resize", place);
				};
			}, [open, activeProvider, subModels.length, query, state]);

			if (!available) return null;

			const show = () => {
				setSelectionFocus(false);
				triggerRef.current?.focus();
				setPane("root");
				setOpen(true);
				reload();
			};
			const close = (restoreFocus = false) => {
				setOpen(false);
				if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
			};
			const closeAfterSelection = () => {
				setSelectionFocus(true);
				close(true);
			};
			const openProviderNow = (providerId, withFocus) => {
				clearTimers();
				setPane("root");
				setQuery("");
				setHighlightedIndex(null);
				if (withFocus) focusIntent.current = { kind: "submenu" };
				setActiveProvider(providerId);
			};
			const closeSubmenu = (focusProvider) => {
				clearTimers();
				if (focusProvider) focusIntent.current = { kind: "provider", id: activeProvider };
				setActiveProvider(null);
				setQuery("");
				setHighlightedIndex(null);
			};
			const drillEffort = () => {
				clearTimers();
				setActiveProvider(null);
				setQuery("");
				focusIntent.current = { kind: "effort" };
				setPane("effort");
			};

			const settleSelection = (result) => {
				if (result === void 0) return;
				if (result.ok) {
					if (rootRef.current !== null) closeAfterSelection();
					return;
				}
				const { error } = result;
				toastSeq.current += 1;
				setToast({
					seq: toastSeq.current,
					text: error.code === "session/writer-held" ? t("error.sessionInUse") : t("error.action", { message: `${error.code}: ${error.message}` })
				});
			};
			const submit = (selection) => {
				lastActionRef.current = "select";
				setSelectionFocus(true);
				triggerRef.current?.focus();
				select(selection).then(settleSelection);
			};
			const choose = (providerId, modelId) => {
				if (state.current?.provider === providerId && state.current.model === modelId) {
					closeAfterSelection();
					return;
				}
				submit({ provider: providerId, model: modelId });
			};
			const chooseEffort = (effort) => {
				if (state.current === null) return;
				if (effectiveEffort === effort) {
					closeAfterSelection();
					return;
				}
				submit({
					provider: state.current.provider,
					model: state.current.model,
					...effort === void 0 ? {} : { reasoningEffort: effort }
				});
			};

			/** Which visible row list currently owns DOM focus. */
			const focusZone = () => {
				const active = document.activeElement;
				if (subRef.current?.contains(active) === true) return "submenu";
				if (menuRef.current?.contains(active) === true) return "root";
				return null;
			};
			const rowList = (zone) => {
				const root = zone === "submenu" ? subRef.current : menuRef.current;
				if (root == null) return [];
				return Array.from(root.querySelectorAll("button[role=\"menuitem\"], button[role=\"menuitemradio\"]")).filter((node) => !node.disabled);
			};
			const moveFocus = (offset) => {
				const zone = focusZone() ?? "root";
				const items = rowList(zone);
				if (items.length === 0) return;
				const at = items.indexOf(document.activeElement);
				items[at === -1 ? (offset > 0 ? 0 : items.length - 1) : (at + offset + items.length) % items.length]?.focus();
			};

			const onRootKeyDown = (event) => {
				if (event.nativeEvent.isComposing) return;
				if (event.key === "Escape" && open) {
					event.preventDefault();
					if (activeProvider !== null && focusZone() === "submenu") closeSubmenu(true);
					else if (activeProvider !== null) closeSubmenu(false);
					else if (pane !== "root") setPane("root");
					else close(true);
					return;
				}
				if (!open) return;
				const inSearch = event.target instanceof HTMLInputElement;
				if (event.key === "ArrowDown" || event.key === "ArrowUp") {
					event.preventDefault();
					const delta = event.key === "ArrowDown" ? 1 : -1;
					if (inSearch && subSearch) {
						if (!busy && subModels.length > 0) setHighlightedIndex((activeSubIndex + delta + subModels.length) % subModels.length);
						return;
					}
					moveFocus(delta);
					return;
				}
				if (event.key === "ArrowRight") {
					const active = document.activeElement;
					const providerId = active instanceof HTMLButtonElement ? active.dataset.providerId : void 0;
					if (providerId !== void 0 && providerId !== activeProvider) {
						event.preventDefault();
						openProviderNow(providerId, true);
					}
					return;
				}
				if (event.key === "ArrowLeft") {
					if (activeProvider !== null && (focusZone() === "submenu" || inSearch)) {
						event.preventDefault();
						closeSubmenu(true);
					}
					return;
				}
				if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) {
					if (inSearch) {
						if (event.key === "Tab" && subModels.length === 0) return;
						event.preventDefault();
						const highlighted = subModels[activeSubIndex];
						if (!busy && highlighted !== void 0 && activeGroup !== void 0) choose(activeGroup.id, highlighted.id);
						return;
					}
					const focused = document.activeElement;
					if (event.key === "Tab" && focused === triggerRef.current) {
						// Tab from the trigger hands focus to the root menu (current provider first).
						event.preventDefault();
						const rows = rowList("root");
						const currentRow = state.current === null ? void 0 : providerRowRefs.current.get(state.current.provider);
						(currentRow !== void 0 && rows.includes(currentRow) ? currentRow : rows[0])?.focus();
						return;
					}
					if (focused instanceof HTMLButtonElement && (menuRef.current?.contains(focused) === true || subRef.current?.contains(focused) === true)) {
						event.preventDefault();
						focused.click();
					}
					return;
				}
				if (event.key === "Tab" && event.shiftKey) {
					event.preventDefault();
					if (activeProvider !== null) closeSubmenu(true);
					else if (pane !== "root") setPane("root");
					else close(true);
				}
			};
			const onBlur = (event) => {
				if (event.relatedTarget instanceof Node && (rootRef.current?.contains(event.relatedTarget) === true || menuRef.current?.contains(event.relatedTarget) === true || subRef.current?.contains(event.relatedTarget) === true)) return;
				close();
			};

			const waiting = currentChoice === void 0 && state.status === "loading";
			const modelLabel = waiting ? t("trigger.loading") : currentChoice?.model.name ?? t("trigger.fallback");
			const triggerLabel = effortLabel === void 0 ? modelLabel : `${modelLabel} · ${effortLabel}`;
			const triggerAria = waiting ? t("trigger.loading") : currentChoice === void 0 ? t("trigger.selectAria") : effortLabel === void 0 ? t("trigger.aria", { model: modelLabel }) : t("trigger.ariaEffort", { model: modelLabel, effort: effortLabel });
			const renderModelLabel = (provider, model, placement, selected) => h("span", {
				"data-provider-id": provider.id,
				"data-model-id": model.id
			}, renderSlot("conversation.input.model.label", { provider, model, placement, selected }, { fallback: model.name }));

			const chevron = busy
				? h(ui.StateDot, { state: "ongoing" })
				: h(ui.IconChevronDownOutlineRegular, { className: "dshcms-chevron" + (open ? " dshcms-chevronOpen" : "") });

			// ----- root menu rows -----
			const providerRow = (group) => {
				const owns = state.current?.provider === group.id;
				const isOpen = activeProvider === group.id;
				return h("button", {
					key: group.id,
					ref: (node) => {
						if (node === null) providerRowRefs.current.delete(group.id);
						else providerRowRefs.current.set(group.id, node);
					},
					type: "button",
					role: "menuitem",
					className: "dshcms-row",
					"data-provider-id": group.id,
					"data-open": isOpen ? "" : void 0,
					"aria-haspopup": "menu",
					"aria-expanded": isOpen,
					"aria-controls": isOpen ? `${id}-submenu` : void 0,
					disabled: busy,
					title: group.provider.name,
					onMouseEnter: () => {
						if (!isOpen) scheduleOpenProvider(group.id);
						else cancelCloseSub();
					},
					onClick: (event) => {
						if (isOpen) closeSubmenu(false);
						// Keyboard-issued clicks (detail 0) hand focus to the submenu.
						else openProviderNow(group.id, event.detail === 0);
					}
				},
					h("span", { className: "dshcms-check" }, owns ? h(ui.IconCheckOutlineRegular, {}) : null),
					h("span", { className: "dshcms-rowMain" }, group.provider.name),
					h("span", { className: "dshcms-rowValue" }, t("provider.count", { count: group.models.length })),
					h("span", { className: "dshcms-rowChevron" }, h(ui.IconChevronRightOutlineRegular, {}))
				);
			};
			const failureRow = (failure) => h("div", { key: failure.id, className: "dshcms-warning" },
				h("span", {}, t("warning.groupLoad", { name: failure.id === "deepseek-account" ? accountProviderName : failure.name, message: failure.message })),
				h("button", { type: "button", className: "dshcms-retry", onClick: reload }, t("action.reload"))
			);
			const effortRow = reasoning === void 0 ? null : h("button", {
				key: "effort",
				type: "button",
				role: "menuitem",
				className: "dshcms-row",
				disabled: busy,
				onMouseEnter: () => scheduleCloseSub(),
				onClick: drillEffort
			},
				h("span", { className: "dshcms-check" }),
				h("span", { className: "dshcms-rowMain" }, t("menu.effort")),
				h("span", { className: "dshcms-rowValue" }, effortLabel),
				h("span", { className: "dshcms-rowChevron" }, h(ui.IconChevronRightOutlineRegular, {}))
			);

			const rootMenuChildren = [];
			if (state.status === "loading") rootMenuChildren.push(h("div", { key: "loading", className: "dshcms-status" }, t("status.loading")));
			if (state.error !== null && lastActionRef.current === "load") rootMenuChildren.push(h("div", { key: "error", className: "dshcms-error" },
				h("span", {}, t("error.action", { message: state.error })),
				h("button", { type: "button", className: "dshcms-retry", onClick: reload }, t("action.reload"))
			));
			for (const failure of state.failures) rootMenuChildren.push(failureRow(failure));
			if (pane === "root") {
				if (effortRow !== null) {
					rootMenuChildren.push(effortRow);
					rootMenuChildren.push(h("div", { key: "divider", className: "dshcms-divider" }));
				}
				if (groups.length === 0 && state.status === "ready") rootMenuChildren.push(h("div", { key: "empty", className: "dshcms-empty", role: "status" }, t("empty.models")));
				for (const group of groups) rootMenuChildren.push(providerRow(group));
			} else {
				// effort pane (drilled inside the root menu)
				if (effortChoices.length === 0) rootMenuChildren.push(h("div", { key: "empty-effort", className: "dshcms-empty" }, t("empty.efforts")));
				else for (const level of effortChoices) {
					const selected = effectiveEffort === level.effort;
					rootMenuChildren.push(h("button", {
						key: level.key,
						type: "button",
						role: "menuitemradio",
						"aria-checked": selected,
						className: "dshcms-row dshcms-option",
						disabled: busy,
						onClick: () => chooseEffort(level.effort)
					},
						h("span", { className: "dshcms-check" }, pending !== null && pending.provider === state.current?.provider && pending.model === state.current.model && pending.reasoningEffort === level.effort ? h(ui.StateDot, { state: "ongoing" }) : selected ? h(ui.IconCheckOutlineRegular, {}) : null),
						h("span", { className: "dshcms-rowMain" }, level.label)
					));
				}
			}

			// ----- provider submenu -----
			const submenu = open && activeGroup !== void 0 && ReactDOM.createPortal(
				h(ui.MenuSurface, {
					ref: subRef,
					id: `${id}-submenu`,
					className: "dshcms-menu dshcms-submenu",
					style: subPos ?? MEASURE_STYLE,
					role: "menu",
					"aria-label": t("menu.providerAria", { name: activeGroup.provider.name }),
					"aria-busy": busy,
					onMouseEnter: cancelCloseSub,
					onMouseLeave: scheduleCloseSub
				},
					subSearch && h("div", { className: "dshcms-searchRow" },
						h(ui.Input, {
							ref: searchRef,
							className: "dshcms-search",
							type: "text",
							role: "searchbox",
							"aria-label": t("search.providerPlaceholder", { name: activeGroup.provider.name }),
							"aria-controls": `${id}-submodels`,
							"aria-activedescendant": activeSubIndex < 0 ? void 0 : `${id}-submodel-${activeSubIndex}`,
							placeholder: t("search.providerPlaceholder", { name: activeGroup.provider.name }),
							value: query,
							readOnly: busy,
							onChange: (event) => {
								setQuery(event.target.value);
								setHighlightedIndex(0);
							}
						}),
						query !== "" && h("button", {
							type: "button",
							className: "dshcms-searchClear",
							"aria-label": t("search.clear"),
							disabled: busy,
							onClick: () => {
								setQuery("");
								setHighlightedIndex(null);
								searchRef.current?.focus();
							}
						}, h(ui.IconCloseFillRegular, {}))
					),
					h("div", {
						id: `${id}-submodels`,
						className: "dshcms-list scrollable",
						role: "presentation",
						hidden: subModels.length === 0
					},
						subModels.map((model, index) => {
							const selected = state.current?.provider === activeGroup.id && state.current.model === model.id;
							return h("button", {
								key: model.id,
								type: "button",
								role: "menuitemradio",
								"aria-checked": selected,
								id: `${id}-submodel-${index}`,
								tabIndex: subSearch ? -1 : 0,
								"data-highlighted": index === activeSubIndex ? "" : void 0,
								className: "dshcms-row dshcms-option",
								title: model.name,
								disabled: busy,
								onFocus: () => setHighlightedIndex(index),
								onMouseMove: busy || index === activeSubIndex ? void 0 : () => {
									if (subSearch) setHighlightedIndex(index);
								},
								onClick: () => choose(activeGroup.id, model.id)
							},
								h("span", { className: "dshcms-rowMain" }, renderModelLabel(activeGroup.provider, model, "option", selected)),
								h("span", { className: "dshcms-check" },
									pending?.provider === activeGroup.id && pending.model === model.id
										? h(ui.StateDot, { state: "ongoing" })
										: selected ? h(ui.IconCheckOutlineRegular, {}) : null
								)
							);
						})
					),
					subModels.length === 0 && h("div", { className: "dshcms-empty", role: "status" }, t("search.empty"))
				),
				document.body
			);

			return h("div", {
				ref: rootRef,
				className: "dshcms-root",
				onKeyDown: onRootKeyDown,
				onBlur,
				onMouseDown: (event) => {
					if (event.target instanceof Element && event.target.closest("button") !== null) event.preventDefault();
				}
			},
				h("button", {
					ref: triggerRef,
					type: "button",
					className: "dshcms-trigger",
					"aria-label": triggerAria,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					"aria-controls": open ? `${id}-menu` : void 0,
					title: triggerLabel,
					"aria-busy": busy,
					"data-selection-focus": selectionFocus ? "" : void 0,
					onBlur: () => setSelectionFocus(false),
					disabled: locked,
					onClick: () => {
						if (open) close(true);
						else show();
					}
				},
					h(ui.IconDataOutlineRegular, { className: "dshcms-triggerIcon", size: 16 }),
					h("span", { className: "dshcms-triggerLabel" }, currentChoice === void 0 ? modelLabel : renderModelLabel(currentChoice.group.provider, currentChoice.model, "trigger", true)),
					effortLabel !== void 0 && h("span", { className: "dshcms-triggerEffort" }, effortLabel),
					chevron
				),
				open && ReactDOM.createPortal(
					h(ui.MenuSurface, {
						ref: menuRef,
						id: `${id}-menu`,
						className: "dshcms-menu",
						style: menuPos ?? MEASURE_STYLE,
						role: "menu",
						"aria-label": pane === "root" ? t("menu.providers") : t("menu.effort"),
						"aria-busy": state.status === "loading" || busy,
						onMouseLeave: () => {
							if (activeProvider !== null) scheduleCloseSub();
						}
					}, ...rootMenuChildren),
					document.body
				),
				submenu,
				toast !== null && h(ui.Toast, {
					key: toast.seq,
					text: toast.text,
					icon: h(ui.IconWarningOutlineRegular, {}),
					anchor: rootRef.current?.closest("[data-composer-card]") ?? null,
					onDone: () => setToast(null)
				})
			);
		}
		//#endregion

		//#region /model command rows
		function rowId(providerId, modelId) {
			return `${providerId}/${modelId}`;
		}
		function optionsOf(directory, t) {
			const rows = [];
			for (const group of orderModelProviders(directory.groups)) {
				const name = group.id === "deepseek-account" ? t("provider.account") : group.name;
				for (const model of group.models) rows.push({
					id: rowId(group.id, model.id),
					label: model.name,
					group: { name: group.id, label: name },
					...directory.current !== null && directory.current.provider === group.id && directory.current.model === model.id ? { active: true } : {}
				});
			}
			for (const failure of directory.failures) rows.push({
				id: `failure/${failure.id}`,
				label: failure.id === "deepseek-account" ? t("provider.account") : failure.name,
				detail: t("option.loadError", { message: failure.message })
			});
			return rows;
		}
		function selectionOf(state, id) {
			for (const group of state.groups) for (const model of group.models) {
				if (rowId(group.id, model.id) !== id) continue;
				const reasoningEffort = state.current?.provider === group.id && state.current.model === model.id ? state.current?.reasoningEffort ?? model.reasoning?.defaultEffort : model.reasoning?.defaultEffort;
				return {
					provider: group.id,
					model: model.id,
					...reasoningEffort === void 0 ? {} : { reasoningEffort }
				};
			}
		}
		//#endregion

		/** Required services: command registry, locale, sessions, slots, remote faces. */
		const inject = ["commandUi", "locale", "sessions", "slots", "remote", "remote.session"];

		/**
		 * Client plugin body: styles, dictionaries, the directory service, then the
		 * /model popup contribution and the composer model seat over that service.
		 */
		function apply(ctx) {
			ctx.effect(() => injectCss(), "cascade-model-select: styles");
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "cascade-model-select: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.plugin(CascadeModelDirectoryResolver);
			ctx.inject(["commandUi", "cascadeModelDirectories"], (scope) => {
				const command = scope.get("commandUi");
				if (command === void 0) return;
				const models = scope.cascadeModelDirectories;
				const sessions = scope.sessions;
				scope.effect(() => command.register({
					name: "model",
					label: () => t("command.label"),
					description: () => t("command.description"),
					icon: ui.IconDataOutlineRegular,
					available: (session) => sessions.subagentAddress(session.sessionId) === void 0,
					ui: {
						kind: "popupSelect",
						searchMode: "fuzzy-label",
						searchLabels: () => ({
							placeholder: t("search.placeholder"),
							empty: t("empty.models"),
							noResults: t("search.empty")
						}),
						options: async (session) => {
							if (sessions.subagentAddress(session.sessionId) !== void 0) throw new Error("model selection is unavailable for addressed subagent sessions");
							return optionsOf(await models.directoryFor(session.sessionId).load(), t);
						},
						onSelect: async (option, session) => {
							if (sessions.subagentAddress(session.sessionId) !== void 0) throw new Error("model selection is unavailable for addressed subagent sessions");
							const directory = models.directoryFor(session.sessionId);
							const selection = selectionOf(directory.store.getSnapshot(), option.id);
							if (selection === void 0) throw new Error("this provider's catalog failed to load — pick a model from a loaded group");
							const result = await directory.select(selection);
							if (!result.ok) {
								if (result.error.code === "session/writer-held") throw new Error(t("error.sessionInUse"));
								throw result.error;
							}
						}
					}
				}), "cascade-model-select: /model contribution");
			});
			ctx.inject(["slots", "cascadeModelDirectories"], (scope) => {
				const models = scope.cascadeModelDirectories;
				const sessions = scope.sessions;
				scope.slots.inject("conversation.input.model", () => scope.slots.register({
					name: "conversation.input.model",
					locale: NS,
					children: { "conversation.input.model.label": { kind: "single", scope: "session", inline: true } },
					inject: (sessionId) => {
						const directory = models.directoryFor(sessionId);
						const available = sessions.subagentAddress(sessionId) === void 0;
						return {
							available,
							directory: directory.store,
							load: () => {
								if (available) directory.load().catch(() => {});
							},
							select: (selection) => available ? directory.select(selection) : Promise.resolve(void 0)
						};
					}
				}, CascadeModelSelect));
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
