// Locale-aware date formatting (QuickJS has no Intl). Names come from Windows.
import { host } from "./host";

export interface LocaleInfo {
  locale: string;
  days: string[];
  daysShort: string[];
  months: string[];
  monthsShort: string[];
  am: string;
  pm: string;
  hour12: boolean;
  shortDate: string;
  firstDayOfWeek: number;
}

const FALLBACK: LocaleInfo = {
  locale: "en-US",
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  am: "AM",
  pm: "PM",
  hour12: true,
  shortDate: "M/d/yyyy",
  firstDayOfWeek: 0,
};

const cache = new Map<string, LocaleInfo>();

/** Day/month names and clock preferences for `locale` (default: the user's Windows locale). */
export function localeInfo(locale = ""): LocaleInfo {
  let info = cache.get(locale);
  if (!info) {
    try {
      const raw = JSON.parse(host.localeInfo(locale));
      info = raw && Array.isArray(raw.days) && raw.days[0] ? { ...FALLBACK, ...raw } : FALLBACK;
    } catch {
      info = FALLBACK;
    }
    cache.set(locale, info!);
  }
  return info!;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/**
 * Formats a date with tokens: `YYYY YY MMMM MMM MM M DD D dddd ddd HH H hh h mm m ss s A`.
 * Text in `[brackets]` is copied literally. Example: `format(now, "dddd, D MMMM")`.
 */
export function formatDate(date: Date | number, pattern: string, locale = ""): string {
  const d = typeof date === "number" ? new Date(date) : date;
  const l = localeInfo(locale);
  const h = d.getHours();
  const tokens: Record<string, () => string> = {
    YYYY: () => String(d.getFullYear()),
    YY: () => pad(d.getFullYear() % 100),
    MMMM: () => l.months[d.getMonth()],
    MMM: () => l.monthsShort[d.getMonth()],
    MM: () => pad(d.getMonth() + 1),
    M: () => String(d.getMonth() + 1),
    DD: () => pad(d.getDate()),
    D: () => String(d.getDate()),
    dddd: () => l.days[d.getDay()],
    ddd: () => l.daysShort[d.getDay()],
    HH: () => pad(h),
    H: () => String(h),
    hh: () => pad(h % 12 || 12),
    h: () => String(h % 12 || 12),
    mm: () => pad(d.getMinutes()),
    m: () => String(d.getMinutes()),
    ss: () => pad(d.getSeconds()),
    s: () => String(d.getSeconds()),
    A: () => (h < 12 ? l.am : l.pm),
  };
  return pattern.replace(/\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|A/g, (m, literal) =>
    literal !== undefined ? literal : tokens[m](),
  );
}

/** The time as `HH:mm` or `h:mm A`, following the user's 12/24-hour preference. */
export function formatTime(date: Date | number, locale = ""): string {
  return formatDate(date, localeInfo(locale).hour12 ? "h:mm A" : "HH:mm", locale);
}
