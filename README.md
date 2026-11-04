# @vitrine/sdk

Build widgets for [Vitrine](https://github.com/vitrine-org/vitrine) with JSX and SolidJS.

```sh
npx github:vitrine-org/sdk create my-widgets --id=dev.you.widgets
cd my-widgets && npm install
npm run pack        # → widgets-1.0.0.vitrine
```

A **package** (`vitrine.json` + sources) contains one or more widgets. Each widget is a TSX entry that
calls `mount()`:

```tsx
import { formatDate, mount, useClock } from "@vitrine/sdk";

function Clock() {
  const now = useClock("minute");
  return (
    <view style={{ padding: 16, borderRadius: 12, background: "rgba(32,32,32,0.55)" }}>
      <text style={{ fontSize: 40, color: "#fff" }}>{formatDate(now(), "HH:mm")}</text>
    </view>
  );
}

mount(() => <Clock />);
```

## Elements

`view` (flex/grid box), `text` / `span` (styled text, `br` for line breaks), `image`, and `svg` with
`g`, `circle`, `ellipse`, `rect`, `line`, `path`. Styles are camelCase and CSS-like: flexbox, grid,
padding, borders, radii, gradients, box and text shadows, transforms, transitions on numeric values, fonts.
`backdropFilter: "blur(16px) saturate(1.6)"` gives a box real frosted glass over the desktop wallpaper.
As in CSS, a `view` lays out its children in a row by default (`flexDirection: "column"` to stack
them) and children may shrink: give fixed-size decorations such as dividers `flexShrink: 0`.

## APIs

| API | Purpose |
|---|---|
| `mount(() => <App/>)` | Render the widget |
| `useClock("second" \| "minute")` | Time signal aligned to second/minute boundaries |
| `useSystem(["cpu", "memory", …], ms)` | System metrics (declare `system.<metric>` permissions) |
| `useSettings(defaults)` | Instance settings from the control panel, updated live |
| `useSize()` | Widget size in DIPs |
| `useAppearance()` | Windows light/dark mode and accent colour, live |
| `useStorage(key, initial)` | Value persisted per widget instance |
| `useLanguage()`, `localized({ en, it, … })` | Vitrine's UI language, and the text for it from a table |
| `formatDate(date, "dddd D MMMM")`, `formatTime`, `localeInfo` | Locale-aware formatting (QuickJS has no `Intl`) |
| `fetch(url)` | HTTP to hosts declared as `net:<host>` permissions |
| `openUrl(url)` | Open a link from a user interaction |
| `onClick`, `onPointerEnter`, `onWheel`, … | Pointer events (set `"interactive": true` on the widget) |

## Localisation

Vitrine speaks English, Italiano, Français, Deutsch, Español, Português (Brasil), 简体中文, Русский,
日本語 and 한국어. Packs can follow it; every localised field is optional and falls back to the
English text, and engines that don't know a field ignore it.

**Names and descriptions**: a `locales` object in `vitrine.json`, by language tag:

```json
"locales": {
  "it": { "name": "Essenziali", "description": "…",
          "widgets": { "clock": { "name": "Orologio", "description": "Ora e data" } } },
  "zh-CN": { "widgets": { "clock": { "name": "时钟" } } }
}
```

**Settings**: next to each text in a widget's settings schema, a map by language tag:
`titles` (section), `labels` and `descriptions` (setting), `patternMessages`, and `labels` on options.

```json
{ "title": "Clock", "titles": { "it": "Orologio" }, "settings": {
  "seconds": { "type": "boolean", "label": "Show seconds", "labels": { "it": "Mostra i secondi" } },
  "unit": { "type": "string", "default": "c", "label": "Unit", "labels": { "de": "Einheit" },
    "options": [ { "value": "c", "label": "Celsius" },
                 { "value": "f", "label": "Fahrenheit", "labels": { "it": "Fahrenheit (°F)" } } ] }
} }
```

Tags are matched loosely: `pt` serves `pt-BR`, `zh`, `zh-CN` and `zh-Hans` serve Simplified
Chinese (`zh-TW` / `zh-Hant` never do), `de-AT` serves `de`. `vitrine-widget build` checks the
`locales` tags and widget ids; Vitrine validates every map when it loads the pack.

**Inside the widget**, `useLanguage()` returns the UI language and `localized()` picks from a table:

```tsx
const today = localized({ en: "Today", it: "Oggi", de: "Heute", ja: "今日" });
```

Dates and times keep following the Windows regional format through `formatDate` and `localeInfo`.

## CLI

```
vitrine-widget create <folder> [--id=dev.you.pack]
vitrine-widget build | pack | dev [folder]
```

Preview a widget without installing it: `vitrine render dist <widget-id> --cells 4x2 --out shot.png`.

## License

MIT
