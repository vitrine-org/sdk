// @vitrine/sdk — build Vitrine widgets with JSX and SolidJS.
import "./polyfills";
import type { JSX } from "./types";
import { flush, render as renderInto, root } from "./renderer";

export { formatDate, formatTime, localeInfo, type LocaleInfo } from "./format";
export {
  localized,
  openUrl,
  prompt,
  useAppearance,
  useClock,
  useLanguage,
  useSettings,
  useSize,
  useStorage,
  useSystem,
  type Appearance,
  type Metric,
  type PromptOptions,
  type Size,
  type SystemSnapshot,
} from "./hooks";
export { on, widgetInfo, type WidgetInfo } from "./host";
export type { PointerEventData } from "./renderer";
export * from "./types";

/** Mounts the widget. Call once from the widget entry: `mount(() => <Clock />)`. */
export function mount(app: () => JSX.Element): void {
  renderInto(app, root);
  flush();
}

/** Formats a byte count as `1.2 GB`, `340 MB`, … */
export function formatBytes(bytes: number, digits = 1): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : digits)} ${units[i]}`;
}
