// Bridge to the Vitrine engine. The engine installs `__vitrine` and calls
// `__vitrine_event(type, json)`; everything else in the SDK builds on this file.

export interface HostApi {
  ops(json: string): void;
  setTimer(id: number, delayMs: number, repeat?: boolean): void;
  clearTimer(id: number): void;
  subscribe(metricsJson: string, intervalMs?: number): void;
  fetch(id: number, url: string, method?: string, headersJson?: string, body?: string): void;
  log(level: "debug" | "info" | "warn" | "error", message: string): void;
  settings(): string;
  storage(): string;
  storageSet(key: string, value?: string): void;
  size(): string;
  openUrl(url: string): void;
  /** Vitrine 2.0+: opens a text prompt; the answer arrives as a "prompt" event. */
  prompt?(id: number, optionsJson: string): void;
  localeInfo(locale?: string): string;
  appearance(): string;
  now(): number;
  info: string;
}

declare const __vitrine: HostApi | undefined;

/** A no-op host, used when the bundle runs outside the engine (tests, tooling). */
const detachedHost: HostApi = {
  ops() {},
  setTimer() {},
  clearTimer() {},
  subscribe() {},
  fetch() {},
  log(level, message) {
    (globalThis as any).print?.(`[${level}] ${message}`);
  },
  settings: () => "{}",
  storage: () => "{}",
  storageSet() {},
  size: () => '{"width":0,"height":0}',
  openUrl() {},
  localeInfo: () => "{}",
  appearance: () => '{"dark":true,"accent":"#0078d4"}',
  now: () => Date.now(),
  info: "{}",
};

export const host: HostApi = typeof __vitrine !== "undefined" ? __vitrine : detachedHost;

type Listener = (data: any) => void;
const listeners = new Map<string, Set<Listener>>();

/** Subscribes to an engine event. Returns an unsubscribe function. */
export function on(type: string, fn: Listener): () => void {
  let set = listeners.get(type);
  if (!set) listeners.set(type, (set = new Set()));
  set.add(fn);
  return () => set!.delete(fn);
}

(globalThis as any).__vitrine_event = (type: string, json: string) => {
  const set = listeners.get(type);
  if (!set || set.size === 0) return;
  let data: unknown = json;
  if (json !== "") {
    try {
      data = JSON.parse(json);
    } catch {
      data = json;
    }
  }
  for (const fn of [...set]) {
    try {
      fn(data);
    } catch (e) {
      host.log("error", `event "${type}" handler failed: ${errorText(e)}`);
    }
  }
};

export function errorText(e: unknown): string {
  if (e instanceof Error) return e.stack ? `${e.message}\n${e.stack}` : e.message;
  return String(e);
}

export interface WidgetInfo {
  instanceId: string;
  widgetId: string;
  packageId: string;
  engineVersion: string;
  /**
   * Vitrine's UI language: `"en"`, `"it"`, `"fr"`, `"de"`, `"es"`, `"pt-BR"`, `"zh"` (Simplified
   * Chinese), `"ru"`, `"ja"` or `"ko"`. `"en"` on engines that don't report it.
   */
  language: string;
}

/** Identity of the running widget instance. */
export function widgetInfo(): WidgetInfo {
  const empty = { instanceId: "", widgetId: "", packageId: "", engineVersion: "", language: "en" };
  try {
    const info = { ...empty, ...JSON.parse(host.info) };
    if (typeof info.language !== "string" || info.language === "") info.language = "en";
    return info;
  } catch {
    return empty;
  }
}
