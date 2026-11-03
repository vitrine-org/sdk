// Web-like globals that QuickJS does not provide: timers, console, fetch.
import { errorText, host, on } from "./host";

const g = globalThis as any;

// ── timers ────────────────────────────────────────────────────────────
interface Timer {
  fn: (...args: any[]) => void;
  args: any[];
  repeat: boolean;
}
let nextTimer = 1;
const timers = new Map<number, Timer>();

on("timer", (id: number) => {
  const t = timers.get(id);
  if (!t) return;
  if (!t.repeat) timers.delete(id);
  t.fn(...t.args);
});

function startTimer(fn: any, ms: any, args: any[], repeat: boolean): number {
  if (typeof fn !== "function") throw new TypeError("timer callback must be a function");
  const id = nextTimer++;
  timers.set(id, { fn, args, repeat });
  host.setTimer(id, Math.max(0, Number(ms) || 0), repeat);
  return id;
}

function stopTimer(id: any) {
  if (timers.delete(id)) host.clearTimer(id);
}

g.setTimeout = (fn: any, ms?: number, ...args: any[]) => startTimer(fn, ms, args, false);
g.setInterval = (fn: any, ms?: number, ...args: any[]) => startTimer(fn, Math.max(1, Number(ms) || 1), args, true);
g.clearTimeout = stopTimer;
g.clearInterval = stopTimer;
if (typeof g.queueMicrotask !== "function") {
  g.queueMicrotask = (fn: () => void) => Promise.resolve().then(fn);
}

// ── console ───────────────────────────────────────────────────────────
function show(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Error) return errorText(v);
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}
const log = (level: "debug" | "info" | "warn" | "error") => (...args: unknown[]) =>
  host.log(level, args.map(show).join(" "));
g.console = { log: log("info"), info: log("info"), debug: log("debug"), warn: log("warn"), error: log("error") };

// ── fetch ─────────────────────────────────────────────────────────────
interface FetchResult {
  id: number;
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  error?: string;
}
let nextFetch = 1;
const pending = new Map<number, { resolve: (r: any) => void; reject: (e: Error) => void }>();

on("fetch", (r: FetchResult) => {
  const p = pending.get(r.id);
  if (!p) return;
  pending.delete(r.id);
  if (r.error) {
    p.reject(new TypeError(r.error));
    return;
  }
  const body = r.body ?? "";
  const headers = new Map(Object.entries(r.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  p.resolve({
    ok: !!r.ok,
    status: r.status ?? 0,
    statusText: r.statusText ?? "",
    url: "",
    headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null, has: (k: string) => headers.has(k.toLowerCase()) },
    text: async () => body,
    json: async () => JSON.parse(body),
  });
});

g.fetch = (input: string | { url: string }, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) =>
  new Promise((resolve, reject) => {
    const id = nextFetch++;
    pending.set(id, { resolve, reject });
    const url = typeof input === "string" ? input : input.url;
    host.fetch(id, url, init.method ?? "GET", JSON.stringify(init.headers ?? {}), init.body);
  });
