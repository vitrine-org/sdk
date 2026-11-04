import { formatDate, mount, useClock, useSettings } from "@vitrine/sdk";

function Clock() {
  const settings = useSettings({ accent: "#60CDFF", showSeconds: false });
  const now = useClock(settings().showSeconds ? "second" : "minute");

  return (
    <view
      style={{
        width: "100%",
        height: "100%",
        padding: 20,
        borderRadius: 12,
        justifyContent: "center",
        flexDirection: "column",
        background: "rgba(32, 32, 32, 0.55)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        color: "#ffffff",
        fontFamily: "Segoe UI Variable Display",
      }}
    >
      <text style={{ fontSize: 44, fontWeight: 600, lineHeight: 1, textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
        {formatDate(now(), "HH")}
        <span style={{ color: settings().accent }}>{formatDate(now(), settings().showSeconds ? ":mm:ss" : ":mm")}</span>
      </text>
      <text style={{ fontSize: 14, marginTop: 6, opacity: 0.7 }}>{formatDate(now(), "dddd D MMMM")}</text>
    </view>
  );
}

mount(() => <Clock />);
