import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS & DATA ─────────────────────────────────────────────────────────
const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];

const SHIFT_TYPES = [
  { value: "morning", label: "Morning", emoji: "🌅", color: "#fbbf24", gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" },
  { value: "evening", label: "Evening", emoji: "🌙", color: "#818cf8", gradient: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)" },
  { value: "full",    label: "Full Day", emoji: "☀️", color: "#38bdf8", gradient: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)" },
];
const WEEKLY_LIMIT = 24;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

// Decimal hours (two decimals) for history totals
function fmtHoursUnit(h) {
  const n = Number.isFinite(h) ? h : 0;
  const rounded = Math.round(n * 100) / 100;
  return `${rounded.toFixed(2)}h`;
}

function getShiftMeta(type) {
  return (
    SHIFT_TYPES.find(s => s.value === type) || {
      value: "other",
      label: "Other",
      emoji: "📋",
      color: "#94a3b8",
      gradient: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
    }
  );
}

function fmtMoney(amount) {
  const n = Number(amount);
  if (isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function getRealWorldSaturday() {
  const today = new Date();
  const day = today.getDay(); 
  const diff = day === 6 ? 0 : -(day + 1);
  const sat = new Date(today);
  sat.setDate(today.getDate() + diff);
  sat.setHours(0, 0, 0, 0);
  return sat;
}

// Fixed Date Formatter: Always shows "Feb 7 – Feb 13" format
function formatWeekRange(satDate) {
  const d = new Date(satDate);
  const fri = new Date(d);
  fri.setDate(d.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${d.toLocaleDateString("en-CA", opts)} – ${fri.toLocaleDateString("en-CA", opts)}`;
}

function getShiftCalendarDate(weekStartIso, dayIndex) {
  const base = new Date(weekStartIso);
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + (Number(dayIndex) || 0));
  return d;
}

function getSemimonthlyPeriodKey(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const period = date.getDate() <= 15 ? 1 : 2;
  return `${y}-${String(m).padStart(2, "0")}-P${period}`;
}

function parseSemimonthlyPeriodKey(key) {
  const [ym, periodStr] = key.split("-P");
  const [year, month] = ym.split("-").map(Number);
  return { year, month, period: Number(periodStr) };
}

function sortSemimonthlyPeriodKeysDesc(a, b) {
  const pa = parseSemimonthlyPeriodKey(a);
  const pb = parseSemimonthlyPeriodKey(b);
  if (pa.year !== pb.year) return pb.year - pa.year;
  if (pa.month !== pb.month) return pb.month - pa.month;
  return pb.period - pa.period;
}

function formatSemimonthlyPayPeriod(periodKey) {
  const { year, month, period } = parseSemimonthlyPeriodKey(periodKey);
  const opts = { month: "short", day: "numeric" };
  const lastDay = new Date(year, month, 0).getDate();
  if (period === 1) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month - 1, 15);
    const paycheck = new Date(year, month - 1, 20);
    return {
      range: `${start.toLocaleDateString("en-CA", opts)} – ${end.toLocaleDateString("en-CA", opts)}`,
      paycheck: paycheck.toLocaleDateString("en-CA", opts),
    };
  }
  const start = new Date(year, month - 1, 16);
  const end = new Date(year, month - 1, lastDay);
  const payMonth = month === 12 ? 1 : month + 1;
  const payYear = month === 12 ? year + 1 : year;
  const paycheck = new Date(payYear, payMonth - 1, 5);
  return {
    range: `${start.toLocaleDateString("en-CA", opts)} – ${end.toLocaleDateString("en-CA", opts)}`,
    paycheck: paycheck.toLocaleDateString("en-CA", opts),
  };
}

// ─── CUSTOM COMPONENTS ────────────────────────────────────────────────────────

const CustomSelect = ({ label, value, options, onChange, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find(o => o.value === value) || options[0];

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <div className="input-label">{label}</div>
      <div className={`select-trigger glass-input ${isOpen ? "active" : ""}`} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {selectedOpt.emoji && <span style={{ fontSize: "1.2em" }}>{selectedOpt.emoji}</span>}
          {selectedOpt.label}
        </span>
        <span className={`arrow ${isOpen ? "open" : ""}`}>▼</span>
      </div>
      {isOpen && (
        <div className="select-dropdown glass-panel anim-scale-in">
          {options.map((opt) => (
            <div key={opt.value} className={`select-option ${value === opt.value ? "selected" : ""}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>
              {opt.emoji && <span className="opt-icon">{opt.emoji}</span>}
              <span className="opt-label">{opt.label}</span>
              {value === opt.value && <span className="check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "weekly-hours-tracker-v7-final";
const THEME_KEY = "hours-tracker-theme";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    // Normalize so app never crashes on bad/migrated data
    const ensureShiftId = (s, i) => {
      if (!s || typeof s !== "object") return { id: `legacy-${i}-${Date.now()}`, dayIndex: 0, type: "other", hours: 0, note: "" };
      return s.id != null ? s : { ...s, id: `legacy-${i}-${Date.now()}` };
    };
    const ensureTipId = (t, i) => {
      if (!t || typeof t !== "object") return { id: `tip-${i}-${Date.now()}`, amount: 0, note: "" };
      return t.id != null ? t : { ...t, id: `tip-${i}-${Date.now()}` };
    };
    const normalizedShifts = (Array.isArray(data.shifts) ? data.shifts : []).map(ensureShiftId);
    const normalizedTips = (Array.isArray(data.tips) ? data.tips : []).map(ensureTipId);
    const archivedWeeks = Array.isArray(data.archivedWeeks)
      ? data.archivedWeeks.map(w => ({
          weekStart: w?.weekStart ?? "",
          shifts: (Array.isArray(w?.shifts) ? w.shifts : []).map(ensureShiftId),
          tips: (Array.isArray(w?.tips) ? w.tips : []).map(ensureTipId),
          mode: w?.mode === "unlimited" ? "unlimited" : "limited",
        }))
      : [];
    return {
      mode: data.mode === "unlimited" ? "unlimited" : "limited",
      weekStart: data.weekStart ?? getRealWorldSaturday().toISOString(),
      shifts: normalizedShifts,
      tips: normalizedTips,
      archivedWeeks,
    };
  } catch {
    return null;
  }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ─── INIT STATE ───────────────────────────────────────────────────────────────
function makeInitState(mode = "limited", startDateOverride = null) {
  const sat = startDateOverride ? new Date(startDateOverride) : getRealWorldSaturday();
  return {
    mode,
    weekStart: sat.toISOString(),
    shifts: [],
    tips: [],
    archivedWeeks: [],
  };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WeeklyHoursTracker() {
  const [appState, setAppState] = useState(null);
  const [phase, setPhase] = useState("intro"); // intro | setup | active | history
  const [introStage, setIntroStage] = useState("idle"); // idle | text-blur | circle-grow | done
  const [setupMode, setSetupMode] = useState("limited");
  const [nextWeekDate, setNextWeekDate] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editingArchiveIndex, setEditingArchiveIndex] = useState(null);

  // THEME STATE
  const [theme, setTheme] = useState("dark");

  // Form state
  const [formDay, setFormDay] = useState(() => {
    // DAYS = [Sat, Sun, Mon, Tue, Wed, Thu, Fri]
    // getDay() = 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
    const jsDay = new Date().getDay();
    return jsDay === 6 ? 0 : jsDay + 1; // Sat→0, Sun→1, Mon→2 … Fri→6
  });
  const [formType, setFormType] = useState("morning");
  const [formHours, setFormHours] = useState("");
  const [formShiftTip, setFormShiftTip] = useState("");
  const [formError, setFormError] = useState(null);
  const [justAdded, setJustAdded] = useState(null);
  const [logVisualState, setLogVisualState] = useState("idle"); // idle | pending | done
  const [ringPulseActive, setRingPulseActive] = useState(false);
  const ringPulseTimerRef = useRef(null);
  // "idle" | "out" | "in" — drives the week-change date transition animation
  const [weekTransition, setWeekTransition] = useState("idle");
  const [visibleMonths, setVisibleMonths] = useState([]);       // active month keys in History
  const [expandedHistoryPeriods, setExpandedHistoryPeriods] = useState({});
  const [isMonthFilterOpen, setIsMonthFilterOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [slideNextProgress, setSlideNextProgress] = useState(0);
  const [slideThumbPx, setSlideThumbPx] = useState(0);
  const [slideComplete, setSlideComplete] = useState(false);
  const [smokeParticles, setSmokeParticles] = useState([]);
  const smokeIdRef = useRef(0);
  const smokeIntervalRef = useRef(null);

  // Trends filter state
  const [trendsViewMode, setTrendsViewMode] = useState("weekly");
  const [trendsSelectedMonth, setTrendsSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  });
  const [trendsAnimKey, setTrendsAnimKey] = useState(0);

  const bottomRef = useRef(null);
  const importFileInputRef = useRef(null);
  const headerMenuRef = useRef(null);
  const logAnimTimeoutRef = useRef(null);
  const touchStartRef = useRef(null); // { x, y } for swipe detection
  const phaseRef = useRef(phase);
  const slideTrackRef = useRef(null);
  const slideActiveRef = useRef(false);
  const slideStartXRef = useRef(null);
  const slideHasMovedRef = useRef(false);
  const slideTrackWidthRef = useRef(0);
  // True while any touch is on the slider — blocks global page-swipe navigation
  const sliderInteractingRef = useRef(false);
  const THUMB_W = 48;
  const THUMB_INSET = 6;

  // Keep phaseRef in sync so gesture handlers see latest phase
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Global swipe listeners so navigation works even on empty screens
  useEffect(() => {
    const onStart = (e) => handleTouchStart(e);
    const onEnd = (e) => handleTouchEnd(e);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  // ─── NEW WEEK SLIDE CONTROL ──────────────────────────────────────────────────
  const computeThumbPx = (clientX) => {
    const trackW = slideTrackWidthRef.current;
    if (!trackW) return 0;
    const available = trackW - THUMB_W - THUMB_INSET * 2;
    if (!slideTrackRef.current) return 0;
    const rect = slideTrackRef.current.getBoundingClientRect();
    // Pixel offset from the left inset edge
    let px = clientX - rect.left - THUMB_INSET - THUMB_W / 2;
    px = Math.max(0, Math.min(available, px));
    return px;
  };

  // Smoke particle emitter
  const emitSmoke = (thumbPx, isBurst = false) => {
    const count = isBurst ? 4 : 2;
    const newParticles = Array.from({ length: count }, () => {
      const id = smokeIdRef.current++;
      return {
        id,
        x: thumbPx + THUMB_INSET,
        y: 50 + (Math.random() - 0.5) * 20,
        size: isBurst ? 5 + Math.random() * 7 : 2.5 + Math.random() * 4,
        opacity: isBurst ? 0.5 : 0.28 + Math.random() * 0.22,
        dx: -(1.5 + Math.random() * 2.5),
        dy: (Math.random() - 0.5) * 1.4,
      };
    });
    setSmokeParticles(prev => [...prev.slice(-24), ...newParticles]);
    // Age out particles
    setTimeout(() => {
      setSmokeParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
    }, 700);
  };

  const handleSlideNextMove = (event) => {
    if (!slideActiveRef.current) return;
    if (event.cancelable) event.preventDefault();
    const point = "touches" in event && event.touches.length
      ? event.touches[0]
      : ("changedTouches" in event && event.changedTouches.length
          ? event.changedTouches[0]
          : event);
    if (slideStartXRef.current == null) return;
    const dx = point.clientX - slideStartXRef.current;
    if (!slideHasMovedRef.current) {
      if (Math.abs(dx) <= 6) return;
      slideHasMovedRef.current = true;
    }
    const trackW = slideTrackWidthRef.current;
    const available = trackW - THUMB_W - THUMB_INSET * 2;
    const px = computeThumbPx(point.clientX);
    const p = available > 0 ? px / available : 0;
    setSlideThumbPx(px);
    setSlideNextProgress(p);
    // Emit smoke on every move (was throttled to every 3rd, now always)
    if (slideHasMovedRef.current) {
      emitSmoke(px, p > 0.88);
    }
    // Trigger at 92%+ for full-feel completion
    if (p >= 0.92 && slideHasMovedRef.current) {
      slideActiveRef.current = false;
      sliderInteractingRef.current = false;
      setSlideThumbPx(available);
      setSlideNextProgress(1);
      setSlideComplete(true);
      emitSmoke(available, true);
      window.removeEventListener("mousemove", handleSlideNextMove);
      window.removeEventListener("touchmove", handleSlideNextMove);
      window.removeEventListener("mouseup", handleSlideNextEnd);
      window.removeEventListener("touchend", handleSlideNextEnd);
      setTimeout(() => {
        prepareNextWeek();
        setSlideThumbPx(0);
        setSlideNextProgress(0);
        setSlideComplete(false);
        setSmokeParticles([]);
      }, 680);
    }
  };

  const handleSlideNextEnd = () => {
    sliderInteractingRef.current = false;
    if (!slideActiveRef.current) return;
    slideActiveRef.current = false;
    slideStartXRef.current = null;
    window.removeEventListener("mousemove", handleSlideNextMove);
    window.removeEventListener("touchmove", handleSlideNextMove);
    window.removeEventListener("mouseup", handleSlideNextEnd);
    window.removeEventListener("touchend", handleSlideNextEnd);
    setSlideThumbPx(0);
    setSlideNextProgress(0);
    setSmokeParticles([]);
  };

  const handleSlideNextStart = (event) => {
    if (event.cancelable) event.preventDefault();
    sliderInteractingRef.current = true;   // block page-swipe for this entire touch
    const point = "touches" in event && event.touches.length
      ? event.touches[0]
      : event;
    // Cache track width so move handler doesn't need to query DOM
    if (slideTrackRef.current) {
      slideTrackWidthRef.current = slideTrackRef.current.getBoundingClientRect().width;
    }
    slideActiveRef.current = true;
    slideHasMovedRef.current = false;
    slideStartXRef.current = point.clientX;
    // Cancel any pending global swipe so the slider doesn't also trigger page navigation
    touchStartRef.current = null;
    setSlideThumbPx(0);
    setSlideNextProgress(0);
    window.addEventListener("mousemove", handleSlideNextMove, { passive: false });
    window.addEventListener("touchmove", handleSlideNextMove, { passive: false });
    window.addEventListener("mouseup", handleSlideNextEnd);
    window.addEventListener("touchend", handleSlideNextEnd);
  };

  // Load / Save Data & Theme
  useEffect(() => {
    const saved = loadData();
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) setTheme(savedTheme);

    const destinationPhase = (saved && saved.shifts !== undefined) ? "active" : "setup";
    if (saved && saved.shifts !== undefined) setAppState(saved);

    // Run intro animation then land on real phase
    // Sequence:
    // 0ms    → text-in   : HOURA fades in blurry → sharpens (0.9s)
    // 1100ms → text-blur : HOURA motion-blurs out (0.7s)
    // 1800ms → fade-out  : entire screen fades to home (0.55s)
    // 2350ms → done      : phase switch
    const t0 = setTimeout(() => setIntroStage("text-in"),   0);
    const t1 = setTimeout(() => setIntroStage("text-blur"), 1100);
    const t2 = setTimeout(() => setIntroStage("done"),      1800);
    const t3 = setTimeout(() => {
      setPhase(destinationPhase);
      setIntroStage("idle");
    }, 2350);

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => { if (appState) saveData(appState); }, [appState]);
  useEffect(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { if (justAdded && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [justAdded]);
  useEffect(() => {
    return () => {
      if (logAnimTimeoutRef.current) clearTimeout(logAnimTimeoutRef.current);
    };
  }, []);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target)) setIsHeaderMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // Default History month filter: show latest two months with data
  useEffect(() => {
    const weeks = appState?.archivedWeeks ?? [];
    if (!weeks.length) {
      if (visibleMonths.length) setVisibleMonths([]);
      return;
    }
    if (visibleMonths.length === 0) {
      const monthKeys = Array.from(new Set(
        weeks.map(w => {
          const d = new Date(w.weekStart);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })
      )).sort((a, b) => b.localeCompare(a)); // latest first
      setVisibleMonths(monthKeys.slice(0, 2));
    }
  }, [appState?.archivedWeeks]);
  // Clear editing index if it becomes invalid (e.g. after load or data change)
  useEffect(() => {
    if (editingArchiveIndex != null && appState?.archivedWeeks != null && (editingArchiveIndex < 0 || editingArchiveIndex >= appState.archivedWeeks.length)) {
      setEditingArchiveIndex(null);
    }
  }, [appState?.archivedWeeks?.length, editingArchiveIndex]);

  // Derived (when editing an archived week, use that week's data)
  const archives = appState?.archivedWeeks ?? [];
  const safeEditIndex = editingArchiveIndex != null && editingArchiveIndex >= 0 && editingArchiveIndex < archives.length ? editingArchiveIndex : null;
  const archivedEntry = safeEditIndex !== null ? archives[safeEditIndex] : null;
  const shifts = archivedEntry ? (archivedEntry.shifts ?? []) : (appState?.shifts ?? []);
  const mode = archivedEntry ? (archivedEntry.mode ?? "limited") : (appState?.mode ?? "limited");
  const weekStart = archivedEntry
    ? new Date(archivedEntry.weekStart)
    : (appState ? new Date(appState.weekStart) : getRealWorldSaturday());
  const totalHours = shifts.reduce((s, sh) => s + (Number(sh.hours) || 0), 0);
  const tips = archivedEntry ? (archivedEntry.tips ?? []) : (appState?.tips ?? []);
  const totalTips = tips.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const limit = mode === "limited" ? WEEKLY_LIMIT : null;
  const pct = limit ? Math.min(totalHours / limit, 1) : 0;
  const overLimit = limit && totalHours > limit;

  // Actions
  const startTracking = () => {
    const init = nextWeekDate
      ? { ...makeInitState(setupMode, nextWeekDate), archivedWeeks: appState?.archivedWeeks || [] }
      : makeInitState(setupMode);
    setAppState(init);
    setPhase("active");
    setNextWeekDate(null);
  };

  const addShift = () => {
    const h = parseFloat(formHours);
    if (isNaN(h) || h <= 0 || h > 24) {
      setFormError("Enter valid hours (0.1 – 24)");
      return;
    }
    setFormError(null);
    setLogVisualState("pending");
    const now = Date.now();
    const tipRaw = (formShiftTip || "").trim();
    let tipToAdd = null;
    let tipAmount = null;
    if (tipRaw) {
      const gross = parseFloat(tipRaw.replace(/[^0-9.-]/g, ""));
      if (!isNaN(gross) && gross > 0) {
        // Apply 30% deduction (keep 70%), rounded to cents
        const net = Math.round(gross * 0.7 * 100) / 100;
        tipAmount = net;
        tipToAdd = {
          id: `tip-${now}`,
          amount: net,
          note: `${DAYS[formDay]} · ${getShiftMeta(formType).label}`,
          timestamp: new Date().toISOString(),
        };
      }
    }
    const newShift = { id: now, dayIndex: formDay, type: formType, hours: h, tipAmount, timestamp: new Date().toISOString() };
    if (safeEditIndex !== null) {
      setAppState(prev => {
        const arch = prev.archivedWeeks ?? [];
        const entry = arch[safeEditIndex];
        if (!entry) return prev;
        const nextShifts = [...(entry.shifts ?? []), newShift];
        const nextTips = tipToAdd ? [...(entry.tips ?? []), tipToAdd] : (entry.tips ?? []);
        const updatedTotalHours = nextShifts.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
        const nextArch = [...arch];
        nextArch[safeEditIndex] = { ...entry, shifts: nextShifts, tips: nextTips, totalHours: updatedTotalHours };
        return { ...prev, archivedWeeks: nextArch };
      });
    } else {
      setAppState(prev => ({
        ...prev,
        shifts: [...(prev.shifts ?? []), newShift],
        tips: tipToAdd ? [...(prev.tips ?? []), tipToAdd] : (prev.tips ?? []),
      }));
    }
    setJustAdded(newShift.id);
    setFormHours("");
    setFormShiftTip("");
    setTimeout(() => setJustAdded(null), 1800);
    if (logAnimTimeoutRef.current) clearTimeout(logAnimTimeoutRef.current);
    const toDone = setTimeout(() => {
      setLogVisualState("done");
      // Pulse ring on logged value
      setRingPulseActive(false);
      requestAnimationFrame(() => {
        setTimeout(() => setRingPulseActive(true), 20);
        if (ringPulseTimerRef.current) clearTimeout(ringPulseTimerRef.current);
        ringPulseTimerRef.current = setTimeout(() => setRingPulseActive(false), 950);
      });
    }, 220);
    const toIdle = setTimeout(() => setLogVisualState("idle"), 1200);
    logAnimTimeoutRef.current = toIdle;
  };

  const deleteShift = (id) => {
    if (safeEditIndex !== null) {
      setAppState(prev => {
        const arch = prev.archivedWeeks ?? [];
        const entry = arch[safeEditIndex];
        if (!entry) return prev;
        const shiftsArr = entry.shifts ?? [];
        const tipsArr = entry.tips ?? [];
        const targetShift = shiftsArr.find(s => s.id === id);
        const nextShifts = shiftsArr.filter(s => s.id !== id);
        let nextTips = tipsArr;
        if (targetShift && targetShift.tipAmount) {
          nextTips = tipsArr.filter(t => t.id !== `tip-${id}`);
        }
        const updatedTotalHours = nextShifts.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
        const nextArch = [...arch];
        nextArch[safeEditIndex] = { ...entry, shifts: nextShifts, tips: nextTips, totalHours: updatedTotalHours };
        return { ...prev, archivedWeeks: nextArch };
      });
    } else {
      setAppState(prev => {
        const shiftsArr = prev.shifts ?? [];
        const tipsArr = prev.tips ?? [];
        const targetShift = shiftsArr.find(s => s.id === id);
        const nextShifts = shiftsArr.filter(s => s.id !== id);
        let nextTips = tipsArr;
        if (targetShift && targetShift.tipAmount) {
          nextTips = tipsArr.filter(t => t.id !== `tip-${id}`);
        }
        return { ...prev, shifts: nextShifts, tips: nextTips };
      });
    }
  };

  const doneEditingArchive = () => {
    setEditingArchiveIndex(null);
    setPhase("history");
  };

  const prepareNextWeek = () => {
    const currentArchive = { weekStart: appState.weekStart, shifts: appState.shifts, tips: appState.tips ?? [], totalHours, mode: appState.mode };
    const nextSat = new Date(appState.weekStart);
    nextSat.setDate(nextSat.getDate() + 7);
    // Start date-out dissolve, commit new state after it finishes, then fade date in
    setWeekTransition("out");
    setTimeout(() => {
      setAppState(prev => ({
        ...prev,
        archivedWeeks: [...(prev.archivedWeeks || []), currentArchive],
        shifts: [],
        tips: [],
        weekStart: nextSat.toISOString(),
      }));
      setFormDay(0);
      setWeekTransition("in");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setWeekTransition("idle"), 500);
    }, 260);
  };

  const requestReset = () => setShowResetConfirm(true);
  const confirmReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAppState(null);
    setNextWeekDate(null);
    setPhase("setup");
    setShowResetConfirm(false);
  };

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  // ─── EXPORT / IMPORT (backup & restore across devices) ─────────────────────
  const backupDatestamp = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const buildBackupPayload = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return { exportedAt: new Date().toISOString(), origin: window.location.origin, localStorage: data };
  };

  const downloadJsonFile = (payload, filename) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    const payload = buildBackupPayload();
    const filename = `pay-backup-${backupDatestamp()}.json`;
    const file = new File([JSON.stringify(payload, null, 2)], filename, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch {
        // user cancelled share, or share failed — fall back to a direct download
      }
    }
    downloadJsonFile(payload, filename);
  };

  const triggerImportPicker = () => importFileInputRef.current?.click();

  const handleImportFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so selecting the same file again still fires onChange
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedEntries = parsed && typeof parsed === "object" ? parsed.localStorage : null;
      if (!importedEntries || typeof importedEntries !== "object") {
        window.alert("This file doesn't look like a valid backup.");
        return;
      }
      const count = Object.keys(importedEntries).length;
      const confirmed = window.confirm(`Restore ${count} item(s) from this backup?\n\nYour current data on this device will be backed up automatically, then overwritten.`);
      if (!confirmed) return;

      downloadJsonFile(buildBackupPayload(), `pay-backup-before-import-${backupDatestamp()}.json`);

      Object.entries(importedEntries).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      window.alert(`Restored ${count} item(s). The app will now reload.`);
      window.location.reload();
    } catch {
      window.alert("Could not read this backup file. No changes were made.");
    }
  };

  const toggleMonthFilter = (monthKey) => {
    setVisibleMonths(prev =>
      prev.includes(monthKey)
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  };

  // Simple page navigation helpers (used in header + history view)
  const goToHistory = () => setPhase("history");
  const goToTracker = () => {
    setPhase("active");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const handleTouchStart = (e) => {
    // Don't record a swipe start if the slider is being touched
    if (sliderInteractingRef.current) return;
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    // Slider owns this touch — do not navigate
    if (sliderInteractingRef.current) {
      touchStartRef.current = null;
      return;
    }
    if (!touchStartRef.current) return;
    const start = touchStartRef.current;
    const changed = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null;
    const endX = changed ? changed.clientX : start.x;
    const endY = changed ? changed.clientY : start.y;
    const dx = endX - start.x;
    const dy = endY - start.y;

    const distanceThreshold = 55;
    const horizontalDominanceRatio = 1.6;

    const isHorizontalSwipe =
      Math.abs(dx) > distanceThreshold && Math.abs(dx) > Math.abs(dy) * horizontalDominanceRatio;

    if (isHorizontalSwipe) {
      if (dx > 0 && phaseRef.current === "active") {
        goToHistory();
      } else if (dx < 0 && phaseRef.current === "history") {
        goToTracker();
      }
    }
    touchStartRef.current = null;
  };

  // ─── DYNAMIC STYLES ─────────────────────────────────────────────────────────
  const ringGradientId = overLimit ? "grad-danger" : pct >= 0.85 ? "grad-warn" : "grad-success";
  const isDark = theme === "dark";

  // Dynamic colors based on theme
  const colors = {
    bg: isDark ? "#05050a" : "#f1f5f9", 
    glass: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.85)",
    glassBorder: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(99, 102, 241, 0.15)",
    glassInput: isDark ? "rgba(0,0,0,0.2)" : "#ffffff",
    text: isDark ? "#ffffff" : "#0f172a", 
    textMuted: isDark ? "#94a3b8" : "#64748b",
    dropdownBg: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
    shadow: isDark 
      ? "0 8px 32px 0 rgba(0, 0, 0, 0.3)" 
      : "0 20px 40px -10px rgba(99, 102, 241, 0.15), 0 0 0 1px rgba(255,255,255,0.6) inset"
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Bebas+Neue&display=swap');
    :root {
      --primary: #6366f1;
      --danger: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      background: ${colors.bg}; 
      color: ${colors.text}; 
      font-family: 'Outfit', sans-serif; 
      min-height: 100vh; 
      overflow-x: hidden; 
      transition: background 0.3s ease, color 0.3s ease; 
      padding-top: calc(0.03rem + env(safe-area-inset-top, 0px));
    }

    /* ─── INTRO ANIMATION ─────────────────────────────────────────── */
    @keyframes auroraShift {
      0%   { background-position: 80% 8%,  95% 42%, 12% 88%, 38% 58%, center; }
      25%  { background-position: 72% 14%, 88% 36%, 18% 80%, 44% 52%, center; }
      50%  { background-position: 76% 20%, 92% 50%, 10% 76%, 34% 64%, center; }
      75%  { background-position: 84% 12%, 86% 38%, 20% 84%, 40% 56%, center; }
      100% { background-position: 80% 8%,  95% 42%, 12% 88%, 38% 58%, center; }
    }
    .intro-screen {
      position: fixed; inset: 0; z-index: 9999;
      background-image:
        radial-gradient(ellipse 55% 45% at 80% 8%,  #7b7fe8 0%, #a5aaee 22%, transparent 52%),
        radial-gradient(ellipse 48% 40% at 95% 42%, #6366c8 0%, #9498dc 18%, transparent 48%),
        radial-gradient(ellipse 60% 50% at 12% 88%, #e8edf8 0%, #d4ddf0 28%, transparent 60%),
        radial-gradient(ellipse 52% 44% at 38% 58%, #dce6f5 0%, #ccd8ee 22%, transparent 52%),
        linear-gradient(145deg, #eef1fa 0%, #d8e2f3 38%, #bcc8ec 68%, #9aa8e0 100%);
      background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 100% 100%;
      animation: auroraShift 12s ease-in-out infinite;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      overflow: hidden;
    }

    /* Tagline — starts invisible, fades in with text-in stage */
    .intro-tagline {
      font-family: 'Outfit', sans-serif;
      font-size: clamp(0.52rem, 1.4vw, 0.68rem);
      font-weight: 500;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: rgba(80, 90, 160, 0.75);
      margin-bottom: 1.1rem;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.7s ease, transform 0.7s ease;
    }
    .intro-tagline.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Wordmark */
    .intro-wordmark {
      font-family: 'Bebas Neue', 'Outfit', sans-serif;
      font-size: clamp(4.5rem, 16vw, 9rem);
      font-weight: 900;
      letter-spacing: 0.04em;
      color: #161B2E;
      line-height: 1;
      position: relative;
      display: inline-block;
      opacity: 0;
      will-change: transform, filter, opacity;
    }
    /* Stage 1: fade in blurry → sharpen */
    .intro-wordmark.fade-in {
      animation: introWordFadeIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    /* Stage 2: motion blur out */
    .intro-wordmark.blur-shift {
      animation: introWordBlurOut 0.7s cubic-bezier(0.4, 0, 0.8, 0.6) forwards;
    }

    /* Ghost echo for motion blur feel */
    .intro-wordmark-echo {
      position: absolute;
      inset: 0;
      font-family: 'Bebas Neue', 'Outfit', sans-serif;
      font-size: inherit;
      font-weight: 900;
      letter-spacing: 0.04em;
      color: #161B2E;
      line-height: 1;
      opacity: 0;
      filter: blur(10px);
      pointer-events: none;
    }
    .intro-wordmark-echo.blur-shift {
      animation: introEchoFade 0.7s cubic-bezier(0.4, 0, 0.8, 0.6) forwards;
    }

    /* ─── KEYFRAMES ────────────────────────────────────────────────── */

    /* HOURA: starts blurry, clears to sharp */
    @keyframes introWordFadeIn {
      0%   { opacity: 0;   transform: scale(1.04); filter: blur(12px); }
      40%  { opacity: 0.9; transform: scale(1.01); filter: blur(3px);  }
      100% { opacity: 1;   transform: scale(1);    filter: blur(0px);  }
    }

    /* HOURA: sharpened text blurs back out with slight horizontal drift */
    @keyframes introWordBlurOut {
      0%   { opacity: 1;   transform: translateX(0)    scaleX(1);     filter: blur(0px);  }
      40%  { opacity: 0.8; transform: translateX(-2%)  scaleX(0.994); filter: blur(5px);  }
      100% { opacity: 0;   transform: translateX(-5%)  scaleX(0.985); filter: blur(16px); }
    }

    /* Echo ghost drifts opposite direction for motion blur feel */
    @keyframes introEchoFade {
      0%   { opacity: 0;    transform: translateX(0);    filter: blur(10px); }
      25%  { opacity: 0.28; transform: translateX(2%);   filter: blur(8px);  }
      100% { opacity: 0;    transform: translateX(5%);   filter: blur(3px);  }
    }

    /* Entire intro screen fades out to reveal home */
    @keyframes introScreenFadeOut {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
    .intro-screen.fade-out {
      animation: introScreenFadeOut 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      pointer-events: none;
    }
    /* ─────────────────────────────────────────────────────────────── */
    .animated-bg { 
      position: fixed; inset: 0; z-index: -1; 
      background: ${isDark 
        ? "radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.15), transparent 25%)"
        : "radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.12), transparent 35%), radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.12), transparent 35%)"}; 
      animation: pulseBg 10s ease-in-out infinite alternate; 
    }
    @keyframes pulseBg { 0% { opacity: 0.5; transform: scale(1); } 100% { opacity: 0.8; transform: scale(1.1); } }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    /* Ring shine — a short bright arc that orbits the full ring continuously */
    @keyframes ringOrbit {
      from { stroke-dashoffset: 0; }
      to   { stroke-dashoffset: -${Math.round(2 * Math.PI * 60)}; }
    }
    .ring-shine-arc {
      animation: ringOrbit 2.8s linear infinite;
    }
    /* Ring pulse on new shift logged */
    @keyframes ringPulseGlow {
      0%   { filter: drop-shadow(0 0 5px rgba(99,102,241,0.65)) drop-shadow(0 0 11px rgba(34,211,238,0.3)); }
      35%  { filter: drop-shadow(0 0 8px rgba(99,102,241,1)) drop-shadow(0 0 22px rgba(99,102,241,0.6)) drop-shadow(0 0 36px rgba(34,211,238,0.35)); }
      100% { filter: drop-shadow(0 0 5px rgba(99,102,241,0.65)) drop-shadow(0 0 11px rgba(34,211,238,0.3)); }
    }
    .ring-pulse { animation: ringPulseGlow 0.9s cubic-bezier(0.22,1,0.36,1) forwards; }
    @keyframes pulseRing {
      0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.6), 0 2px 12px rgba(99,102,241,0.4); }
      70% { box-shadow: 0 0 0 6px rgba(99,102,241,0), 0 2px 12px rgba(99,102,241,0.4); }
      100% { box-shadow: 0 0 0 0 rgba(99,102,241,0), 0 2px 12px rgba(99,102,241,0.4); }
    }
    @keyframes chevronDrift {
      0%, 100% { opacity: 0.45; transform: translateX(0px); }
      50% { opacity: 1; transform: translateX(2.5px); }
    }
    @keyframes completeFill {
      0%   { opacity: 0; transform: scaleX(0.7); }
      30%  { opacity: 1; transform: scaleX(1); }
      80%  { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes checkPop {
      0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
      50%  { transform: scale(1.22) rotate(4deg); opacity: 1; }
      75%  { transform: scale(0.94) rotate(-2deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes rippleOut {
      0%   { transform: scale(0.6); opacity: 0.7; }
      100% { transform: scale(2.6); opacity: 0; }
    }
    .slide-thumb-idle { animation: pulseRing 2s ease-out infinite; }
    .slide-chevron { animation: chevronDrift 1.5s ease-in-out infinite; }
    .slide-chevron-active { animation: none !important; }
    .slide-complete-fill {
      animation: completeFill 0.68s cubic-bezier(0.22,1,0.36,1) forwards;
    }
    .slide-check {
      animation: checkPop 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
    }
    .slide-ripple {
      animation: rippleOut 0.55s ease-out 0.05s both;
    }
    @keyframes smokeFloat {
      0%   { transform: translate(0, 0) scale(1);   opacity: var(--smoke-opacity); }
      100% { transform: translate(var(--smoke-dx), var(--smoke-dy)) scale(2.8); opacity: 0; }
    }
    .smoke-particle {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: smokeFloat 0.7s cubic-bezier(0.2, 0, 0.8, 1) forwards;
      background: ${isDark
        ? "radial-gradient(circle, rgba(199,210,254,0.55) 0%, rgba(129,140,248,0.2) 60%, transparent 100%)"
        : "radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.12) 60%, transparent 100%)"};
    }
    .glass-panel { 
      background: ${colors.glass}; 
      backdrop-filter: blur(${isDark ? "24px" : "50px"}); 
      -webkit-backdrop-filter: blur(${isDark ? "24px" : "50px"}); 
      border: 1px solid ${colors.glassBorder}; 
      border-top: 1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.9)"}; 
      border-radius: 24px; 
      box-shadow: ${colors.shadow}; 
      transition: all 0.3s ease; 
    }
    .glass-input { 
      background: ${colors.glassInput}; 
      border: 1px solid ${colors.glassBorder}; 
      color: ${colors.text}; 
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
      cursor: pointer; 
      box-shadow: ${isDark ? "none" : "0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)"};
    }
    .glass-input:hover { 
      background: ${isDark ? "rgba(255,255,255,0.05)" : "#ffffff"}; 
      border-color: var(--primary); 
    }
    .glass-input:focus, .glass-input.active { 
      background: ${isDark ? "rgba(0,0,0,0.4)" : "#ffffff"}; 
      border-color: var(--primary); 
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15); 
      outline: none; 
    }
    .custom-select-container { position: relative; margin-bottom: 0.5rem; }
    .input-label { font-size: 0.7rem; color: ${colors.textMuted}; margin-bottom: 0.5rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }

    /* Premium minimal select */
    .select-trigger {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.05rem;
      border-radius: 14px;
      font-size: 0.95rem;
      font-weight: 520;
      user-select: none;
      line-height: 1.1;
      letter-spacing: 0.01em;
    }
    .select-trigger .arrow {
      font-size: 0.65rem;
      color: ${colors.textMuted};
      transition: transform 0.22s ease, color 0.22s ease, opacity 0.22s ease;
      opacity: 0.85;
    }
    .select-trigger .arrow.open { transform: rotate(180deg); color: var(--primary); opacity: 1; }
    .select-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      z-index: 100;
      overflow: visible;
      padding: 0.3rem;
      background: ${colors.dropdownBg};
      border-radius: 14px;
      border: 1px solid ${colors.glassBorder};
      box-shadow: ${isDark
        ? "0 20px 60px rgba(0,0,0,0.55)"
        : "0 18px 50px rgba(15, 23, 42, 0.12)"};
      backdrop-filter: blur(${isDark ? "18px" : "24px"});
      -webkit-backdrop-filter: blur(${isDark ? "18px" : "24px"});
    }
    .select-option {
      padding: 0.55rem 0.85rem;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
      font-size: 0.92rem;
      color: ${colors.text};
    }
    .select-option:hover {
      background: ${isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.10)"};
      color: ${colors.text};
      transform: none;
    }
    .select-option.selected {
      background: ${isDark ? "rgba(99, 102, 241, 0.22)" : "rgba(99, 102, 241, 0.14)"};
      color: ${colors.text};
    }
    .select-option .check { margin-left: auto; color: ${isDark ? "#c7d2fe" : "#4f46e5"}; }
    .select-option .opt-icon { opacity: 0.9; }
    .header-menu-wrap { position: relative; }
    .header-menu-trigger {
      background: transparent;
      border: none;
      color: ${colors.textMuted};
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
      padding: 0.3rem 0.4rem;
    }
    .header-menu-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 160px;
      z-index: 100;
      padding: 0.3rem;
      background: ${colors.dropdownBg};
      border-radius: 14px;
      border: 1px solid ${colors.glassBorder};
      box-shadow: ${isDark
        ? "0 20px 60px rgba(0,0,0,0.55)"
        : "0 18px 50px rgba(15, 23, 42, 0.12)"};
      backdrop-filter: blur(${isDark ? "18px" : "24px"});
      -webkit-backdrop-filter: blur(${isDark ? "18px" : "24px"});
    }
    .header-menu-item {
      display: block;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      padding: 0.6rem 0.75rem;
      border-radius: 10px;
      cursor: pointer;
      color: ${colors.textMuted};
      font-size: 0.8rem;
      letter-spacing: 0.1em;
      font-family: inherit;
    }
    .header-menu-item:hover { background: ${isDark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.10)"}; color: ${colors.text}; }
    .header-menu-divider { height: 1px; background: ${colors.glassBorder}; margin: 0.3rem 0.2rem; }
    .header-menu-item.danger { color: var(--danger); }
    .header-menu-item.danger:hover { background: rgba(239, 68, 68, 0.12); color: var(--danger); }
    .btn-liquid {
      position: relative;
      background: linear-gradient(135deg, #111827 0%, #020617 100%);
      color: #e5e7eb;
      border: 1px solid rgba(88, 106, 180, 0.8);
      padding: 0.6rem 1.4rem;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      width: 100%;
      box-shadow:
        0 0 0 1px rgba(15, 23, 42, 0.9),
        0 14px 35px rgba(15, 23, 42, 0.95);
      transition:
        transform 0.2s cubic-bezier(0.19, 1, 0.22, 1),
        box-shadow 0.2s ease,
        border-color 0.2s ease,
        background 0.25s ease,
        opacity 0.12s ease;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      overflow: hidden;
      outline: none !important;
      appearance: none;
      -webkit-appearance: none;
      -webkit-tap-highlight-color: transparent !important;
      -webkit-touch-callout: none;
      tap-highlight-color: transparent;
    }
    .btn-liquid:focus,
    .btn-liquid:focus-visible {
      outline: none !important;
      box-shadow:
        0 0 0 1px rgba(59, 130, 246, 0.7),
        0 18px 40px rgba(15, 23, 42, 1);
    }
    .btn-liquid:active {
      outline: none !important;
      animation: btnPulse 0.28s ease-out;
      opacity: 0.9;
    }
    .btn-liquid::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 0% 0%, rgba(248, 250, 252, 0.24), transparent 55%),
        radial-gradient(circle at 120% 0%, rgba(129, 140, 248, 0.32), transparent 55%);
      opacity: 0;
      transform: translate3d(-12%, 0, 0);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      mix-blend-mode: screen;
    }
    .btn-liquid:hover::before {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
    .btn-liquid:hover {
      transform: translateY(-2px);
      box-shadow:
        0 0 0 1px rgba(59, 130, 246, 0.7),
        0 18px 40px rgba(15, 23, 42, 1);
      border-color: rgba(129, 140, 248, 0.9);
      background: linear-gradient(135deg, #111827 0%, #020617 30%, #020617 100%);
    }
    @keyframes btnPulse {
      0% {
        transform: translateY(0) scale(1);
        box-shadow: 0 10px 20px rgba(15, 23, 42, 0.55);
      }
      50% {
        transform: translateY(1px) scale(0.97);
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.6);
      }
      100% {
        transform: translateY(0) scale(1);
        box-shadow: 0 10px 20px rgba(15, 23, 42, 0.55);
      }
    }
    .btn-liquid:active {
      animation: btnPulse 0.28s ease-out;
      opacity: 0.9;
    }
    .btn-liquid-inner {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
    }
    .btn-liquid-inner .btn-dots {
      display: inline-flex;
      gap: 0.18rem;
    }
    .btn-liquid-inner .btn-dots span {
      width: 4px;
      height: 4px;
      border-radius: 999px;
      background: rgba(226, 232, 255, 0.9);
      animation: dotPulse 0.9s ease-in-out infinite;
    }
    .btn-liquid-inner .btn-dots span:nth-child(2) {
      animation-delay: 0.12s;
    }
    .btn-liquid-inner .btn-dots span:nth-child(3) {
      animation-delay: 0.24s;
    }
    @keyframes dotPulse {
      0%, 100% { transform: translateY(0); opacity: 0.4; }
      50% { transform: translateY(-3px); opacity: 1; }
    }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .text-grad { background: ${isDark ? "linear-gradient(to right, #fff, #cbd5e1)" : "linear-gradient(to right, #1e293b, #475569)"}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .layout-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
    @media (min-width: 600px) { .layout-grid { grid-template-columns: 1fr 1fr; } }
    .tips-form-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; align-items: end; }
    @media (min-width: 500px) { .tips-form-grid { grid-template-columns: 1fr 1.5fr auto; } }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease; }
    .modal-content { max-width: 320px; width: 90%; text-align: center; border: 1px solid rgba(239, 68, 68, 0.3); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .anim-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .anim-enter { animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    /* Trends chart cross-fade on filter change */
    @keyframes chartFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .trends-chart-fade { animation: chartFadeIn 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    /* Week transition — old date dissolves out, new date slides up */
    @keyframes weekDateOut {
      0%   { opacity: 1; transform: translateY(0) scale(1);       filter: blur(0px); }
      100% { opacity: 0; transform: translateY(-6px) scale(0.96); filter: blur(3px); }
    }
    @keyframes weekDateIn {
      0%   { opacity: 0; transform: translateY(8px) scale(0.97);  filter: blur(2px); }
      100% { opacity: 1; transform: translateY(0) scale(1);       filter: blur(0px); }
    }
    .week-date-out { animation: weekDateOut 0.28s cubic-bezier(0.4, 0, 1, 1) forwards; }
    .week-date-in  { animation: weekDateIn  0.38s cubic-bezier(0.2, 0.8, 0.2, 1) 0.08s both; }
    .month-filter-sheet {
      max-width: 360px;
      width: 92%;
      margin: 0 auto;
    }
  `;

  // ─── INTRO ANIMATION VIEW ────────────────────────────────────────────────────
  if (phase === "intro") {
    const isTextIn   = introStage === "text-in";
    const isBlurring = introStage === "text-blur" || introStage === "done";
    const isFadingOut = introStage === "done";

    return (
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
        <style>{css}</style>

        <div className={`intro-screen${isFadingOut ? " fade-out" : ""}`}>
          {/* Tagline */}
          <div className={`intro-tagline${isTextIn || isBlurring ? " visible" : ""}`}>Time Tracking Reimagined</div>

          {/* Main wordmark with motion-blur ghost */}
          <div style={{ position: "relative", display: "inline-block" }}>
            <div className={`intro-wordmark${isTextIn ? " fade-in" : isBlurring ? " blur-shift" : ""}`}>
              HOURA
            </div>
            <div className={`intro-wordmark-echo${isBlurring ? " blur-shift" : ""}`}>
              HOURA
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── HISTORY VIEW ───────────────────────────────────────────────────────────
  if (phase === "history") {
    const archives = appState?.archivedWeeks || [];
    // Build month metadata from archives
    const monthMeta = Array.from(
      new Map(
        archives.map(w => {
          const d = new Date(w.weekStart);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = d.toLocaleDateString("en-CA", { month: "short", year: "numeric" });
          return [key, { key, label }];
        })
      ).values()
    ).sort((a, b) => b.key.localeCompare(a.key)); // latest first

    // Group archived weeks into semimonthly pay periods (1st–15th, 16th–EOM).
    // Shifts are assigned by actual work day (weekStart + dayIndex), so straddling weeks split correctly.
    const sortedArchives = [...archives].sort(
      (a, b) => new Date(a.weekStart) - new Date(b.weekStart)
    );
    const groups = {};
    sortedArchives.forEach((week) => {
      const shiftsByPeriod = {};
      (week.shifts ?? []).forEach((shift) => {
        const periodKey = getSemimonthlyPeriodKey(getShiftCalendarDate(week.weekStart, shift.dayIndex));
        if (!shiftsByPeriod[periodKey]) shiftsByPeriod[periodKey] = [];
        shiftsByPeriod[periodKey].push(shift);
      });
      Object.entries(shiftsByPeriod).forEach(([periodKey, periodShifts]) => {
        if (!groups[periodKey]) groups[periodKey] = [];
        groups[periodKey].push({ week, periodShifts });
      });
    });
    const sortedPeriodKeys = Object.keys(groups).sort(sortSemimonthlyPeriodKeysDesc);

    // ── Trends data pipeline ──────────────────────────────────────────────────
    const currentWeekData = appState
      ? { weekStart: appState.weekStart, shifts: appState.shifts ?? [], tips: appState.tips ?? [], isCurrent: true }
      : null;
    const allWeeksForTrends = [
      ...archives,
      ...(currentWeekData && (currentWeekData.shifts.length || currentWeekData.tips.length) ? [currentWeekData] : []),
    ].filter(w => w && w.weekStart)
      .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));

    // Helper: derive a stable YYYY-MM key from a weekStart ISO string using UTC
    const toMonthKey = (weekStart) => {
      const d = new Date(weekStart);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
    };
    // Helper: format a YYYY-MM key as a human label using local Date constructor (no UTC shift)
    const monthKeyToLabel = (k, opts) => {
      const [y, m] = k.split("-").map(Number);
      return new Date(y, m - 1, 15).toLocaleDateString("en-CA", opts);
    };
    // Helper: format a weekStart ISO as a short date label using UTC day/month
    const weekStartToLabel = (weekStart) => {
      const d = new Date(weekStart);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
        .toLocaleDateString("en-CA", {month:"short", day:"numeric"});
    };

    // All month keys available (newest first for dropdown)
    const trendMonthKeys = Array.from(new Set(
      allWeeksForTrends.map(w => toMonthKey(w.weekStart))
    )).sort((a,b) => b.localeCompare(a));

    // selectedMonth=null means "All" for both modes
    const sel = trendsSelectedMonth; // null | "YYYY-MM"

    let chartPoints = [];
    let hideXLabels = false;

    if (trendsViewMode === "weekly") {
      // Weekly mode: each bar = one week
      let weeks = sel
        ? allWeeksForTrends.filter(w => toMonthKey(w.weekStart) === sel)
        : allWeeksForTrends;
      if (!sel) hideXLabels = true;
      if (weeks.length > 20) weeks = weeks.slice(weeks.length - 20);
      chartPoints = weeks.map(w => {
        const hours = (w.shifts??[]).reduce((s,sh)=>s+(Number(sh.hours)||0),0);
        const tips  = (w.tips??[]).reduce((s,t)=>s+(Number(t.amount)||0),0);
        return { label: weekStartToLabel(w.weekStart), hours, tips };
      });
    } else {
      // Monthly mode: each bar = one month, optionally drilled to a specific month's weeks
      if (sel) {
        // Drill-down: show individual weeks within selected month
        const weeks = allWeeksForTrends.filter(w => toMonthKey(w.weekStart) === sel);
        chartPoints = weeks.map(w => {
          const hours = (w.shifts??[]).reduce((s,sh)=>s+(Number(sh.hours)||0),0);
          const tips  = (w.tips??[]).reduce((s,t)=>s+(Number(t.amount)||0),0);
          return { label: weekStartToLabel(w.weekStart), hours, tips };
        });
      } else {
        // "All Months": aggregate every week into its month
        const byMonth = {};
        allWeeksForTrends.forEach(w => {
          const k = toMonthKey(w.weekStart);
          if (!byMonth[k]) byMonth[k] = { hours:0, tips:0, label: monthKeyToLabel(k, {month:"short",year:"numeric"}) };
          byMonth[k].hours += (w.shifts??[]).reduce((s,sh)=>s+(Number(sh.hours)||0),0);
          byMonth[k].tips  += (w.tips??[]).reduce((s,t)=>s+(Number(t.amount)||0),0);
        });
        chartPoints = Object.entries(byMonth).sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>v);
      }
    }

    const maxHours = chartPoints.length ? Math.max(...chartPoints.map(p=>p.hours)) || 1 : 1;
    const maxTips  = chartPoints.length ? Math.max(...chartPoints.map(p=>p.tips))  || 1 : 1;

    // SVG chart dimensions — PAD_L=38 for Y-axis breathing room, PAD_R=18 so right labels don't clip
    const SVG_W = 320, SVG_H = 160, PAD_L = 38, PAD_R = 18, PAD_T = 16, PAD_B = 36;
    const plotW = SVG_W - PAD_L - PAD_R;
    const plotH = SVG_H - PAD_T - PAD_B;
    const n = chartPoints.length;
    const getX2 = i => n <= 1 ? PAD_L + plotW/2 : PAD_L + (plotW * i) / (n-1);
    const barW = n <= 1 ? 20 : Math.max(1.5, Math.min(18, plotW/(n*1.6)));
    const getBarX = i => n <= 1 ? PAD_L + plotW/2 - barW/2 : PAD_L + (plotW * i) / (n-1) - barW/2;
    const getHY = v => PAD_T + plotH * (1 - v/maxHours);
    const getTY = v => PAD_T + plotH * (1 - v/maxTips);
    const tipsLinePts = chartPoints.map((p,i)=>`${getX2(i)},${getTY(p.tips)}`).join(" ");
    // Horizontal grid lines
    const gridLines = [0.25, 0.5, 0.75, 1].map(f => PAD_T + plotH*(1-f));

    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ maxWidth: "700px", margin: "0 auto", padding: "1.5rem" }}
      >
        <style>{css}</style>
        <div className="animated-bg" />
        {showTrends && (
          <div className="modal-overlay" onClick={() => setShowTrends(false)}>
            <div
              className="glass-panel anim-enter"
              style={{ maxWidth: "440px", width: "93%", padding: "1.6rem 1.4rem 1.5rem" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.1rem" }}>
                <div>
                  <div style={{ fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.16em", color:colors.textMuted, marginBottom:"0.2rem" }}>Performance</div>
                  <div style={{ fontSize:"1.15rem", fontWeight:700, letterSpacing:"-0.01em" }}>Trends</div>
                </div>
                <button type="button" onClick={()=>setShowTrends(false)} style={{ borderRadius:"999px", padding:"0.22rem 0.75rem", border:`1px solid ${colors.glassBorder}`, background:"transparent", color:colors.textMuted, fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.1em", cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>✕ Close</button>
              </div>

              {/* Filter row */}
              <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1rem", alignItems:"center", flexWrap:"wrap" }}>
                {/* View mode pills */}
                {[{id:"weekly",label:"Weekly"},{id:"monthly",label:"Monthly"}].map(({id,label}) => (
                  <button key={id} type="button"
                    onClick={() => {
                      setTrendsViewMode(id);
                      const now = new Date();
                      setTrendsSelectedMonth(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);
                      setTrendsAnimKey(k=>k+1);
                    }}
                    style={{
                      padding:"0.28rem 0.85rem", borderRadius:999,
                      border: trendsViewMode===id ? "1px solid rgba(99,102,241,0.6)" : `1px solid ${colors.glassBorder}`,
                      background: trendsViewMode===id
                        ? (isDark ? "rgba(99,102,241,0.22)" : "rgba(99,102,241,0.12)")
                        : "transparent",
                      color: trendsViewMode===id ? (isDark?"#c7d2fe":"#4f46e5") : colors.textMuted,
                      fontSize:"0.65rem", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase",
                      cursor:"pointer", transition:"all 0.18s ease", WebkitTapHighlightColor:"transparent",
                    }}
                  >{label}</button>
                ))}

                {/* Month picker — value="" means All */}
                {trendMonthKeys.length > 0 && (
                  <div style={{ marginLeft:"auto", position:"relative" }}>
                    <select
                      value={trendsSelectedMonth ?? ""}
                      onChange={e => {
                        setTrendsSelectedMonth(e.target.value || null);
                        setTrendsAnimKey(k => k + 1);
                      }}
                      style={{
                        appearance:"none", WebkitAppearance:"none",
                        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.8)",
                        border:`1px solid ${colors.glassBorder}`,
                        color:colors.text, borderRadius:999,
                        padding:"0.28rem 1.8rem 0.28rem 0.7rem",
                        fontSize:"0.65rem", fontWeight:600, letterSpacing:"0.06em",
                        cursor:"pointer", outline:"none",
                      }}
                    >
                      <option value="">{trendsViewMode === "weekly" ? "All Weeks" : "All Months"}</option>
                      {trendMonthKeys.map(k => (
                        <option key={k} value={k}>
                          {monthKeyToLabel(k, {month:"short",year:"numeric"})}
                        </option>
                      ))}
                    </select>
                    <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", fontSize:"0.5rem", color:colors.textMuted, pointerEvents:"none" }}>▼</span>
                  </div>
                )}
              </div>

              {chartPoints.length === 0 && (
                <div style={{ padding:"2rem 0.5rem", textAlign:"center", color:colors.textMuted, fontSize:"0.85rem" }}>
                  Log a few shifts to see your trends.
                </div>
              )}

              {chartPoints.length > 0 && (
                <>
                  {/* Legend */}
                  <div style={{ display:"flex", gap:"1rem", marginBottom:"0.75rem", justifyContent:"flex-end" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.62rem", color:colors.textMuted }}>
                      <div style={{ width:12, height:10, borderRadius:3, background:"linear-gradient(135deg,#6366f1,#818cf8)", opacity:0.85 }}/>
                      <span style={{ letterSpacing:"0.08em", textTransform:"uppercase" }}>Hours</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:"0.62rem", color:colors.textMuted }}>
                      <div style={{ width:20, height:2.5, borderRadius:999, background:"linear-gradient(90deg,#34d399,#10b981)" }}/>
                      <span style={{ letterSpacing:"0.08em", textTransform:"uppercase" }}>Tips</span>
                    </div>
                  </div>

                  {/* Combined SVG chart — re-mounts on trendsAnimKey for smooth fade-in */}
                  <div key={trendsAnimKey} className="trends-chart-fade" style={{ width:"100%", borderRadius:16, overflow:"hidden" }}>
                    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width:"100%", height:"auto", display:"block" }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9"/>
                          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.5"/>
                        </linearGradient>
                        <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity="1"/>
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7"/>
                        </linearGradient>
                        <linearGradient id="tipsLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#34d399"/>
                          <stop offset="100%" stopColor="#10b981"/>
                        </linearGradient>
                        <linearGradient id="tipsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity="0.18"/>
                          <stop offset="100%" stopColor="#34d399" stopOpacity="0"/>
                        </linearGradient>
                        <filter id="barGlow">
                          <feGaussianBlur stdDeviation="1.5" result="blur"/>
                          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                        </filter>
                      </defs>

                      {/* Grid lines */}
                      {gridLines.map((y,i) => (
                        <line key={i} x1={PAD_L} y1={y} x2={SVG_W-PAD_R} y2={y}
                          stroke={isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"} strokeWidth="1" strokeDasharray="3 3"/>
                      ))}

                      {/* Baseline */}
                      <line x1={PAD_L} y1={PAD_T+plotH} x2={SVG_W-PAD_R} y2={PAD_T+plotH}
                        stroke={isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.1)"} strokeWidth="1"/>

                      {/* Y-axis labels (hours, left) — pushed further left */}
                      {[0,0.5,1].map((f,i) => (
                        <text key={i} x={PAD_L-8} y={PAD_T+plotH*(1-f)+3}
                          textAnchor="end" fontSize="7" fill={isDark?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.3)"}>
                          {Math.round(maxHours*f)}h
                        </text>
                      ))}

                      {/* Bars — Weekly Hours */}
                      {chartPoints.map((p,i) => {
                        const bh = plotH*(p.hours/maxHours);
                        const by = PAD_T+plotH-bh;
                        const bx = getBarX(i);
                        const baseline = PAD_T + plotH;
                        return (
                          <g key={i}>
                            <rect x={bx} y={by} width={barW} height={Math.max(bh,1)} rx="3"
                              fill="url(#barGrad)" style={{ transition:"height 0.5s cubic-bezier(0.34,1.56,0.64,1), y 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}/>
                            {/* Value label — hidden in All Weeks mode */}
                            {!hideXLabels && bh > 10 && (
                              <text
                                x={bx+barW/2}
                                y={Math.min(baseline - 2, by + bh - 3)}
                                textAnchor="middle" fontSize="6"
                                fill={isDark?"rgba(199,210,254,0.75)":"rgba(79,70,229,0.75)"}
                              >
                                {p.hours % 1 === 0 ? `${p.hours}h` : `${p.hours.toFixed(1)}h`}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Tips area fill */}
                      {n > 1 && (
                        <polygon
                          points={[
                            ...chartPoints.map((p,i) => `${getX2(i)},${getTY(p.tips)}`),
                            `${getX2(n-1)},${PAD_T+plotH}`,
                            `${getX2(0)},${PAD_T+plotH}`,
                          ].join(" ")}
                          fill="url(#tipsAreaGrad)"
                        />
                      )}

                      {/* Tips line — no strokeDasharray so it always spans all points */}
                      {n > 1 && (
                        <polyline fill="none" stroke="url(#tipsLineGrad)"
                          strokeWidth={n > 16 ? 1.5 : 2}
                          strokeLinecap="round" strokeLinejoin="round"
                          points={tipsLinePts}/>
                      )}

                      {/* Tips dots — hidden when too many points to avoid visual noise */}
                      {chartPoints.map((p,i) => {
                        const dotR = n > 20 ? 0 : n > 12 ? 1.5 : 3;
                        if (dotR === 0) return null;
                        return (
                          <g key={i}>
                            <circle cx={getX2(i)} cy={getTY(p.tips)} r={dotR}
                              fill={isDark?"#111827":"#fff"} stroke="#34d399"
                              strokeWidth={dotR < 2 ? 1 : 1.5}/>
                            {/* Value label — hidden in All Weeks mode */}
                            {!hideXLabels && p.tips > 0 && (
                              <text x={getX2(i)} y={getTY(p.tips)-7} textAnchor="middle" fontSize="6.5"
                                fill={isDark?"rgba(52,211,153,0.85)":"rgba(16,185,129,0.95)"}>
                                ${Math.round(p.tips)}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* X-axis labels — hidden in All Weeks mode to avoid crowding */}
                      {!hideXLabels && chartPoints.map((p,i) => {
                        const show = n<=5 || i===0 || i===n-1 || i%Math.ceil(n/5)===0;
                        return show ? (
                          <text key={i} x={getX2(i)} y={SVG_H-6} textAnchor="middle" fontSize="7"
                            fill={isDark?"rgba(255,255,255,0.35)":"rgba(0,0,0,0.4)"}>
                            {p.label}
                          </text>
                        ) : null;
                      })}
                    </svg>
                  </div>

                  {/* Summary stats row — 2 cols, no Peak Week */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem", marginTop:"0.9rem" }}>
                    {[
                      { label:"Avg Hours", value: fmtHours(chartPoints.reduce((s,p)=>s+p.hours,0)/Math.max(1,chartPoints.length)) },
                      { label:"Total Tips", value: fmtMoney(chartPoints.reduce((s,p)=>s+p.tips,0)) },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)", borderRadius:12, padding:"0.6rem 0.5rem", textAlign:"center" }}>
                        <div style={{ fontSize:"0.58rem", textTransform:"uppercase", letterSpacing:"0.1em", color:colors.textMuted, marginBottom:3 }}>{stat.label}</div>
                        <div className="font-mono" style={{ fontSize:"0.88rem", fontWeight:700 }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", backdropFilter: "blur(10px)", padding: "1rem", borderRadius: "20px", border: `1px solid ${colors.glassBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
             <span>📜 HISTORY LOG</span>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setShowTrends(true)}
              style={{
                background: "transparent",
                borderRadius: "999px",
                border: "none",
                color: colors.textMuted,
                padding: "0.25rem 0.5rem",
                cursor: "pointer",
                fontSize: "0.7rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.8,
              }}
            >
              Trends
            </button>
            <button
              type="button"
              onClick={goToTracker}
              style={{
                background: "none",
                border: `1px solid ${colors.glassBorder}`,
                color: colors.text,
                padding: "0.5rem 1rem",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Back
            </button>
          </div>
        </header>

        {/* Compact month filter trigger + currently shown months */}
        {monthMeta.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "0.75rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: colors.textMuted }}>
                Months
              </span>
              <div style={{ fontSize: "0.8rem", color: colors.text, marginTop: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {monthMeta
                  .filter(m => visibleMonths.includes(m.key))
                  .map(m => m.label)
                  .join(", ") || "Latest"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMonthFilterOpen(true)}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "999px",
                border: `1px solid ${colors.glassBorder}`,
                background: isDark ? "rgba(15,23,42,0.8)" : "rgba(248,250,252,0.95)",
                color: colors.text,
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Filter
            </button>
          </div>
        )}

        {/* Month filter popup sheet */}
        {isMonthFilterOpen && (
          <div className="modal-overlay" onClick={() => setIsMonthFilterOpen(false)}>
            <div
              className="glass-panel month-filter-sheet"
              style={{
                padding: "1rem 1.25rem 1.1rem",
                borderRadius: "22px",
                background: isDark
                  ? "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94))"
                  : "linear-gradient(135deg, rgba(248,250,252,0.98), rgba(241,245,249,0.98))",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.12rem" }}>
                  <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: colors.textMuted }}>
                    Filter by
                  </span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>Month</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMonthFilterOpen(false)}
                  style={{
                    borderRadius: "999px",
                    padding: "0.3rem 0.75rem",
                    border: `1px solid ${colors.glassBorder}`,
                    background: "transparent",
                    color: colors.textMuted,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {monthMeta.map(m => {
                  const isActive = visibleMonths.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleMonthFilter(m.key)}
                      style={{
                        borderRadius: "999px",
                        padding: "0.35rem 0.75rem",
                        border: isActive
                          ? "1px solid rgba(248, 250, 252, 0.9)"
                          : `1px solid ${colors.glassBorder}`,
                        background: isActive
                          ? (isDark ? "rgba(148,163,253,0.25)" : "rgba(129,140,248,0.12)")
                          : "transparent",
                        color: isActive ? "#e5e7ff" : colors.textMuted,
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "999px",
                          background: isActive ? "#a5b4fc" : "transparent",
                          border: isActive ? "none" : `1px solid ${colors.glassBorder}`,
                        }}
                      />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {archives.length === 0 && (
          <div style={{ textAlign: "center", color: colors.textMuted, marginTop: "3rem" }}>No history available yet.</div>
        )}

        {sortedPeriodKeys.map(key => {
            const periodWeeks = groups[key];
            // Filter out pay periods whose weeks are all in months that are currently hidden
            const periodHasVisibleMonth = periodWeeks.some(({ week: w }) => {
              const d = new Date(w.weekStart);
              const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              return visibleMonths.length === 0 || visibleMonths.includes(mk);
            });
            if (!periodHasVisibleMonth) return null;
            periodWeeks.sort((a, b) => new Date(b.week.weekStart) - new Date(a.week.weekStart));
            const { range: periodRange } = formatSemimonthlyPayPeriod(key);
            const periodHoursTotal = periodWeeks.reduce(
              (acc, { periodShifts }) => acc + periodShifts.reduce((s, sh) => s + (Number(sh.hours) || 0), 0),
              0
            );
            const periodTipsTotal = periodWeeks.reduce(
              (acc, { periodShifts }) => acc + periodShifts.reduce((s, sh) => s + (Number(sh.tipAmount) || 0), 0),
              0
            );
            const isPeriodExpanded = !!expandedHistoryPeriods[key];
            const hiddenWeekCount = Math.max(0, periodWeeks.length - 2);
            const weeksToShow = isPeriodExpanded || hiddenWeekCount === 0
              ? periodWeeks
              : periodWeeks.slice(0, 2);

            return (
                <div key={key} className="glass-panel anim-enter" style={{ marginBottom: "2rem", overflow: "hidden" }}>
                    <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.4)", padding: "1rem 1.5rem", borderBottom: `1px solid ${colors.glassBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "0.7rem", color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>PAY PERIOD</div>
                            <div style={{ fontSize: "1rem", fontWeight: 700 }}>{periodRange}</div>
                        </div>
                    </div>
                    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {weeksToShow.map(({ week: wk, periodShifts }) => {
                            const wkShifts = periodShifts;
                            const wkTotal = wkShifts.reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
                            const wkTipsTotal = wkShifts.reduce((sum, s) => sum + (Number(s.tipAmount) || 0), 0);
                            const flatIndex = archives.findIndex(w => w && w.weekStart === wk.weekStart);
                            return (
                                <div key={wk.weekStart} style={{ padding: "1rem", background: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)", borderRadius: "16px", border: `1px solid ${colors.glassBorder}` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                          <div style={{ fontSize: "0.9rem", color: isDark ? "#e2e8f0" : "#334155" }}>{formatWeekRange(wk.weekStart)}</div>
                                          <button
                                            type="button"
                                            className="btn-edit-week"
                                            onClick={() => { setEditingArchiveIndex(flatIndex >= 0 ? flatIndex : null); goToTracker(); }}
                                            style={{ background: "transparent", border: "none", color: colors.textMuted, fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.02em", padding: 0, cursor: "pointer", transition: "color 0.2s ease", textAlign: "left" }}
                                          >
                                            Edit
                                          </button>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem", minWidth: "6.5rem" }}>
                                            <div className="font-mono" style={{ fontSize: "1rem", fontWeight: 600, color: "var(--primary)" }}>{fmtHoursUnit(wkTotal)}</div>
                                            {wkTipsTotal > 0 && (
                                              <div className="font-mono" style={{ fontSize: "0.7rem", fontWeight: 500, color: "#34d399", opacity: 0.9 }}>
                                                {fmtMoney(wkTipsTotal)}
                                              </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                                        {wkShifts.map((s, si) => (
                                            <div key={s.id ?? si} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}>
                                                <span>{getShiftMeta(s.type).emoji}</span>
                                                <span className="font-mono">{fmtHours(Number(s.hours) || 0)}</span>
                                            </div>
                                        ))}
                                        {wkShifts.length === 0 && <span style={{ fontSize: "0.7rem", color: colors.textMuted }}>No shifts</span>}
                                    </div>
                                </div>
                            )
                        })}
                        {hiddenWeekCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedHistoryPeriods(prev => ({ ...prev, [key]: !isPeriodExpanded }))}
                            style={{
                              background: "transparent",
                              border: `1px dashed ${colors.glassBorder}`,
                              borderRadius: "12px",
                              padding: "0.65rem 1rem",
                              color: colors.textMuted,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              cursor: "pointer",
                              width: "100%",
                            }}
                          >
                            {isPeriodExpanded
                              ? "Condense"
                              : "Earlier Weeks"}
                          </button>
                        )}
                    </div>
                    <div style={{ background: "rgba(99, 102, 241, 0.1)", padding: "0.8rem 1.5rem", borderTop: `1px solid ${colors.glassBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.2rem" }}>
                          <span style={{ fontSize: "0.75rem", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Period Total</span>
                          {periodTipsTotal > 0 && (
                            <span className="font-mono" style={{ fontSize: "0.7rem", fontWeight: 500, color: "#34d399" }}>
                              {fmtMoney(periodTipsTotal)} tips
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-grad" style={{ fontSize: "1.05rem", fontWeight: 700 }}>{fmtHoursUnit(periodHoursTotal)}</span>
                    </div>
                </div>
            );
        })}
      </div>
    )
  }

  // ─── SETUP VIEW ─────────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <style>{css}</style>
      <div className="animated-bg" />
      <div className="glass-panel anim-enter" style={{ maxWidth: "420px", width: "100%", padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem", textShadow: "0 0 30px rgba(99,102,241,0.5)" }}>📟</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>{nextWeekDate ? "New Week Setup" : "Hours Tracker"}</h1>
          {nextWeekDate && <div style={{ color: "var(--primary)", marginTop: "0.5rem", fontWeight: 600 }}>{formatWeekRange(nextWeekDate)}</div>}
        </div>
        <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { id: "limited", t: "Standard Schedule", d: "24h Weekly Cap" }, 
            { id: "unlimited", t: "Unlimited Schedule", d: "No Hourly Limit" }
          ].map(m => (
            <div key={m.id} onClick={() => setSetupMode(m.id)} className="glass-input" style={{ 
                padding: "1.2rem", borderRadius: "16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                border: setupMode === m.id ? "1px solid var(--primary)" : `1px solid ${colors.glassBorder}`,
                background: setupMode === m.id ? "rgba(99, 102, 241, 0.1)" : colors.glassInput
              }}>
              <div>
                <div style={{ fontWeight: 600 }}>{m.t}</div>
                <div style={{ fontSize: "0.8rem", color: colors.textMuted }}>{m.d}</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(120,120,120,0.3)", background: setupMode === m.id ? "var(--primary)" : "transparent", boxShadow: setupMode === m.id ? "0 0 10px var(--primary)" : "none" }} />
            </div>
          ))}
        </div>
        <button className="btn-liquid" onClick={startTracking}>{nextWeekDate ? "Start Week" : "Launch Tracker"}</button>
      </div>
    </div>
  );

  // ─── ACTIVE DASHBOARD VIEW ──────────────────────────────────────────────────
  const radius = 60;
  const circ = 2 * Math.PI * radius;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ maxWidth: "700px", margin: "0 auto", padding: "1.5rem" }}
    >
      <style>{css}</style>
      <div className="animated-bg" />
      
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", backdropFilter: "blur(10px)", padding: "1rem", borderRadius: "20px", border: `1px solid ${colors.glassBorder}`, position: "relative", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
          {/* FIXED: Added flexShrink: 0 to prevent squeezed circle */}
          <div style={{ width: 8, height: 8, flexShrink: 0, background: "#22d3ee", borderRadius: "50%", boxShadow: "0 0 10px #22d3ee" }} />
          <span>PAY PERIOD TRACKER</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems:"center" }}>
          <button onClick={toggleTheme} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", padding: "0 5px" }}>
             {isDark ? "☀️" : "🌙"}
          </button>
          <div style={{ width: 1, height: 16, background: colors.glassBorder }}></div>
          <div className="header-menu-wrap" ref={headerMenuRef}>
            <button
              className="header-menu-trigger"
              onClick={() => setIsHeaderMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              ⋯
            </button>
            {isHeaderMenuOpen && (
              <div className="header-menu-dropdown anim-scale-in">
                <button className="header-menu-item" onClick={() => { setIsHeaderMenuOpen(false); handleExport(); }}>EXPORT</button>
                <button className="header-menu-item" onClick={() => { setIsHeaderMenuOpen(false); triggerImportPicker(); }}>IMPORT</button>
                <button className="header-menu-item" onClick={() => { setIsHeaderMenuOpen(false); goToHistory(); }}>HISTORY</button>
                <div className="header-menu-divider"></div>
                <button className="header-menu-item danger" onClick={() => { setIsHeaderMenuOpen(false); requestReset(); }}>RESET</button>
              </div>
            )}
          </div>
          <input
            ref={importFileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFileSelected}
            style={{ display: "none" }}
          />
        </div>
      </header>

      {/* Editing archived week banner */}
      {safeEditIndex !== null && (
        <div
          className="glass-panel"
          style={{
            marginBottom: "1.25rem",
            padding: "0.7rem 1.3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            borderRadius: "999px",
            border: "1px solid rgba(129, 140, 248, 0.7)",
            background: isDark
              ? "radial-gradient(circle at 0% 0%, rgba(129,140,248,0.16), transparent 55%)"
              : "radial-gradient(circle at 0% 0%, rgba(129,140,248,0.09), transparent 55%)",
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              fontWeight: 500,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>✏️</span>
            <span style={{ opacity: 0.9 }}>Editing week · {formatWeekRange(weekStart)}</span>
          </span>
          <button
            type="button"
            onClick={doneEditingArchive}
            style={{
              background: "rgba(129,140,248,0.22)",
              color: "#e5e7ff",
              border: "1px solid rgba(129,140,248,0.7)",
              padding: "0.35rem 0.9rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* Hero Stats */}
      <div className="glass-panel anim-enter" style={{ padding: "2rem", display: "flex", alignItems: "center", gap: "2rem", marginBottom: "2rem", flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
        
        {/* Ring */}
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <svg width="150" height="150" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="grad-success" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#818cf8" /></linearGradient>
              <linearGradient id="grad-warn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
              <linearGradient id="grad-danger" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
              <linearGradient id="ring-shine-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.65)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            {/* Track */}
            <circle cx="75" cy="75" r={radius} fill="none"
              stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
              strokeWidth="8" />

            {/* Progress arc bloom — soft color-matched halo layer behind the arc */}
            {pct > 0 && (
              <circle
                cx="75" cy="75" r={radius} fill="none"
                stroke={`url(#${ringGradientId})`}
                strokeWidth="14"
                strokeDasharray={circ}
                strokeDashoffset={mode === "limited" ? circ * (1 - pct) : 0}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1s ease",
                  opacity: isDark ? 0.22 : 0.13,
                  filter: "blur(4px)",
                }}
              />
            )}

            {/* Progress arc */}
            <circle
              cx="75" cy="75" r={radius} fill="none"
              stroke={`url(#${ringGradientId})`}
              strokeWidth="8"
              strokeDasharray={circ}
              strokeDashoffset={mode === "limited" ? circ * (1 - pct) : 0}
              strokeLinecap="round"
              className={ringPulseActive ? "ring-pulse" : ""}
              style={{
                transition: "stroke-dashoffset 1s ease",
                filter: overLimit
                  ? "drop-shadow(0 0 5px rgba(239,68,68,0.7)) drop-shadow(0 0 10px rgba(239,68,68,0.35))"
                  : pct >= 0.85
                  ? "drop-shadow(0 0 5px rgba(251,191,36,0.7)) drop-shadow(0 0 10px rgba(251,191,36,0.35))"
                  : "drop-shadow(0 0 5px rgba(99,102,241,0.65)) drop-shadow(0 0 11px rgba(34,211,238,0.3))",
              }}
            />

            {/* Shine arc — a short bright segment that continuously orbits the ring.
                dasharray: [shineLen gap restOfRing] — only shineLen is lit, rest is transparent.
                dashoffset animates via .ring-shine-arc to spin it around. */}
            <circle
              cx="75" cy="75" r={radius} fill="none"
              stroke="url(#ring-shine-grad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${Math.round(circ * 0.18)} ${Math.round(circ * 0.82)}`}
              strokeDashoffset="0"
              className="ring-shine-arc"
              style={{ opacity: isDark ? 0.55 : 0.4, mixBlendMode: "screen" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span className="font-mono text-grad" style={{ fontSize: "1.8rem", fontWeight: 700 }}>{fmtHours(totalHours)}</span>
            <span style={{ fontSize: "0.7rem", color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Logged</span>
          </div>
        </div>

        {/* Text Data */}
        <div style={{ flex: 1, minWidth: "220px" }}>
          <div style={{ marginBottom: "0.9rem" }}>
            <div style={{ fontSize: "0.9rem", color: colors.textMuted, marginBottom: "0.35rem" }}>Current Period</div>
            <div
              className={weekTransition === "out" ? "week-date-out" : weekTransition === "in" ? "week-date-in" : ""}
              style={{ fontSize: "1.2rem", fontWeight: 600, whiteSpace: "nowrap" }}
            >
              {formatWeekRange(weekStart)}
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            {safeEditIndex == null && (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  ref={slideTrackRef}
                  onMouseDown={handleSlideNextStart}
                  onTouchStart={handleSlideNextStart}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    background: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(99,102,241,0.07)",
                    borderRadius: 999,
                    border: slideComplete
                      ? "1px solid rgba(99,241,158,0.5)"
                      : `1px solid ${isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.18)"}`,
                    padding: "4px",
                    height: 40,
                    width: "100%",
                    cursor: slideComplete ? "default" : "grab",
                    WebkitTapHighlightColor: "transparent",
                    userSelect: "none",
                    touchAction: "none",
                    transition: "border-color 0.3s ease",
                    boxShadow: isDark
                      ? "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.2)"
                      : "inset 0 1px 3px rgba(99,102,241,0.08), 0 1px 0 rgba(255,255,255,0.9)",
                  }}
                >
                  {/* Completion flood fill */}
                  {slideComplete && (
                    <div
                      className="slide-complete-fill"
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 999,
                        background: isDark
                          ? "linear-gradient(90deg, rgba(16,185,129,0.28), rgba(52,211,153,0.18))"
                          : "linear-gradient(90deg, rgba(16,185,129,0.2), rgba(52,211,153,0.12))",
                        pointerEvents: "none",
                        transformOrigin: "left center",
                      }}
                    />
                  )}

                  {/* Ripple ring on complete */}
                  {slideComplete && (
                    <div
                      className="slide-ripple"
                      style={{
                        position: "absolute",
                        top: "50%", left: "50%",
                        width: 32, height: 32,
                        marginTop: -16, marginLeft: -16,
                        borderRadius: "50%",
                        border: "1.5px solid rgba(52,211,153,0.7)",
                        pointerEvents: "none",
                        transformOrigin: "center",
                      }}
                    />
                  )}

                  {/* Track fill (drag progress) */}
                  {!slideComplete && (
                    <div
                      style={{
                        position: "absolute",
                        top: 4, bottom: 4, left: 4,
                        borderRadius: 999,
                        width: Math.max(0, slideThumbPx),
                        background: isDark
                          ? "linear-gradient(90deg, rgba(99,102,241,0.3), rgba(14,165,233,0.18))"
                          : "linear-gradient(90deg, rgba(99,102,241,0.15), rgba(56,189,248,0.1))",
                        transition: slideActiveRef.current ? "none" : "width 0.25s cubic-bezier(0.25,0.46,0.45,0.94)",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* Shimmer sweep on idle */}
                  {slideNextProgress === 0 && !slideComplete && (
                    <div style={{
                      position: "absolute",
                      top: 0, bottom: 0, left: 0,
                      width: "28%",
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
                      animation: "shimmer 2.8s ease-in-out infinite",
                      pointerEvents: "none",
                      borderRadius: 999,
                    }} />
                  )}

                  {/* Smoke particles */}
                  {smokeParticles.map(p => (
                    <div
                      key={p.id}
                      className="smoke-particle"
                      style={{
                        width: p.size,
                        height: p.size,
                        left: p.x - p.size / 2,
                        top: `${p.y}%`,
                        marginTop: -(p.size / 2),
                        "--smoke-opacity": p.opacity,
                        "--smoke-dx": `${p.dx * 12}px`,
                        "--smoke-dy": `${p.dy * 10}px`,
                        zIndex: 1,
                        filter: "blur(1.5px)",
                      }}
                    />
                  ))}

                  {/* Plane icon — rides behind the thumb */}
                  {slideNextProgress > 0 && !slideComplete && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: THUMB_INSET,
                        transform: `translateX(${Math.max(0, slideThumbPx - 28)}px) translateY(-50%)`,
                        transition: slideActiveRef.current
                          ? "none"
                          : "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)",
                        pointerEvents: "none",
                        zIndex: 1,
                        fontSize: slideNextProgress > 0.85 ? "12px" : "10px",
                        lineHeight: 1,
                        letterSpacing: "-0.05em",
                        color: isDark ? "rgba(199,210,254,0.9)" : "rgba(79,70,229,0.85)",
                        filter: `drop-shadow(0 1px 3px ${isDark ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.4)"})`,
                        userSelect: "none",
                      }}
                    >
                      ᯓ✈︎
                    </div>
                  )}

                  {/* Thumb — morphs to checkmark on complete */}
                  <div
                    className={!slideComplete && slideNextProgress === 0 ? "slide-thumb-idle" : ""}
                    style={{
                      position: "absolute",
                      top: 4, bottom: 4, left: 4,
                      width: THUMB_W,
                      borderRadius: 999,
                      background: slideComplete
                        ? "linear-gradient(135deg, #10b981 0%, #34d399 100%)"
                        : isDark
                          ? "linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #0ea5e9 100%)"
                          : "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #38bdf8 100%)",
                      boxShadow: slideComplete
                        ? "0 0 18px rgba(52,211,153,0.65), 0 2px 8px rgba(0,0,0,0.3)"
                        : slideNextProgress > 0
                          ? (isDark ? "0 0 16px rgba(99,102,241,0.7), 0 2px 8px rgba(0,0,0,0.4)" : "0 0 14px rgba(99,102,241,0.5), 0 2px 6px rgba(0,0,0,0.15)")
                          : (isDark ? "0 2px 12px rgba(99,102,241,0.4)" : "0 2px 10px rgba(99,102,241,0.35)"),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `translateX(${slideThumbPx}px)`,
                      transition: slideActiveRef.current
                        ? "background 0.3s ease, box-shadow 0.2s ease"
                        : "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94), background 0.3s ease, box-shadow 0.2s ease",
                      zIndex: 2,
                      pointerEvents: "none",
                      flexShrink: 0,
                    }}
                  >
                    {/* Thumb shine */}
                    <div style={{
                      position: "absolute",
                      top: 2, left: 4, right: 4, height: "40%",
                      borderRadius: 999,
                      background: "linear-gradient(180deg, rgba(255,255,255,0.28), transparent)",
                      pointerEvents: "none",
                    }} />

                    {/* Chevrons → checkmark */}
                    {slideComplete ? (
                      <span
                        className="slide-check"
                        style={{
                          color: "rgba(255,255,255,0.97)",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          lineHeight: 1,
                          position: "relative",
                        }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        className={slideNextProgress === 0 ? "slide-chevron" : "slide-chevron-active"}
                        style={{
                          display: "flex", alignItems: "center",
                          color: "rgba(255,255,255,0.95)",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          letterSpacing: "-0.02em",
                          position: "relative",
                        }}
                      >
                        ›‍›
                      </span>
                    )}
                  </div>

                  {/* Label — fades as thumb moves, gone on complete */}
                  <span
                    style={{
                      position: "relative",
                      zIndex: 3,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      letterSpacing: "0.13em",
                      textTransform: "uppercase",
                      color: colors.text,
                      opacity: slideComplete
                        ? 0
                        : slideNextProgress > 0.45
                          ? Math.max(0, 1 - (slideNextProgress - 0.45) * 4)
                          : slideNextProgress > 0 ? 0.45 : 0.45,
                      transition: "opacity 0.15s ease",
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    swipe to next week
                  </span>
                </button>
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
            <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)", padding: "1rem", borderRadius: "16px", border: isDark ? "none" : `1px solid ${colors.glassBorder}` }}>
              <div style={{ fontSize: "0.7rem", color: colors.textMuted, marginBottom: "0.3rem" }}>REMAINING</div>
              <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: overLimit ? "#f87171" : "#22d3ee" }}>
                {mode === "unlimited" ? "∞" : overLimit ? `Exceed ${fmtHours(totalHours - WEEKLY_LIMIT)}` : fmtHours(Math.max(0, WEEKLY_LIMIT - totalHours))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)", padding: "1rem", borderRadius: "16px", border: isDark ? "none" : `1px solid ${colors.glassBorder}` }}>
                <div style={{ fontSize: "0.7rem", color: colors.textMuted, marginBottom: "0.3rem" }}>SHIFTS</div>
                <div className="font-mono" style={{ fontSize: "1.1rem", fontWeight: 700 }}>{shifts.length}</div>
              </div>
              <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)", padding: "1rem", borderRadius: "16px", border: isDark ? "none" : `1px solid ${colors.glassBorder}` }}>
                <div style={{ fontSize: "0.7rem", color: colors.textMuted, marginBottom: "0.3rem" }}>TIPS</div>
                <div className="font-mono" style={{ fontSize: "0.95rem", fontWeight: 600, color: totalTips > 0 ? "#34d399" : colors.textMuted, opacity: totalTips > 0 ? 1 : 0.7 }}>{fmtMoney(totalTips)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="glass-panel anim-enter" style={{ padding: "2rem", animationDelay: "0.1s", marginBottom: "2rem" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "1.5rem", color: isDark ? "white" : "#334155", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem" }}>❄️</span> New Entry
        </div>

        <div className="layout-grid" style={{ marginBottom: "1rem" }}>
          <CustomSelect label="Day of Week" value={formDay} options={DAYS.map((d, i) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            return { value: i, label: `${d} ${date.getDate()}`, emoji: null };
          })} onChange={(val) => setFormDay(val)} theme={theme} />
          <CustomSelect label="Shift Type" value={formType} options={SHIFT_TYPES.map(t => ({ value: t.value, label: t.label, emoji: t.emoji }))} onChange={(val) => setFormType(val)} theme={theme} />
        </div>

        <div className="layout-grid" style={{ marginBottom: "2rem", gridTemplateColumns: "1fr 1fr" }}>
          <div className="custom-select-container">
            <div className="input-label">Hours</div>
            <input type="number" step="0.5" placeholder="0.0" value={formHours} onChange={e => setFormHours(e.target.value)} className="glass-input font-mono" style={{ width: "100%", padding: "1rem 1.2rem", borderRadius: "16px", fontSize: "1rem", fontWeight: 700, height: "56px" }} onKeyDown={e => e.key === "Enter" && addShift()} />
          </div>
          <div className="custom-select-container">
            <div className="input-label">💵 Tips </div>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={formShiftTip}
              onChange={e => setFormShiftTip(e.target.value)}
              className="glass-input font-mono"
              style={{ width: "100%", padding: "1rem 1.2rem", borderRadius: "16px", fontSize: "0.95rem", height: "56px" }}
              onKeyDown={e => e.key === "Enter" && addShift()}
            />
          </div>
        </div>
        
        {formError && <div style={{ color: "#f87171", background: "rgba(239, 68, 68, 0.1)", padding: "1rem", borderRadius: "12px", marginBottom: "1rem", fontSize: "0.9rem" }}>⚠️ {formError}</div>}

        <button className="btn-liquid" onClick={addShift} disabled={!formHours || logVisualState === "pending"}>
          <span className="btn-liquid-inner">
            {logVisualState === "idle" && (
              <span>Log shift</span>
            )}
            {logVisualState === "pending" && (
              <span className="btn-dots">
                <span />
                <span />
                <span />
              </span>
            )}
            {logVisualState === "done" && <span>Logged</span>}
          </span>
        </button>
      </div>

      {/* History List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", paddingBottom: "4rem" }}>
        {shifts.slice().reverse().map((sh, idx) => {
          const meta = getShiftMeta(sh?.type);
          const shId = sh?.id ?? idx;
          const shHours = Number(sh?.hours) || 0;
          const dayIdx = Number(sh?.dayIndex) || 0;
          const shiftTip = Number(sh?.tipAmount) || 0;
          return (
            <div key={shId} className="glass-panel anim-enter" style={{ animationDelay: `${idx * 0.05}s`, padding: "1rem 1.5rem", borderRadius: "16px", display: "flex", alignItems: "center", gap: "1rem", borderLeft: `4px solid ${meta.color}` }}>
              <div style={{ fontSize: "1.5rem" }}>{meta.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>{DAYS[dayIdx] ?? "Day"}</div>
                <div style={{ fontSize: "0.8rem", color: colors.textMuted }}>{meta.label}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: "0.01rem", minWidth: "6.5rem" }}>
                <div className="font-mono text-grad" style={{ fontSize: "1.05rem", fontWeight: 700, whiteSpace: "nowrap" }}>{shHours % 1 === 0 ? `${shHours}h` : `${shHours.toFixed(2)}h`}</div>
                {shiftTip > 0 && (
                  <div className="font-mono" style={{ fontSize: "0.8rem", fontWeight: 500, color: "#34d399", opacity: 0.9, whiteSpace: "nowrap" }}>
                    {fmtMoney(shiftTip)}
                  </div>
                )}
              </div>
              <button onClick={() => deleteShift(shId)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: "none", color: "#f87171", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          )
        })}
      </div>

      {/* CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ padding: "2rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Confirm Full Reset</h3>
            <p style={{ fontSize: "0.85rem", color: colors.textMuted, lineHeight: 1.5, marginBottom: "1.5rem" }}>
              Delete all history and settings? <br />This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setShowResetConfirm(false)} style={{ flex: 1, padding: "0.8rem", borderRadius: "12px", border: `1px solid ${colors.glassBorder}`, background: "transparent", color: colors.textMuted, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmReset} style={{ flex: 1, padding: "0.8rem", borderRadius: "12px", border: "none", background: "var(--danger)", color: "white", fontWeight: 600, cursor: "pointer" }}>Delete All</button>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}