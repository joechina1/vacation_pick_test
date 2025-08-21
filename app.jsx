const { useState } = React;

const DETECTIVES = [
  "Patrick Tristram",
  "William Luikart",
  "Alan Moreno",
  "Nkosi Henry",
  "Brendan Combs",
  "John Nardella"
];

const MAX_DAYS = 24;
const MAX_PICKS = 6;
const SUMMER_START = new Date("2025-06-21");
const SUMMER_END = new Date("2025-09-03");
const MAX_SUMMER_PICKS = 2;
const MAX_OFF_PER_DAY = 1;

function App() {
  const [picks, setPicks] = useState([]);

  function addPick(det, start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const days = Math.floor((e - s)/(1000*60*60*24)) + 1;
    const isSummer = (s >= SUMMER_START && s <= SUMMER_END) || (e >= SUMMER_START && e <= SUMMER_END);
    const pick = { detective: det, start, end, days, isSummer };
    setPicks([...picks, pick]);
  }

  function summaryFor(det) {
    const myPicks = picks.filter(p=>p.detective===det);
    const usedDays = myPicks.reduce((a,b)=>a+b.days,0);
    const summerPicks = myPicks.filter(p=>p.isSummer).length;
    return {usedDays, picks: myPicks.length, summerPicks};
  }

  return (
    <div className="container">
      <h1>Vacation Picker (Full Rules)</h1>
      {DETECTIVES.map(det => {
        const sum = summaryFor(det);
        return (
          <div key={det} className="card">
            <h3>{det}</h3>
            <p>Used Days: {sum.usedDays}/{MAX_DAYS}</p>
            <p>Picks: {sum.picks}/{MAX_PICKS}</p>
            <p>Summer Picks: {sum.summerPicks}/{MAX_SUMMER_PICKS}</p>
          </div>
        )
      })}
      <div className="card">
        <h3>Add Pick</h3>
        <PickForm onAdd={addPick} />
      </div>
    </div>
  )
}

function PickForm({onAdd}) {
  const [det, setDet] = useState(DETECTIVES[0]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  return (
    <div>
      <select value={det} onChange={e=>setDet(e.target.value)}>
        {DETECTIVES.map(d=><option key={d}>{d}</option>)}
      </select>
      <input type="date" value={start} onChange={e=>setStart(e.target.value)}/>
      <input type="date" value={end} onChange={e=>setEnd(e.target.value)}/>
      <button onClick={()=>onAdd(det,start,end)}>Add</button>
    </div>
  )
}

ReactDOM.render(<App/>, document.getElementById("root"));
