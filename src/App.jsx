import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS & DATA ─────────────────────────────────────────────────────────
const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];

const SHIFT_TYPES = [
  { value: "morning",   label: "Morning",   emoji: "🌅", color: "#fbbf24", gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)" },
  { value: "evening",   label: "Evening",   emoji: "🌙", color: "#818cf8", gradient: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)" },
  { value: "full",      label: "Full Day",  emoji: "☀️", color: "#38bdf8", gradient: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)" },
  { value: "other",     label: "Other",     emoji: "📋", color: "#94a3b8", gradient: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)" },
];
const WEEKLY_LIMIT = 24;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function getShiftMeta(type) {
  return SHIFT_TYPES.find(s => s.value === type) || SHIFT_TYPES[3];
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

function formatPayPeriodRange(startDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 13); 
    const opts = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-CA", opts)} – ${end.toLocaleDateString("en-CA", opts)}`;
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
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
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
    archivedWeeks: [],
  };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function WeeklyHoursTracker() {
  const [appState, setAppState] = useState(null);
  const [phase, setPhase] = useState("setup"); 
  const [setupMode, setSetupMode] = useState("limited");
  const [nextWeekDate, setNextWeekDate] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // THEME STATE
  const [theme, setTheme] = useState("dark");

  // Form state
  const [formDay, setFormDay] = useState(0); 
  const [formType, setFormType] = useState("morning");
  const [formHours, setFormHours] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formError, setFormError] = useState("");
  const [justAdded, setJustAdded] = useState(null);

  const bottomRef = useRef(null);

  // Load / Save Data & Theme
  useEffect(() => {
    const saved = loadData();
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) setTheme(savedTheme);

    if (saved && saved.shifts !== undefined) {
      setAppState(saved);
      setPhase("active");
    } else {
      setPhase("setup");
    }
  }, []);

  useEffect(() => { if (appState) saveData(appState); }, [appState]);
  useEffect(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { if (justAdded && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [justAdded]);

  // Derived
  const shifts = appState?.shifts || [];
  const mode = appState?.mode || "limited";
  const weekStart = appState ? new Date(appState.weekStart) : getRealWorldSaturday();
  const totalHours = shifts.reduce((s, sh) => s + sh.hours, 0);
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
    if (isNaN(h) || h <= 0 || h > 24) { setFormError("Enter valid hours (0.1 – 24)"); return; }
    setFormError("");
    const newShift = { id: Date.now(), dayIndex: formDay, type: formType, hours: h, note: formNote.trim(), timestamp: new Date().toISOString() };
    setAppState(prev => ({ ...prev, shifts: [...prev.shifts, newShift] }));
    setJustAdded(newShift.id);
    setFormHours(""); setFormNote("");
    setTimeout(() => setJustAdded(null), 1800);
  };

  const deleteShift = (id) => {
    setAppState(prev => ({ ...prev, shifts: prev.shifts.filter(s => s.id !== id) }));
  };

  const prepareNextWeek = () => {
    const currentArchive = { weekStart: appState.weekStart, shifts: appState.shifts, totalHours, mode: appState.mode };
    const nextSat = new Date(appState.weekStart);
    nextSat.setDate(nextSat.getDate() + 7);
    setAppState(prev => ({ ...prev, archivedWeeks: [...(prev.archivedWeeks || []), currentArchive], shifts: [] }));
    setNextWeekDate(nextSat.toISOString()); 
    setPhase("setup"); 
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
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
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
    }
    .animated-bg { 
      position: fixed; inset: 0; z-index: -1; 
      background: ${isDark 
        ? "radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.15), transparent 25%)"
        : "radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.12), transparent 35%), radial-gradient(circle at 85% 30%, rgba(236, 72, 153, 0.12), transparent 35%)"}; 
      animation: pulseBg 10s ease-in-out infinite alternate; 
    }
    @keyframes pulseBg { 0% { opacity: 0.5; transform: scale(1); } 100% { opacity: 0.8; transform: scale(1.1); } }
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
    .select-trigger { display: flex; justify-content: space-between; alignItems: center; padding: 1rem 1.2rem; border-radius: 16px; font-size: 0.95rem; font-weight: 500; user-select: none; }
    .select-trigger .arrow { font-size: 0.7rem; color: ${colors.textMuted}; transition: transform 0.3s ease; }
    .select-trigger .arrow.open { transform: rotate(180deg); color: var(--primary); }
    .select-dropdown { position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 100; overflow: hidden; padding: 0.5rem; background: ${colors.dropdownBg}; border-radius: 16px; border: 1px solid ${colors.glassBorder}; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .select-option { padding: 0.8rem 1rem; border-radius: 12px; cursor: pointer; display: flex; alignItems: center; gap: 0.8rem; transition: all 0.2s; font-size: 0.9rem; color: ${colors.text}; }
    .select-option:hover { background: rgba(99, 102, 241, 0.1); color: var(--primary); transform: translateX(4px); }
    .select-option.selected { background: var(--primary); color: white; }
    .btn-liquid { position: relative; background: linear-gradient(135deg, var(--primary) 0%, #818cf8 100%); color: white; border: none; padding: 1rem; border-radius: 16px; font-weight: 600; font-size: 0.95rem; cursor: pointer; width: 100%; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3); transition: all 0.2s; overflow: hidden; }
    .btn-liquid:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5); }
    .btn-liquid:active { transform: scale(0.98); }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .text-grad { background: ${isDark ? "linear-gradient(to right, #fff, #cbd5e1)" : "linear-gradient(to right, #1e293b, #475569)"}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .layout-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
    @media (min-width: 600px) { .layout-grid { grid-template-columns: 1fr 1fr; } }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease; }
    .modal-content { max-width: 320px; width: 90%; text-align: center; border: 1px solid rgba(239, 68, 68, 0.3); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .anim-scale-in { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .anim-enter { animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  `;

  // ─── HISTORY VIEW ───────────────────────────────────────────────────────────
  if (phase === "history") {
    const archives = appState?.archivedWeeks || [];
    const ANCHOR = new Date("2026-01-17T00:00:00").getTime(); 
    const groups = {};
    archives.forEach(week => {
        const d = new Date(week.weekStart);
        const diff = d.getTime() - ANCHOR;
        const daysDiff = Math.floor(diff / (86400000));
        const periodIdx = Math.floor(daysDiff / 14);
        if (!groups[periodIdx]) groups[periodIdx] = [];
        groups[periodIdx].push(week);
    });
    const sortedPeriodKeys = Object.keys(groups).sort((a, b) => b - a);

    return (
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "1.5rem" }}>
        <style>{css}</style>
        <div className="animated-bg" />
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", backdropFilter: "blur(10px)", padding: "1rem", borderRadius: "20px", border: `1px solid ${colors.glassBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
             <span>📜 HISTORY LOG</span>
          </div>
          <button onClick={() => setPhase("active")} style={{ background: "none", border: `1px solid ${colors.glassBorder}`, color: colors.text, padding: "0.5rem 1rem", borderRadius: "10px", cursor: "pointer", fontSize: "0.8rem" }}>BACK</button>
        </header>

        {archives.length === 0 && (
          <div style={{ textAlign: "center", color: colors.textMuted, marginTop: "3rem" }}>No history available yet.</div>
        )}

        {sortedPeriodKeys.map(key => {
            const periodWeeks = groups[key];
            periodWeeks.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
            const pStart = new Date(ANCHOR + (key * 14 * 86400000));
            const periodTotal = periodWeeks.reduce((acc, wk) => acc + wk.shifts.reduce((s, sh) => s + sh.hours, 0), 0);

            return (
                <div key={key} className="glass-panel anim-enter" style={{ marginBottom: "2rem", overflow: "hidden" }}>
                    <div style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.4)", padding: "1rem 1.5rem", borderBottom: `1px solid ${colors.glassBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "0.7rem", color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>PAY PERIOD</div>
                            <div style={{ fontSize: "1rem", fontWeight: 700 }}>{formatPayPeriodRange(pStart)}</div>
                        </div>
                    </div>
                    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {periodWeeks.map((wk, i) => {
                            const wkTotal = wk.shifts.reduce((sum, s) => sum + s.hours, 0);
                            return (
                                <div key={i} style={{ padding: "1rem", background: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.5)", borderRadius: "16px", border: `1px solid ${colors.glassBorder}` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                                        <div style={{ fontSize: "0.9rem", color: isDark ? "#e2e8f0" : "#334155" }}>{formatWeekRange(wk.weekStart)}</div>
                                        <div className="font-mono" style={{ fontSize: "1rem", color: "var(--primary)" }}>{fmtHours(wkTotal)}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                                        {wk.shifts.map((s, si) => (
                                            <div key={si} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "4px" }}>
                                                <span>{getShiftMeta(s.type).emoji}</span>
                                                <span className="font-mono">{fmtHours(s.hours)}</span>
                                            </div>
                                        ))}
                                        {wk.shifts.length === 0 && <span style={{ fontSize: "0.7rem", color: colors.textMuted }}>No shifts</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div style={{ background: "rgba(99, 102, 241, 0.1)", padding: "0.8rem 1.5rem", borderTop: `1px solid ${colors.glassBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Bi-Weekly</span>
                        <span className="font-mono text-grad" style={{ fontSize: "1.1rem", fontWeight: 700 }}>{fmtHours(periodTotal)}</span>
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
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "1.5rem" }}>
      <style>{css}</style>
      <div className="animated-bg" />
      
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", backdropFilter: "blur(10px)", padding: "1rem", borderRadius: "20px", border: `1px solid ${colors.glassBorder}` }}>
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
          <button onClick={() => setPhase("history")} style={{ background: "none", border: "none", color: colors.textMuted, fontSize: "0.8rem", cursor: "pointer", letterSpacing: "0.1em" }}>HISTORY</button>
          <button onClick={requestReset} style={{ background: "none", border: "none", color: colors.textMuted, fontSize: "0.8rem", cursor: "pointer", letterSpacing: "0.1em" }}>RESET</button>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="glass-panel anim-enter" style={{ padding: "2rem", display: "flex", alignItems: "center", gap: "2rem", marginBottom: "2rem", flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
        
        {/* Ring */}
        <div style={{ position: "relative", width: 150, height: 150 }}>
          <svg width="150" height="150" style={{ transform: "rotate(-90deg)" }}>
            <defs>
              <linearGradient id="grad-success" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#818cf8" /></linearGradient>
              <linearGradient id="grad-warn" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient>
              <linearGradient id="grad-danger" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f87171" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
            </defs>
            <circle cx="75" cy="75" r={radius} fill="none" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="8" />
            <circle cx="75" cy="75" r={radius} fill="none" stroke={`url(#${ringGradientId})`} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={mode === "limited" ? circ * (1 - pct) : 0} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span className="font-mono text-grad" style={{ fontSize: "1.8rem", fontWeight: 700 }}>{fmtHours(totalHours)}</span>
            <span style={{ fontSize: "0.7rem", color: colors.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Logged</span>
          </div>
        </div>

        {/* Text Data */}
        <div style={{ flex: 1, minWidth: "220px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <div style={{ fontSize: "0.9rem", color: colors.textMuted, marginBottom: "0.5rem" }}>Current Period</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1.5rem", whiteSpace: "nowrap" }}>{formatWeekRange(weekStart)}</div>
            </div>
            <button onClick={prepareNextWeek} style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid var(--primary)", color: "var(--primary)", fontSize: "0.75rem", fontWeight: 700, padding: "0.8rem 1.2rem", borderRadius: "12px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>New Week →</button>
          </div>
          
          <div className="layout-grid" style={{ gap: "1rem", marginTop: "1rem" }}>
            <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)", padding: "1rem", borderRadius: "16px", border: isDark ? "none" : `1px solid ${colors.glassBorder}` }}>
              <div style={{ fontSize: "0.7rem", color: colors.textMuted, marginBottom: "0.3rem" }}>REMAINING</div>
              <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: overLimit ? "#f87171" : "#22d3ee" }}>
                {mode === "unlimited" ? "∞" : overLimit ? `Exceed ${fmtHours(totalHours - WEEKLY_LIMIT)}` : fmtHours(Math.max(0, WEEKLY_LIMIT - totalHours))}
              </div>
            </div>
            <div style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)", padding: "1rem", borderRadius: "16px", border: isDark ? "none" : `1px solid ${colors.glassBorder}` }}>
              <div style={{ fontSize: "0.7rem", color: colors.textMuted, marginBottom: "0.3rem" }}>SHIFTS</div>
              <div className="font-mono" style={{ fontSize: "1.2rem", fontWeight: 700 }}>{shifts.length}</div>
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
          <CustomSelect label="Day of Week" value={formDay} options={DAYS.map((d, i) => ({ value: i, label: `${d}`, emoji: null }))} onChange={(val) => setFormDay(val)} theme={theme} />
          <CustomSelect label="Shift Type" value={formType} options={SHIFT_TYPES.map(t => ({ value: t.value, label: t.label, emoji: t.emoji }))} onChange={(val) => setFormType(val)} theme={theme} />
        </div>

        <div className="layout-grid" style={{ marginBottom: "2rem", gridTemplateColumns: "1fr 2fr" }}>
          <div className="custom-select-container">
            <div className="input-label">Hours</div>
            <input type="number" step="0.5" placeholder="0.0" value={formHours} onChange={e => setFormHours(e.target.value)} className="glass-input font-mono" style={{ width: "100%", padding: "1rem 1.2rem", borderRadius: "16px", fontSize: "1rem", fontWeight: 700, height: "56px" }} onKeyDown={e => e.key === "Enter" && addShift()} />
          </div>
          <div className="custom-select-container">
            <div className="input-label">Note (Optional)</div>
            <input type="text" placeholder="Details..." value={formNote} onChange={e => setFormNote(e.target.value)} className="glass-input" style={{ width: "100%", padding: "1rem 1.2rem", borderRadius: "16px", fontSize: "0.95rem", height: "56px" }} onKeyDown={e => e.key === "Enter" && addShift()} />
          </div>
        </div>
        
        {formError && <div style={{ color: "#f87171", background: "rgba(239, 68, 68, 0.1)", padding: "1rem", borderRadius: "12px", marginBottom: "1rem", fontSize: "0.9rem" }}>⚠️ {formError}</div>}

        <button className="btn-liquid" onClick={addShift} disabled={!formHours}>Log Shift +</button>
      </div>

      {/* History List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", paddingBottom: "4rem" }}>
        {shifts.slice().reverse().map((sh, idx) => {
          const meta = getShiftMeta(sh.type);
          return (
            <div key={sh.id} className="glass-panel anim-enter" style={{ animationDelay: `${idx * 0.05}s`, padding: "1rem 1.5rem", borderRadius: "16px", display: "flex", alignItems: "center", gap: "1rem", borderLeft: `4px solid ${meta.color}` }}>
              <div style={{ fontSize: "1.5rem" }}>{meta.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>{meta.label}</div>
                <div style={{ fontSize: "0.8rem", color: colors.textMuted }}>{DAYS[sh.dayIndex]} {sh.note ? `• ${sh.note}` : ""}</div>
              </div>
              <div className="font-mono text-grad" style={{ fontSize: "1.1rem", fontWeight: 700 }}>{fmtHours(sh.hours)}</div>
              <button onClick={() => deleteShift(sh.id)} style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: "none", color: "#f87171", width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
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