// Reactive access to engine data for widget components.
import { createSignal, onCleanup, type Accessor } from "solid-js";
import { host, on, widgetInfo } from "./host";

// ── system metrics ────────────────────────────────────────────────────
export type Metric = "system" | "cpu" | "memory" | "battery" | "drives" | "processes" | "network";

export interface SystemSnapshot {
  system?: { hostname: string; os: string; uptime: number };
  cpu?: { usage: number; cores: number };
  memory?: { total: number; available: number; used: number; load: number };
  battery?: {
    hasBattery: boolean;
    charging?: boolean;
    level?: number;
    remainingSeconds?: number;
    powerSource?: "ac" | "battery";
    saver?: boolean;
  };
  drives?: { name: string; label: string; total: number; free: number; used: number }[];
  processes?: { name: string; pid: number; memory: number }[];
  network?: { rxPerSec: number; txPerSec: number };
}

const [snapshot, setSnapshot] = createSignal<SystemSnapshot>({}, { equals: false });
const subscriptions = new Map<number, { metrics: Metric[]; interval: number }>();
let nextSub = 1;

function resubscribe() {
  const metrics = new Set<Metric>();
  let interval = Infinity;
  for (const s of subscriptions.values()) {
    s.metrics.forEach((m) => metrics.add(m));
    interval = Math.min(interval, s.interval);
  }
  host.subscribe(JSON.stringify([...metrics]), Number.isFinite(interval) ? interval : 2000);
}

on("system", (data: SystemSnapshot) => setSnapshot((prev) => ({ ...prev, ...data })));

/**
 * Subscribes to system metrics. The engine only samples what some widget asked for,
 * at the fastest interval requested (minimum 1 s). Declare the matching
 * `system.<metric>` permissions in `vitrine.json` (`system.info` for the `system`
 * metric: host name, Windows version, uptime).
 */
export function useSystem(metrics: Metric[], intervalMs = 2000): Accessor<SystemSnapshot> {
  const id = nextSub++;
  subscriptions.set(id, { metrics, interval: Math.max(1000, intervalMs) });
  resubscribe();
  onCleanup(() => {
    subscriptions.delete(id);
    resubscribe();
  });
  return snapshot;
}

// ── settings ──────────────────────────────────────────────────────────
function readSettings(): Record<string, unknown> {
  try {
    return JSON.parse(host.settings());
  } catch {
    return {};
  }
}
const [settingsSignal, setSettings] = createSignal(readSettings());
on("settings", (data: Record<string, unknown>) => setSettings(data ?? {}));

/** The instance settings (edited in the control panel), merged over `defaults`. Updates live. */
export function useSettings<T extends Record<string, unknown>>(defaults: T): Accessor<T> {
  return () => ({ ...defaults, ...settingsSignal() }) as T;
}

// ── size ──────────────────────────────────────────────────────────────
export interface Size {
  width: number;
  height: number;
}
function readSize(): Size {
  try {
    return JSON.parse(host.size());
  } catch {
    return { width: 0, height: 0 };
  }
}
const [size, setSize] = createSignal<Size>(readSize());
on("resize", (s: Size) => setSize(s));

/** The widget's size in DIPs (it changes when the user resizes it on the grid). */
export function useSize(): Accessor<Size> {
  return size;
}

// ── clock ─────────────────────────────────────────────────────────────
/**
 * The current time, refreshed on every second or minute boundary. Minute
 * granularity wakes the engine 60× less often: prefer it when seconds aren't shown.
 */
export function useClock(granularity: "second" | "minute" = "minute"): Accessor<Date> {
  const unit = granularity === "second" ? 1000 : 60_000;
  const [now, setNow] = createSignal(new Date(), { equals: false });
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => {
    const t = Date.now();
    setNow(new Date(t));
    timer = setTimeout(tick, unit - (t % unit) + 5);
  };
  timer = setTimeout(tick, unit - (Date.now() % unit) + 5);
  onCleanup(() => clearTimeout(timer));
  return now;
}

// ── storage ───────────────────────────────────────────────────────────
let storageCache: Record<string, string> | null = null;
function storageMap(): Record<string, string> {
  if (!storageCache) {
    try {
      storageCache = JSON.parse(host.storage());
    } catch {
      storageCache = {};
    }
  }
  return storageCache!;
}

/** A value persisted per widget instance (survives restarts). Must be JSON-serializable. */
export function useStorage<T>(key: string, initial: T): [Accessor<T>, (v: T) => void] {
  const raw = storageMap()[key];
  let start = initial;
  if (raw !== undefined) {
    try {
      start = JSON.parse(raw);
    } catch {
      /* keep initial */
    }
  }
  const [value, setValue] = createSignal<T>(start);
  const set = (v: T) => {
    setValue(() => v);
    const json = JSON.stringify(v);
    storageMap()[key] = json;
    host.storageSet(key, json);
  };
  return [value, set];
}

/** Opens an http(s) URL in the default browser (only from a user interaction). */
export function openUrl(url: string) {
  host.openUrl(url);
}

// ── prompt ────────────────────────────────────────────────────────────
export interface PromptOptions {
  /** Dialog heading, e.g. "New task". */
  title?: string;
  placeholder?: string;
  /** Initial text (when editing). */
  value?: string;
}

let promptSeq = 0;
const pendingPrompts = new Map<number, (value: string | null) => void>();
on("prompt", (d: { id: number; value: string | null }) => {
  const resolve = pendingPrompts.get(d.id);
  if (resolve) {
    pendingPrompts.delete(d.id);
    resolve(typeof d.value === "string" ? d.value : null);
  }
});

/**
 * Asks the user for a line of text in a small dialog next to the widget
 * (widgets never get keyboard focus). Resolves to `null` when cancelled or when
 * the engine has no prompt support. Call it from a click handler.
 */
export function prompt(options: PromptOptions = {}): Promise<string | null> {
  if (typeof host.prompt !== "function") return Promise.resolve(null);
  const id = ++promptSeq;
  return new Promise((resolve) => {
    pendingPrompts.set(id, resolve);
    host.prompt!(id, JSON.stringify(options));
  });
}

// ── appearance ────────────────────────────────────────────────────────
export interface Appearance {
  /** Windows "app mode" is dark. */
  dark: boolean;
  /** The user's accent colour, `#rrggbb`. */
  accent: string;
}

const readAppearance = (): Appearance => {
  try {
    return { dark: true, accent: "#0078d4", ...JSON.parse(host.appearance()) };
  } catch {
    return { dark: true, accent: "#0078d4" };
  }
};
const [appearance, setAppearance] = createSignal<Appearance>(readAppearance());
on("appearance", (a: Appearance) => setAppearance({ ...appearance(), ...a }));

/** Windows light/dark mode and accent colour, updated live when the user changes them. */
export function useAppearance(): Accessor<Appearance> {
  return appearance;
}

// ── language ──────────────────────────────────────────────────────────

/**
 * Vitrine's UI language (`"en"`, `"it"`, `"pt-BR"`, `"zh"`, …), as chosen in the control panel or
 * Windows. Widgets restart when it changes, so it is a plain value.
 */
export function useLanguage(): string {
  return widgetInfo().language;
}

/**
 * Picks the text for the UI language from a table keyed by language tag, e.g.
 * `localized({ en: "Today", it: "Oggi", "pt-BR": "Hoje" })`. Falls back to the same language
 * (`pt` for `pt-BR`, `zh-CN` for `zh`), then to `en`, then to the first entry.
 */
export function localized<T>(texts: Record<string, T>, language = useLanguage()): T {
  const norm = (tag: string) => {
    const t = tag.toLowerCase().replace(/_/g, "-");
    if (t.startsWith("zh")) return /-(hant|tw|hk|mo)\b/.test(t) ? "zh-hant" : "zh";
    return t;
  };
  const base = (tag: string) => tag.split("-")[0];
  const want = norm(language);
  const keys = Object.keys(texts);
  const key =
    keys.find((k) => norm(k) === want) ??
    keys.find((k) => base(norm(k)) === base(want) && (norm(k) === "zh-hant") === (want === "zh-hant")) ??
    keys.find((k) => norm(k) === "en") ??
    keys[0];
  return texts[key];
}
