import { useEffect, useRef, useState } from "react";
import { MapPin, Clock, Navigation2, Footprints } from "lucide-react";

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

const METERS_TO_FEET = 3.28084;
const WALK_FPS = 4.4; // avg walking speed, feet/sec

// --- Test overrides (env vars) -------------------------------------------

const TEST_FORCE_SHOW  = import.meta.env.VITE_SHIFT_TEST === "true";
const TEST_MINUTES_RAW = parseFloat(import.meta.env.VITE_SHIFT_TEST_MINUTES ?? "");
const TEST_MINUTES     = Number.isFinite(TEST_MINUTES_RAW) ? TEST_MINUTES_RAW : 8;
const TEST_DIST_RAW    = parseFloat(import.meta.env.VITE_SHIFT_TEST_DISTANCE_FT ?? "");
const TEST_DIST_FT     = Number.isFinite(TEST_DIST_RAW) ? TEST_DIST_RAW : null;

// --- Mock data -----------------------------------------------------------

// Forstner Building site centre + perimeter radius
const PROJECT_SITE = { name: "Forstner Building", lat: 37.7749, lng: -122.4194, edgeRadiusFt: 150 };

// Fallback mock position when GPS is unavailable: ~820 ft north of site centre
const MOCK_POSITION = { lat: 37.77714, lng: -122.4194 };

const SHIFT_EMPLOYEE = "Connor McManus";
let SHIFT_START_MS = 0; // set on first render

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
  // Initialise shift start time exactly once, honouring env override
  if (!SHIFT_START_MS) SHIFT_START_MS = Date.now() + TEST_MINUTES * 60 * 1000;

  const [now, setNow] = useState(Date.now);
  const [position, setPosition] = useState<{ lat: number; lng: number }>(MOCK_POSITION);
  const [usingGps, setUsingGps] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const watchRef = useRef<number | null>(null);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  // Request real GPS; fall back silently to MOCK_POSITION
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUsingGps(true);
      },
      () => undefined,
      { enableHighAccuracy: true }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  // --- Derived values ----------------------------------------------------

  const msUntilShift = SHIFT_START_MS - now;
  const minutesUntil = msUntilShift / 60_000;

  // Only visible 0–10 min before shift (hide once shift is 60s past start)
  // VITE_SHIFT_TEST=true bypasses the window check so the island is always visible
  const inWindow = minutesUntil <= 10 && msUntilShift > -60_000;
  if (!TEST_FORCE_SHOW && !inWindow) return null;

  // VITE_SHIFT_TEST_DISTANCE_FT pins the distance; otherwise derive from GPS/mock position
  const feetFromEdge = TEST_DIST_FT !== null
    ? Math.max(0, Math.round(TEST_DIST_FT))
    : Math.max(0, Math.round(
        haversineMeters(position.lat, position.lng, PROJECT_SITE.lat, PROJECT_SITE.lng)
          * METERS_TO_FEET - PROJECT_SITE.edgeRadiusFt
      ));
  const walkSecs = feetFromEdge / WALK_FPS;
  const walkMins = walkSecs / 60;

  const willMakeIt = walkMins < minutesUntil;

  // Urgency colour
  const urgency =
    minutesUntil <= 2 ? "red" : minutesUntil <= 5 ? "amber" : "teal";

  const colours = {
    red:   { glow: "rgba(239,68,68,0.55)",   ring: "#ef4444", text: "#fca5a5", bg: "rgba(127,29,29,0.35)" },
    amber: { glow: "rgba(251,191,36,0.45)",  ring: "#fbbf24", text: "#fde68a", bg: "rgba(120,53,15,0.35)" },
    teal:  { glow: "rgba(45,212,191,0.35)",  ring: "#2dd4bf", text: "#99f6e4", bg: "rgba(15,52,52,0.35)"  },
  }[urgency];

  // Format shift start time
  const startDate = new Date(SHIFT_START_MS);
  const startStr = startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] select-none"
      style={{ filter: `drop-shadow(0 0 14px ${colours.glow})` }}
    >
      <div
        className="overflow-hidden transition-all duration-500 ease-in-out cursor-pointer"
        style={{
          borderRadius: expanded ? "18px" : "9999px",
          width: expanded ? "340px" : "auto",
          minWidth: expanded ? "340px" : "0px",
          background: "rgba(8, 8, 12, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1.5px solid ${colours.ring}55`,
          boxShadow: `0 0 0 1px ${colours.ring}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}
        onClick={() => setExpanded((x) => !x)}
      >
        {/* ── Pill / collapsed state ── */}
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ height: expanded ? "52px" : "44px", transition: "height 0.4s ease" }}
        >
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: colours.ring }}
            />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: colours.ring }} />
          </span>

          {/* Countdown */}
          <span
            className="font-['Inter:Bold',sans-serif] text-[13px] tabular-nums whitespace-nowrap"
            style={{ color: colours.text }}
          >
            {fmtCountdown(msUntilShift)}
          </span>

          <span className="text-[rgba(255,255,255,0.2)] text-[11px]">|</span>

          {/* Distance */}
          <span className="flex items-center gap-1 text-[12px] font-['Inter:Semi_Bold',sans-serif] text-white/70 whitespace-nowrap">
            <MapPin size={12} style={{ color: colours.ring }} />
            {feetFromEdge.toLocaleString()} ft
          </span>

          {/* Walk time chip — only when expanded is false, show inline */}
          {!expanded && (
            <span className="flex items-center gap-1 text-[11px] font-['Inter:Regular',sans-serif] text-white/50 whitespace-nowrap">
              <Footprints size={11} className="opacity-60" />
              {fmtWalk(walkSecs)}
            </span>
          )}
        </div>

        {/* ── Expanded content ── */}
        {expanded && (
          <div
            className="px-4 pb-4 flex flex-col gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-['Inter:Regular',sans-serif] text-white/40">Upcoming shift</span>
                <span className="text-[14px] font-['Inter:Semi_Bold',sans-serif] text-white">{SHIFT_EMPLOYEE}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: colours.bg, border: `1px solid ${colours.ring}44` }}>
                <Clock size={12} style={{ color: colours.ring }} />
                <span className="text-[12px] font-['Inter:Semi_Bold',sans-serif]" style={{ color: colours.text }}>
                  {startStr}
                </span>
              </div>
            </div>

            {/* Site row */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Navigation2 size={14} style={{ color: colours.ring }} />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-['Inter:Semi_Bold',sans-serif] text-white truncate block">{PROJECT_SITE.name}</span>
                <span className="text-[11px] font-['Inter:Regular',sans-serif] text-white/40">
                  {usingGps ? "Live GPS" : "Estimated position"}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-[10px] font-['Inter:Regular',sans-serif] text-white/35 uppercase tracking-wider">From edge</span>
                <span className="text-[18px] font-['Inter:Bold',sans-serif]" style={{ color: colours.text }}>
                  {feetFromEdge.toLocaleString()}
                  <span className="text-[11px] font-['Inter:Regular',sans-serif] text-white/40 ml-1">ft</span>
                </span>
              </div>

              <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-[10px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-[10px] font-['Inter:Regular',sans-serif] text-white/35 uppercase tracking-wider">Walk time</span>
                <span className="text-[18px] font-['Inter:Bold',sans-serif]" style={{ color: willMakeIt ? "#4ade80" : "#f87171" }}>
                  {fmtWalk(walkSecs)}
                </span>
              </div>
            </div>

            {/* Status banner */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-[12px] font-['Inter:Semi_Bold',sans-serif]"
              style={{
                background: willMakeIt ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                border: `1px solid ${willMakeIt ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                color: willMakeIt ? "#4ade80" : "#f87171",
              }}
            >
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
