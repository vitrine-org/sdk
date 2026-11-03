# @vitrine/sdk

Build widgets for [Vitrine](https://github.com/vitrine-widgets/vitrine) with JSX and SolidJS.

```sh
npx github:vitrine-widgets/sdk create my-widgets --id=dev.you.widgets
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
padding, borders, radii, gradients, shadows, transforms, transitions on numeric values, fonts.
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
| `formatDate(date, "dddd D MMMM")`, `formatTime`, `localeInfo` | Locale-aware formatting (QuickJS has no `Intl`) |
| `fetch(url)` | HTTP to hosts declared as `net:<host>` permissions |
| `openUrl(url)` | Open a link from a user interaction |
| `onClick`, `onPointerEnter`, `onWheel`, … | Pointer events (set `"interactive": true` on the widget) |

## CLI

```
vitrine-widget create <folder> [--id=dev.you.pack]
vitrine-widget build | pack | dev [folder]
```

Preview a widget without installing it: `vitrine render dist <widget-id> --cells 4x2 --out shot.png`.

## License

MIT
