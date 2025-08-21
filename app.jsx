/* global React, ReactDOM */
const { useState, useMemo, useEffect } = React;

// ---- Initial Data ----
const INITIAL_DETECTIVES = [
  "Patrick Tristram",
  "William Luikart",
  "Alan Moreno",
  "Nkosi Henry",
  "Brendan Combs",
  "John Nardella",
];

// ---- Default Config ----
const DEFAULT_CONFIG = {
  maxDaysPerDetective: 24,
  maxPicksPerDetective: 6,
  summerStart: { month: 6, day: 21 }, // 1-based for UX, converted in code
  summerEnd: { month: 9, day: 3 },
  summerPicksCap: 2,
  maxOffPerDay: 1,
  roundMode: true, // enforce seniority order; advance after each pick
  blackoutRanges: [
    // Example: { start: "2025-12-24", end: "2025-12-26" }
  ],
};

// ---- Helpers ----
function fmt(d) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function parseISO(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
function daysBetweenInclusive(a, b) {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  const ms = 24*60*60*1000;
  return Math.floor((B - A)/ms) + 1;
}
function eachDateInclusive(a, b) {
  const dates = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
function isSummer(d, config) {
  const y = d.getFullYear();
  const start = new Date(y, config.summerStart.month - 1, config.summerStart.day);
  const end = new Date(y, config.summerEnd.month - 1, config.summerEnd.day);
  return d >= start && d <= end;
}
function rangeHitsSummer(a, b, config) {
  return eachDateInclusive(a,b).some(d => isSummer(d, config));
}
function rangeHitsBlackout(a, b, config) {
  for (const r of config.blackoutRanges) {
    const s = parseISO(r.start);
    const e = parseISO(r.end);
    if (!s || !e) continue;
    const overlap = !(e < a || b < s);
    if (overlap) return true;
  }
  return false;
}
function dateKey(d) { return d.toISOString().slice(0,10); }

// ---- Persistence ----
const STORE_KEY = "vacation-picker-full-state";
function saveState(state) { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s) return s;
  } catch {}
  return null;
}
function clearState() { localStorage.removeItem(STORE_KEY); }

// ---- App ----
function App() {
  const restored = loadState();

  const [detectives, setDetectives] = useState(restored?.detectives || INITIAL_DETECTIVES);
  const [config, setConfig] = useState(restored?.config || DEFAULT_CONFIG);
  const [picksByDet, setPicksByDet] = useState(restored?.picksByDet || {});
  const [schedule, setSchedule] = useState(restored?.schedule || {}); // { 'YYYY-MM-DD': [names] }
  const [roundIndex, setRoundIndex] = useState(restored?.roundIndex || 0);

  const [selected, setSelected] = useState(null);
  const [startISO, setStartISO] = useState("");
  const [endISO, setEndISO] = useState("");

  // Persist
  useEffect(() => {
    saveState({ detectives, config, picksByDet, schedule, roundIndex });
  }, [detectives, config, picksByDet, schedule, roundIndex]);

  // Summaries per detective
  const detSummary = useMemo(() => {
    const out = {};
    for (const name of detectives) {
      const picks = picksByDet[name] || [];
      const usedDays = picks.reduce((n, p) => n + p.days, 0);
      const summerPicks = picks.filter(p => p.summer).length;
      out[name] = {
        picks,
        usedDays,
        remainingDays: Math.max(0, config.maxDaysPerDetective - usedDays),
        totalPicks: picks.length,
        summerPicks,
      };
    }
    return out;
  }, [picksByDet, detectives, config.maxDaysPerDetective]);

  // Current detective in round mode
  const currentDetective = config.roundMode ? detectives[roundIndex % detectives.length] : null;

  // --- Validation ---
  function validatePick(name, start, end) {
    const s = detSummary[name];

    // Dates valid
    if (!start || !end) return "Choose start and end dates.";
    if (end < start) return "End date cannot be before start date.";

    // Blackout
    if (rangeHitsBlackout(start, end, config)) {
      return "This range overlaps a blackout period.";
    }

    // Days count
    const days = daysBetweenInclusive(start, end);
    if (s.totalPicks + 1 > config.maxPicksPerDetective) {
      return `Limit reached: max ${config.maxPicksPerDetective} picks.`;
    }
    if (s.usedDays + days > config.maxDaysPerDetective) {
      return `Adding this pick exceeds ${config.maxDaysPerDetective} days.`;
    }

    // Per-day capacity
    for (const d of eachDateInclusive(start,end)) {
      const key = dateKey(d);
      const list = schedule[key] || [];
      const already = list.includes(name);
      if (already) return "Detective already off on at least one date in this range.";
      if (list.length >= config.maxOffPerDay) {
        return `Capacity reached on ${fmt(d)} (max ${config.maxOffPerDay} off).`;
      }
    }

    // Summer cap
    const wouldBeSummer = rangeHitsSummer(start, end, config);
    if (wouldBeSummer && s.summerPicks + 1 > config.summerPicksCap) {
      return `Summer picks cap reached (max ${config.summerPicksCap}).`;
    }

    // Round mode enforcement
    if (config.roundMode && currentDetective && currentDetective !== name) {
      return `Round mode: It is currently ${currentDetective}'s turn.`;
    }

    return null;
  }

  // --- Actions ---
  function addPick() {
    const name = selected || (config.roundMode ? currentDetective : null);
    if (!name) { alert("Select a detective (or use Round Mode)."); return; }
    const start = parseISO(startISO), end = parseISO(endISO);
    const err = validatePick(name, start, end);
    if (err) { alert(err); return; }

    const days = daysBetweenInclusive(start, end);
    const summer = rangeHitsSummer(start, end, config);

    setPicksByDet(prev => {
      const arr = prev[name] || [];
      return { ...prev, [name]: [...arr, { start: startISO, end: endISO, days, summer }] };
    });

    setSchedule(prev => {
      const clone = { ...prev };
      for (const d of eachDateInclusive(start, end)) {
        const k = dateKey(d);
        clone[k] = [...(clone[k] || []), name];
      }
      return clone;
    });

    // Advance round
    if (config.roundMode) {
      setRoundIndex(i => (i + 1) % detectives.length);
    }

    setStartISO("");
    setEndISO("");
  }

  function deletePick(name, idx) {
    const pick = (picksByDet[name] || [])[idx];
    if (!pick) return;
    const start = parseISO(pick.start), end = parseISO(pick.end);

    setPicksByDet(prev => {
      const arr = (prev[name] || []).slice();
      arr.splice(idx, 1);
      return { ...prev, [name]: arr };
    });

    setSchedule(prev => {
      const clone = { ...prev };
      for (const d of eachDateInclusive(start, end)) {
        const k = dateKey(d);
        clone[k] = (clone[k] || []).filter(n => n !== name);
        if (clone[k].length === 0) delete clone[k];
      }
      return clone;
    });
  }

  function resetAll() {
    if (!confirm("Reset all data? This cannot be undone.")) return;
    setPicksByDet({});
    setSchedule({});
    setRoundIndex(0);
    clearState();
  }

  function exportJSON() {
    const data = { detectives, config, picksByDet, schedule, roundIndex, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vacation-picker-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data) throw new Error("Invalid file");
        setDetectives(data.detectives || detectives);
        setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) });
        setPicksByDet(data.picksByDet || {});
        setSchedule(data.schedule || {});
        setRoundIndex(data.roundIndex || 0);
      } catch (e) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  }

  // --- Derived schedule table (sorted by date) ---
  const scheduleRows = useMemo(() => {
    const entries = Object.entries(schedule).sort((a,b) => a[0].localeCompare(b[0]));
    return entries.map(([iso, names]) => ({
      iso, names, date: fmt(parseISO(iso + "T12:00:00Z")) // ensure date-only parse
    }));
  }, [schedule]);

  // --- Admin controls (config) ---
  function addBlackoutRange(sIso, eIso) {
    if (!sIso || !eIso) return;
    const s = parseISO(sIso), e = parseISO(eIso);
    if (e < s) return alert("Blackout end before start.");
    setConfig(c => ({ ...c, blackoutRanges: [...c.blackoutRanges, { start: sIso, end: eIso }] }));
  }
  function removeBlackoutIndex(i) {
    setConfig(c => ({ ...c, blackoutRanges: c.blackoutRanges.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Detective Vacation Picker — Full</h1>
        <div className="flex">
          <span className="badge">Max {config.maxDaysPerDetective} days</span>
          <span className="badge">Max {config.maxPicksPerDetective} picks</span>
          <span className="badge">Summer cap {config.summerPicksCap} (Jun {config.summerStart.day}–Sep {config.summerEnd.day})</span>
          <span className="badge">Max off/day {config.maxOffPerDay}</span>
          {config.roundMode && <span className="badge">Round: {detectives[roundIndex % detectives.length]}</span>}
        </div>
      </div>

      <div className="grid">
        {/* Left: Detectives */}
        <div className="card">
          <h2>Detectives (Seniority)</h2>
          {detectives.map((name) => (
            <button
              key={name}
              className={`detective-btn ${selected === name ? "active" : ""}`}
              onClick={() => setSelected(name)}
              disabled={config.roundMode && currentDetective && currentDetective !== name}
              title={config.roundMode && currentDetective !== name ? `Round mode: waiting for ${currentDetective}` : ""}
            >
              {name}
            </button>
          ))}

          <div style={{ marginTop: 10 }} className="kv">
            <div className="key">Round Mode</div>
            <div className="val">
              <button className="ghost" onClick={() => setConfig(c => ({ ...c, roundMode: !c.roundMode }))}>
                {config.roundMode ? "On" : "Off"}
              </button>
            </div>

            {config.roundMode && (
              <>
                <div className="key">Current Turn</div>
                <div className="val">
                  <div className="flex">
                    <button className="ghost" onClick={() => setRoundIndex(i => (i - 1 + detectives.length) % detectives.length)}>◀</button>
                    <span style={{ padding: "0 6px", fontWeight: 700 }}>{detectives[roundIndex % detectives.length]}</span>
                    <button className="ghost" onClick={() => setRoundIndex(i => (i + 1) % detectives.length)}>▶</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Middle: Make a Pick */}
        <div className="card">
          <h2>Make a Pick</h2>
          <div className="controls">
            <div>
              <label>Start</label>
              <input type="date" value={startISO} onChange={e => setStartISO(e.target.value)} />
            </div>
            <div>
              <label>End</label>
              <input type="date" value={endISO} onChange={e => setEndISO(e.target.value)} />
            </div>
            <button className="primary" onClick={addPick}>Add Pick</button>
          </div>

          {selected && !config.roundMode && (
            <div style={{ marginTop: 8 }} className="badge">Active: {selected}</div>
          )}
          {config.roundMode && (
            <div style={{ marginTop: 8 }} className="badge">Round Turn: {detectives[roundIndex % detectives.length]}</div>
          )}

          <div className="picks-list" style={{ marginTop: 10 }}>
            {Object.entries(picksByDet).length === 0 && <div className="empty">No picks yet.</div>}
            {Object.entries(picksByDet).flatMap(([name, picks]) =>
              picks.map((p, i) => (
                <div key={`${name}-${i}`} className="pick-item">
                  <div>{name}</div>
                  <div>{fmt(parseISO(p.start))} → {fmt(parseISO(p.end))} ({p.days} day{p.days!==1?"s":""}) {p.summer && <span className="tag summer">Summer</span>}</div>
                  <div><button className="ghost" onClick={() => deletePick(name, i)}>Delete</button></div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Summary & Admin */}
        <div className="card">
          <h2>Summary</h2>
          <table className="table">
            <thead>
              <tr><th>Detective</th><th>Used</th><th>Remain</th><th>Picks</th><th>Summer</th></tr>
            </thead>
            <tbody>
              {detectives.map(name => {
                const s = detSummary[name] || { usedDays: 0, remainingDays: config.maxDaysPerDetective, totalPicks: 0, summerPicks: 0 };
                const remainClass = s.remainingDays === 0 ? "bad" : (s.remainingDays <= 4 ? "notice" : "ok");
                const summerClass = s.summerPicks > config.summerPicksCap ? "notice" : "";
                return (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{s.usedDays}</td>
                    <td className={remainClass}>{s.remainingDays}</td>
                    <td>{s.totalPicks}/{config.maxPicksPerDetective}</td>
                    <td className={summerClass}>{s.summerPicks}/{config.summerPicksCap}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h2 style={{ marginTop: 14 }}>Per‑Day Schedule</h2>
          <table className="table">
            <thead><tr><th>Date</th><th>Off</th></tr></thead>
            <tbody>
              {scheduleRows.length === 0 && <tr><td colSpan="2" className="empty">No days selected.</td></tr>}
              {scheduleRows.map(r => (
                <tr key={r.iso}>
                  <td>{r.iso}</td>
                  <td>{r.names.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 style={{ marginTop: 14 }}>Admin</h2>
          <div className="kv">
            <div className="key">Max off per day</div>
            <div className="val">
              <div className="flex">
                <input type="number" min="1" value={config.maxOffPerDay} onChange={e => setConfig(c => ({ ...c, maxOffPerDay: Math.max(1, Number(e.target.value)||1) }))} />
                <button className="ghost" onClick={() => setConfig(c => ({ ...c, maxOffPerDay: 1 }))}>Reset</button>
              </div>
            </div>

            <div className="key">Summer window</div>
            <div className="val">
              <div className="flex">
                <span className="badge">Start: {config.summerStart.month}/{config.summerStart.day}</span>
                <span className="badge">End: {config.summerEnd.month}/{config.summerEnd.day}</span>
              </div>
            </div>

            <div className="key">Summer picks cap</div>
            <div className="val">
              <div className="flex">
                <input type="number" min="0" value={config.summerPicksCap} onChange={e => setConfig(c => ({ ...c, summerPicksCap: Math.max(0, Number(e.target.value)||0) }))} />
                <button className="ghost" onClick={() => setConfig(c => ({ ...c, summerPicksCap: 2 }))}>Reset</button>
              </div>
            </div>

            <div className="key">Blackouts</div>
            <div className="val">
              {config.blackoutRanges.length === 0 && <div className="empty" style={{ marginBottom: 6 }}>None</div>}
              {config.blackoutRanges.map((r,i) => (
                <div key={i} className="flex">
                  <span className="tag blackout">{r.start} → {r.end}</span>
                  <button className="ghost" onClick={() => removeBlackoutIndex(i)}>Remove</button>
                </div>
              ))}
              <div className="flex" style={{ marginTop: 6 }}>
                <input type="date" id="boS" />
                <input type="date" id="boE" />
                <button className="ghost" onClick={() => {
                  const s = document.getElementById("boS").value;
                  const e = document.getElementById("boE").value;
                  addBlackoutRange(s, e);
                }}>Add</button>
              </div>
            </div>

            <div className="key">Data</div>
            <div className="val">
              <div className="flex">
                <button className="ghost" onClick={exportJSON}>Export JSON</button>
                <label className="ghost" style={{ border: "1px solid rgba(255,255,255,0.12)", padding: "8px 10px", borderRadius: "10px", cursor: "pointer" }}>
                  Import JSON
                  <input type="file" accept="application/json" style={{ display: "none" }} onChange={e => e.target.files[0] && importJSON(e.target.files[0])} />
                </label>
                <button className="ghost" onClick={resetAll}>Reset All</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
