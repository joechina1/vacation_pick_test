/* global React, ReactDOM */
const { useState, useMemo, useEffect } = React;

// Detectives and colors
const DETECTIVES = [
  ["Patrick Tristram", "#4c8bf5"],
  ["William Luikart", "#46c077"],
  ["Alan Moreno", "#f5a24c"],
  ["Nkosi Henry", "#9b6ef3"],
  ["Brendan Combs", "#ef6a6a"],
  ["John Nardella", "#2cc6d3"],
];

const MAX_DAYS = 24;
const MAX_PICKS = 6;
const SUMMER_START = { m: 6, d: 21 }; // 1-based
const SUMMER_END = { m: 9, d: 3 };
const MAX_SUMMER_PICKS = 2;
const MAX_OFF_PER_DAY = 2;

const STORE_KEY = "vacation-picker-monthly-state";

function iso(d){ return d.toISOString().slice(0,10); }
function parseISO(s){ const d = new Date(s); if(Number.isNaN(d)) return null; return d; }
function daysBetweenInclusive(a,b){ const A = new Date(a.getFullYear(),a.getMonth(),a.getDate()); const B = new Date(b.getFullYear(),b.getMonth(),b.getDate()); return Math.floor((B-A)/(24*60*60*1000))+1; }
function eachDate(a,b){ const arr=[]; const cur=new Date(a.getFullYear(),a.getMonth(),a.getDate()); const end=new Date(b.getFullYear(),b.getMonth(),b.getDate()); while(cur<=end){ arr.push(new Date(cur)); cur.setDate(cur.getDate()+1);} return arr; }
function inSummer(d){ const y=d.getFullYear(); const s=new Date(y,SUMMER_START.m-1,SUMMER_START.d); const e=new Date(y,SUMMER_END.m-1,SUMMER_END.d); return d>=s && d<=e; }

function App(){
  const restored = (()=>{ try{ return JSON.parse(localStorage.getItem(STORE_KEY)||"null"); }catch{return null}})();

  const [year, setYear] = useState(restored?.year || new Date().getFullYear());
  const [month, setMonth] = useState(restored?.month || new Date().getMonth()); // 0-based
  const [picks, setPicks] = useState(restored?.picks || []); // [{name, startISO, endISO, days, summer}]
  const [schedule, setSchedule] = useState(restored?.schedule || {}); // {iso: [name]}
  const [selected, setSelected] = useState(restored?.selected || DETECTIVES[0][0]);
  const [startISO, setStartISO] = useState("");
  const [endISO, setEndISO] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(()=>{
    localStorage.setItem(STORE_KEY, JSON.stringify({year, month, picks, schedule, selected}));
  },[year, month, picks, schedule, selected]);

  const colorMap = useMemo(()=>Object.fromEntries(DETECTIVES),[]);

  // Summaries
  const summaries = useMemo(()=>{
    const map = {};
    for(const [name] of DETECTIVES){
      const my = picks.filter(p=>p.name===name);
      const used = my.reduce((n,p)=>n+p.days,0);
      const summers = my.filter(p=>p.summer).length;
      map[name] = { used, remain: Math.max(0, MAX_DAYS-used), picks: my.length, summers };
    }
    return map;
  },[picks]);

  function validate(name, s, e){
    if(!s || !e) return "Pick start and end dates.";
    if(e < s) return "End date cannot be before start date.";
    const days = daysBetweenInclusive(s,e);
    const info = summaries[name];
    if(info.picks + 1 > MAX_PICKS) return `Max ${MAX_PICKS} picks reached.`;
    if(info.used + days > MAX_DAYS) return `Adding this exceeds ${MAX_DAYS} days.`;
    const summer = eachDate(s,e).some(inSummer);
    if(summer && info.summers + 1 > MAX_SUMMER_PICKS) return `Summer picks cap is ${MAX_SUMMER_PICKS}.`;
    // per-day capacity
    for(const d of eachDate(s,e)){
      const key = iso(d);
      const list = schedule[key] || [];
      if(list.includes(name)) return "Already off on at least one chosen day.";
      if(list.length >= MAX_OFF_PER_DAY) return `Capacity reached on ${d.toDateString()}.`;
    }
    return null;
  }

  function addPick(){
    const s = parseISO(startISO), e = parseISO(endISO);
    const err = validate(selected, s, e);
    if(err){ setWarning(err); return; }
    const days = daysBetweenInclusive(s,e);
    const summer = eachDate(s,e).some(inSummer);
    const next = [...picks, { name: selected, startISO, endISO, days, summer }];
    const nextSchedule = {...schedule};
    for(const d of eachDate(s,e)){
      const k = iso(d);
      nextSchedule[k] = [...(nextSchedule[k]||[]), selected];
    }
    setWarning("");
    setPicks(next);
    setSchedule(nextSchedule);
    setStartISO(""); setEndISO("");
  }

  function deletePick(idx){
    const pick = picks[idx];
    if(!pick) return;
    const s = parseISO(pick.startISO), e = parseISO(pick.endISO);
    const nextSchedule = {...schedule};
    for(const d of eachDate(s,e)){
      const k = iso(d);
      nextSchedule[k] = (nextSchedule[k]||[]).filter(n => n !== pick.name);
      if(nextSchedule[k].length === 0) delete nextSchedule[k];
    }
    const nextPicks = picks.slice(); nextPicks.splice(idx,1);
    setPicks(nextPicks);
    setSchedule(nextSchedule);
  }

  function monthMatrix(y,m){
    const first = new Date(y,m,1);
    const startIdx = (first.getDay()+6)%7; // make Monday=0
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = [];
    for(let i=0;i<startIdx;i++) cells.push(null);
    for(let d=1; d<=daysInMonth; d++) cells.push(new Date(y,m,d));
    while(cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const cells = monthMatrix(year, month);
  const monthName = new Date(year, month, 1).toLocaleString(undefined,{month:"long", year:"numeric"});

  return (
    <div className="app">
      <div className="header">
        <h1>Detective Vacation Picker</h1>
        <div className="badge">24 days • 6 picks • 2 summer picks • Max 1 off/day</div>
      </div>

      <div className="grid">
        {/* Left: Detectives + Legend */}
        <div className="card">
          <h2>Detectives</h2>
          {DETECTIVES.map(([name,color]) => (
            <button key={name} className={`detective-btn ${selected===name?"active":""}`} onClick={()=>setSelected(name)}>
              {name}
            </button>
          ))}
          <h2>Legend</h2>
          <div className="legend">
            {DETECTIVES.map(([name,color])=>(
              <div key={name} className="chip"><span className="dot" style={{background:color}}></span>{name}</div>
            ))}
          </div>
        </div>

        {/* Middle: Calendar */}
        <div className="card calendar">
          <div className="month-bar">
            <button className="ghost" onClick={()=>{
              const nm = month-1; if(nm<0){ setMonth(11); setYear(y=>y-1);} else setMonth(nm);
            }}>◀</button>
            <div className="badge" style={{fontWeight:700}}>{monthName}</div>
            <button className="ghost" onClick={()=>{
              const nm = month+1; if(nm>11){ setMonth(0); setYear(y=>y+1);} else setMonth(nm);
            }}>▶</button>
          </div>
          <div className="month-grid">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>(<div key={d} className="dow">{d}</div>))}
            {cells.map((d, i) => {
              if(!d) return <div key={i} className="day" />;
              const key = iso(d);
              const who = schedule[key] || [];
              return (
                <div key={i} className="day">
                  <div className="num">{d.getDate()}</div>
                  {who.map(name => (
                    <div key={name} className="block" style={{background: colorMap[name]}}>
                      {name.split(" ")[0]}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Add & Picks List */}
        <div className="card">
          <h2>Add Pick</h2>
          <div className="controls">
            <div>
              <label>Start</label>
              <input type="date" value={startISO} onChange={e=>setStartISO(e.target.value)} />
            </div>
            <div>
              <label>End</label>
              <input type="date" value={endISO} onChange={e=>setEndISO(e.target.value)} />
            </div>
          </div>
          <div style={{marginTop:8}} className="controls" >
            <select value={selected} onChange={e=>setSelected(e.target.value)}>
              {DETECTIVES.map(([n])=>(<option key={n} value={n}>{n}</option>))}
            </select>
            <button className="primary" onClick={addPick}>Add</button>
          </div>
          {warning && <div className="warning" style={{marginTop:8}}>{warning}</div>}

          <h2 style={{marginTop:12}}>Picks</h2>
          <div className="list">
            {picks.length===0 && <div className="badge">No picks yet.</div>}
            {picks.map((p,idx)=> (
              <div className="list-item" key={idx}>
                <div>{p.name}</div>
                <div>{new Date(p.startISO).toLocaleDateString()} → {new Date(p.endISO).toLocaleDateString()} ({p.days}d){p.summer?" • Summer":""}</div>
                <div style={{textAlign:"right"}}><button className="ghost" onClick={()=>deletePick(idx)}>Delete</button></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h2>Summary</h2>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead>
            <tr><th style={{textAlign:"left"}}>Detective</th><th>Used</th><th>Remain</th><th>Picks</th><th>Summer</th></tr>
          </thead>
          <tbody>
            {DETECTIVES.map(([name])=>{
              const s = summaries[name] || {used:0, remain:MAX_DAYS, picks:0, summers:0};
              return (
                <tr key={name}>
                  <td>{name}</td>
                  <td style={{textAlign:"center"}}>{s.used}</td>
                  <td style={{textAlign:"center"}}>{s.remain}</td>
                  <td style={{textAlign:"center"}}>{s.picks}/{MAX_PICKS}</td>
                  <td style={{textAlign:"center"}}>{s.summers}/{MAX_SUMMER_PICKS}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
