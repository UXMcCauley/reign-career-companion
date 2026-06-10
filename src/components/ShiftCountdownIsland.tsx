import { useEffect, useRef, useState } from "react";
import { MapPin, Clock, Navigation2, Footprints } from "lucide-react";
import "./ShiftCountdownIsland.css";

// --- Geo helpers ---------------------------------------------------------

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readSafeAreaTop(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--ion-safe-area-top");
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

const METERS_TO_FEET = 3.28084;
const WALK_FPS = 4.4;

// --- Hardware island geometry (iPhone 14 Pro+) ---------------------------
// why this matters: the sensor housing physically occludes ~125px in the
// center of the pill — content there is invisible. Collapsed layout must
// split into two "ears" around a dead zone, exactly like iOS Live Activities.
const ISLAND_TOP_PX = 11;
const ISLAND_HEIGHT_PX = 37;
const ISLAND_HW_WIDTH_PX = 125;
const ISLAND_INSET_THRESHOLD = 59; // island devices report safe-area-top >= 59

// --- Test overrides (env vars) -------------------------------------------

const TEST_FORCE_SHOW  = import.meta.env.VITE_SHIFT_TEST === "true";
const TEST_MINUTES_RAW = parseFloat(import.meta.env.VITE_SHIFT_TEST_MINUTES ?? "");
const TEST_MINUTES     = Number.isFinite(TEST_MINUTES_RAW) ? TEST_MINUTES_RAW : 8;
const TEST_DIST_RAW    = parseFloat(import.meta.env.VITE_SHIFT_TEST_DISTANCE_FT ?? "");
const TEST_DIST_FT     = Number.isFinite(TEST_DIST_RAW) ? TEST_DIST_RAW : null;

// --- Mock data -----------------------------------------------------------

const PROJECT_SITE = { name: "Forstner Building", lat: 37.7749, lng: -122.4194, edgeRadiusFt: 150 };
const MOCK_POSITION = { lat: 37.77714, lng: -122.4194 };
const SHIFT_EMPLOYEE = "Connor McManus";

// --- Utils ---------------------------------------------------------------



function fmtCountdown(ms: number): string {
  if (ms <= 0) return "NOW";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

function fmtWalk(secs: number): string {
  if (secs < 60) return `< 1 min`;
  return `~${Math.ceil(secs / 60)} min`;
}

// --- Component -----------------------------------------------------------

export function ShiftCountdownIsland() {
  // why this matters: lazy initializer instead of module-level mutation —
  // render stays pure, StrictMode double-render can't skew the target time
  const [shiftStartMs] = useState(() => Date.now() + TEST_MINUTES * 60 * 1000);
  const [insetTop] = useState(readSafeAreaTop);
  const hasIsland = insetTop >= ISLAND_INSET_THRESHOLD;

  const [now, setNow] = useState(Date.now);
  const [position, setPosition] = useState<{ lat: number; lng: number }>(MOCK_POSITION);
  const [usingGps, setUsingGps] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => { setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setUsingGps(true); },
      () => undefined,
      { enableHighAccuracy: true }
    );
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  const msUntilShift = shiftStartMs - now;
  const minutesUntil = msUntilShift / 60_000;
  const inWindow = minutesUntil <= 10 && msUntilShift > -60_000;
  if (!TEST_FORCE_SHOW && !inWindow) return null;

  const feetFromEdge = TEST_DIST_FT !== null
    ? Math.max(0, Math.round(TEST_DIST_FT))
    : Math.max(0, Math.round(
        haversineMeters(position.lat, position.lng, PROJECT_SITE.lat, PROJECT_SITE.lng)
          * METERS_TO_FEET - PROJECT_SITE.edgeRadiusFt
      ));
  const walkSecs = feetFromEdge / WALK_FPS;
  const walkMins = walkSecs / 60;
  const willMakeIt = walkMins < minutesUntil;

  const urgency = minutesUntil <= 2 ? "red" : minutesUntil <= 5 ? "amber" : "teal";
  const colours = {
    red:   { glow: "rgba(239,68,68,0.55)",  ring: "#ef4444", text: "#fca5a5", bg: "rgba(127,29,29,0.35)" },
    amber: { glow: "rgba(251,191,36,0.45)", ring: "#fbbf24", text: "#fde68a", bg: "rgba(120,53,15,0.35)" },
    teal:  { glow: "rgba(45,212,191,0.35)", ring: "#2dd4bf", text: "#99f6e4", bg: "rgba(15,52,52,0.35)"  },
  }[urgency];

  const startStr = new Date(shiftStartMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  // seated = visually fused with the hardware island. Only meaningful when
  // collapsed on an island device; expanded state grows downward from the
  // same anchor and the hardware only occludes the top strip.
  const seated = hasIsland && !expanded;

  const row: React.CSSProperties = { display: "flex", alignItems: "center" };
  const col: React.CSSProperties = { display: "flex", flexDirection: "column" };
  const chip: React.CSSProperties = {
    ...row, gap: 8, padding: "10px 12px", borderRadius: 10,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
  };

  return (
    <div style={{
      position: "fixed",
      // why this matters: island devices → anchor AT the hardware (y=11) so the
      // pill fuses with it; notch/no-cutout devices → sit below the safe area
      // (faking an island where there isn't one reads as a rendering bug)
      top: hasIsland ? ISLAND_TOP_PX : `calc(${insetTop}px + 6px)`,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 10000, // above the expanded map overlay (9999)
      userSelect: "none",
      // why this matters: any glow while seated outlines the hardware cutout
      // and kills the "one black object" illusion
      filter: seated ? "none" : `drop-shadow(0 0 14px ${colours.glow})`,
      transition: "filter 0.3s ease",
    }}>
      <div
        style={{
          overflow: "hidden",
          transition: "border-radius 0.5s ease-in-out, width 0.5s ease-in-out, min-width 0.5s ease-in-out, background 0.3s ease, border-color 0.3s ease",
          borderRadius: expanded ? 18 : 9999,
          width: expanded ? "min(340px, calc(100vw - 24px))" : "auto",
          minWidth: expanded ? "min(340px, calc(100vw - 24px))" : 0,
          // why this matters: seated must be PURE #000 with no blur — the
          // hardware is true black, and translucency exposes the seam
          background: seated ? "#000" : "rgba(8, 8, 12, 0.92)",
          backdropFilter: seated ? "none" : "blur(20px)",
          WebkitBackdropFilter: seated ? "none" : "blur(20px)",
          border: seated ? "1.5px solid #000" : `1.5px solid ${colours.ring}55`,
          boxShadow: seated ? "none" : `0 0 0 1px ${colours.ring}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(x => !x)}
      >
        {/* ── Pill ── */}
        <div style={{
          ...row, gap: 10, padding: "0 16px",
          height: expanded ? 52 : seated ? ISLAND_HEIGHT_PX : 44,
          transition: "height 0.4s ease",
        }}>
          {/* Left ear: pulsing dot + countdown */}
          <span style={{ position: "relative", ...row, height: 10, width: 10, flexShrink: 0 }}>
            <span className="sci-ping" style={{
              position: "absolute", display: "inline-flex",
              height: "100%", width: "100%", borderRadius: "50%",
              opacity: 0.6, background: colours.ring,
            }} />
            <span style={{
              position: "relative", display: "inline-flex",
              borderRadius: "50%", height: 10, width: 10, background: colours.ring,
            }} />
          </span>

          <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontWeight: 700, color: colours.text }}>
            {fmtCountdown(msUntilShift)}
          </span>

          {/* Hardware dead zone: the camera housing occludes these pixels.
              Spacer pushes content into the visible "ears" on either side. */}
          {seated ? (
            <span aria-hidden style={{ width: ISLAND_HW_WIDTH_PX, flexShrink: 0 }} />
          ) : (
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>|</span>
          )}

          {/* Right ear: distance */}
          <span style={{ ...row, gap: 4, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>
            <MapPin size={12} style={{ color: colours.ring }} />
            {feetFromEdge.toLocaleString()} ft
          </span>

          {/* Walk time — only when there's room (not seated, not expanded) */}
          {!expanded && !seated && (
            <span style={{ ...row, gap: 4, fontSize: 11, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
              <Footprints size={11} style={{ opacity: 0.6 }} />
              {fmtWalk(walkSecs)}
            </span>
          )}
        </div>

        {/* ── Expanded ── */}
        {expanded && (
          <div style={{ ...col, gap: 12, padding: "0 16px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>

            {/* Header */}
            <div style={{ ...row, justifyContent: "space-between", paddingTop: 12 }}>
              <div style={{ ...col, gap: 2 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Upcoming shift</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{SHIFT_EMPLOYEE}</span>
              </div>
              <div style={{ ...row, gap: 6, padding: "4px 10px", borderRadius: 9999, background: colours.bg, border: `1px solid ${colours.ring}44` }}>
                <Clock size={12} style={{ color: colours.ring }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: colours.text }}>{startStr}</span>
              </div>
            </div>

            {/* Site */}
            <div style={{ ...chip, gap: 8 }}>
              <Navigation2 size={14} style={{ color: colours.ring }} />
              <div style={{ ...col, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {PROJECT_SITE.name}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  {usingGps ? "Live GPS" : "Estimated position"}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ ...chip, ...col, gap: 2 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>From edge</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: colours.text }}>
                  {feetFromEdge.toLocaleString()}
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 4 }}>ft</span>
                </span>
              </div>
              <div style={{ ...chip, ...col, gap: 2 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Walk time</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: willMakeIt ? "#4ade80" : "#f87171" }}>
                  {fmtWalk(walkSecs)}
                </span>
              </div>
            </div>

            {/* Status banner */}
            <div style={{
              ...row, gap: 8, padding: "8px 12px", borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              background: willMakeIt ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
              border: `1px solid ${willMakeIt ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
              color: willMakeIt ? "#4ade80" : "#f87171",
            }}>
              {willMakeIt
                ? `On track — ${fmtWalk(walkSecs)} walk, ${fmtCountdown(msUntilShift)} remaining`
                : `Hustle — ${fmtWalk(walkSecs)} walk but only ${fmtCountdown(msUntilShift)} left`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}