/* global React, ReactDOM */
const { useState, useMemo } = React;
const DETECTIVES=["Patrick Tristram","William Luikart","Alan Moreno","Nkosi Henry","Brendan Combs","John Nardella"];
const DETECTIVE_COLORS = {
  "Patrick Tristram": "#e57373",
  "William Luikart": "#64b5f6",
  "Alan Moreno": "#81c784",
  "Nkosi Henry": "#ffd54f",
  "Brendan Combs": "#ba68c8",
  "John Nardella": "#ff8a65"
};
const MAX_DAYS=24,MAX_PICKS=6;

function isDateInSummer(d){const y=d.getFullYear();return d>=new Date(y,5,21)&&d<=new Date(y,8,3);}
function rangesOverlapSummer(s,e){let c=new Date(s);while(c<=e){if(isDateInSummer(c))return true;c.setDate(c.getDate()+1);}return false;}
function daysBetweenInclusive(a,b){return Math.floor((b-a)/(1000*60*60*24))+1;}
function formatDate(d){return d.toLocaleDateString();}

// Utility to get all days in a range
function getDatesInRange(start, end) {
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Calendar for a given month and year
function Calendar({ picksByDate, detectiveColors }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  // Get days to display for the calendar grid (including empty slots for alignment)
  function getCalendarGrid(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const grid = [];
    // Fill leading blanks
    for(let i=0; i<startDayOfWeek; ++i) grid.push(null);
    // Fill days
    for(let d=1; d<=daysInMonth; ++d) grid.push(new Date(year, month, d));
    // Fill trailing blanks
    while(grid.length % 7 !== 0) grid.push(null);
    return grid;
  }

  const grid = getCalendarGrid(year, month);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y-1);}
    else setMonth(m => m-1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y+1);}
    else setMonth(m => m+1);
  }

  return (
    <div className="calendar-card card">
      <h2>
        <button onClick={prevMonth}>&lt;</button>
        {" "}{new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}{" "}
        <button onClick={nextMonth}>&gt;</button>
      </h2>
      <table className="calendar-table">
        <thead>
          <tr>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({length: grid.length/7}).map((_, row) => (
            <tr key={row}>
              {grid.slice(row*7, row*7+7).map((date, col) => {
                let cell = null;
                if (date) {
                  const key = date.toISOString().slice(0,10);
                  const detectives = picksByDate[key] || [];
                  cell = (
                    <div className="calendar-cell">
                      <div className="calendar-date">{date.getDate()}</div>
                      <div className="calendar-picks">
                        {detectives.map((det,i) =>
                          <span
                            key={det}
                            className="calendar-dot"
                            style={{
                              background: detectiveColors[det] || '#bbb',
                              border: "1px solid #aaa",
                              marginRight: 2
                            }}
                            title={det}
                          ></span>
                        )}
                      </div>
                    </div>
                  );
                }
                return <td key={col} className="calendar-td">{cell}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App(){
  const[selected,setSel]=useState(null),[picks,setP]=useState({}),[sDate,setS]=useState(""),[eDate,setE]=useState("");
  // Summary per detective
  const summary=useMemo(()=>{const s={};for(const d of DETECTIVES){const pk=picks[d]||[];const used=pk.reduce((a,p)=>a+p.days,0);const summer=pk.filter(p=>p.summer).length;
  s[d]={picks:pk,used,remain:MAX_DAYS-used,total:pk.length,summer};}return s;},[picks]);
  // Map of ISO date string -> [detective(s)]
  const picksByDate = useMemo(() => {
    const map = {};
    for(const [det, pkArr] of Object.entries(picks)) {
      for(const pick of pkArr) {
        getDatesInRange(pick.start, pick.end).forEach(date => {
          const key = date.toISOString().slice(0,10);
          if (!map[key]) map[key] = [];
          if (!map[key].includes(det)) map[key].push(det);
        });
      }
    }
    return map;
  }, [picks]);

  function addPick(){
    if(!selected||!sDate||!eDate)return alert("Select det+dates");
    const s=new Date(sDate),e=new Date(eDate);
    if(e<s)return alert("End before start");
    const days=daysBetweenInclusive(s,e),summer=rangesOverlapSummer(s,e);
    const det=summary[selected];
    if(det.total+1>MAX_PICKS)return alert("Max picks");
    if(det.used+days>MAX_DAYS)return alert("Too many days");
    setP(prev=>({...prev,[selected]:[...(prev[selected]||[]),{start:s,end:e,days,summer}]}));
    setS("");setE("");
  }

  return <div className='app-shell'>
    <div className='header'><h1>Vacation Picker</h1></div>
    <div className='grid'>
      <div className='card'>
        <h2>Detectives</h2>
        {DETECTIVES.map(d=>
          <button
            key={d}
            className={'detective-btn '+(selected===d?'active':'')}
            onClick={()=>setSel(d)}
            style={{ background: DETECTIVE_COLORS[d], color: "#222", fontWeight: selected===d ? "bold" : "normal" }}
          >
            {d}
          </button>
        )}
      </div>
      <div className='card'>
        <h2>Make Pick</h2>
        <div className='controls'>
          <input type='date' value={sDate} onChange={e=>setS(e.target.value)}/>
          <input type='date' value={eDate} onChange={e=>setE(e.target.value)}/>
          <button className='primary' onClick={addPick}>Add</button>
        </div>
        <div className='picks-list'>
          {Object.entries(picks).flatMap(([n,pk])=>pk.map((p,i)=>
            <div key={i} className='pick-item'>
              <span style={{ background: DETECTIVE_COLORS[n], color: "#222", padding: "2px 6px", borderRadius: 4 }}>{n}</span>
              <span>{formatDate(p.start)}→{formatDate(p.end)} ({p.days}d)</span>
              {p.summer&&<span className='tag summer'>Summer</span>}
            </div>
          ))}
        </div>
      </div>
      <div className='card summary'>
        <h2>Summary</h2>
        <table>
          <thead><tr><th>Det</th><th>Used</th><th>Remain</th><th>Picks</th><th>Summer</th></tr></thead>
          <tbody>{DETECTIVES.map(d=>{
            const s=summary[d];
            return <tr key={d}>
              <td>
                <span style={{
                  background: DETECTIVE_COLORS[d],
                  color: "#222",
                  padding: "2px 6px",
                  borderRadius: 4
                }}>{d}</span>
              </td>
              <td>{s.used}</td>
              <td>{s.remain}</td>
              <td>{s.total}</td>
              <td>{s.summer}/2</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <Calendar picksByDate={picksByDate} detectiveColors={DETECTIVE_COLORS} />
    </div>
    <style>{`
      .card, .calendar-card { margin: 1em; padding: 1em; border-radius: 8px; background: #f8f8f8; box-shadow: 0 1px 6px #eee }
      .detective-btn { margin: 2px; border: none; border-radius: 4px; padding: 6px 10px; cursor: pointer; }
      .detective-btn.active { outline: 2px solid #333; }
      .calendar-table { width: 100%; border-collapse: collapse; }
      .calendar-table th, .calendar-table td { border: 1px solid #e0e0e0; width: 14%; min-width: 36px; height: 36px; text-align: left; vertical-align: top; }
      .calendar-cell { min-height: 32px; position: relative; }
      .calendar-date { font-size: 12px; color: #888; }
      .calendar-picks { margin-top: 2px; }
      .calendar-dot { display: inline-block; width: 15px; height: 15px; border-radius: 50%; vertical-align: middle; }
    `}</style>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
