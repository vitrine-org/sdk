// Reactive access to engine data for widget components.
import { createSignal, onCleanup, type Accessor } from "solid-js";
import { host, on } from "./host";

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
 * `system.<metric>` permissions in `vitrine.json`.
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
