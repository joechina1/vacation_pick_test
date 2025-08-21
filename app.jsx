/* global React, ReactDOM */
const { useState, useMemo } = React;
const DETECTIVES=["Patrick Tristram","William Luikart","Alan Moreno","Nkosi Henry","Brendan Combs","John Nardella"];
const MAX_DAYS=24,MAX_PICKS=6;
function isDateInSummer(d){const y=d.getFullYear();return d>=new Date(y,5,21)&&d<=new Date(y,8,3);}
function rangesOverlapSummer(s,e){let c=new Date(s);while(c<=e){if(isDateInSummer(c))return true;c.setDate(c.getDate()+1);}return false;}
function daysBetweenInclusive(a,b){return Math.floor((b-a)/(1000*60*60*24))+1;}
function formatDate(d){return d.toLocaleDateString();}
function App(){const[selected,setSel]=useState(null),[picks,setP]=useState({}),[sDate,setS]=useState(""),[eDate,setE]=useState("");
const summary=useMemo(()=>{const s={};for(const d of DETECTIVES){const pk=picks[d]||[];const used=pk.reduce((a,p)=>a+p.days,0);const summer=pk.filter(p=>p.summer).length;
s[d]={picks:pk,used,remain:MAX_DAYS-used,total:pk.length,summer};}return s;},[picks]);
function addPick(){if(!selected||!sDate||!eDate)return alert("Select det+dates");const s=new Date(sDate),e=new Date(eDate);
if(e<s)return alert("End before start");const days=daysBetweenInclusive(s,e),summer=rangesOverlapSummer(s,e);const det=summary[selected];
if(det.total+1>MAX_PICKS)return alert("Max picks");if(det.used+days>MAX_DAYS)return alert("Too many days");
setP(prev=>({...prev,[selected]:[...(prev[selected]||[]),{start:s,end:e,days,summer}]}));setS("");setE("");}
return <div className='app-shell'><div className='header'><h1>Vacation Picker</h1></div>
<div className='grid'><div className='card'><h2>Detectives</h2>
{DETECTIVES.map(d=><button key={d} className={'detective-btn '+(selected===d?'active':'')} onClick={()=>setSel(d)}>{d}</button>)}</div>
<div className='card'><h2>Make Pick</h2><div className='controls'>
<input type='date' value={sDate} onChange={e=>setS(e.target.value)}/>
<input type='date' value={eDate} onChange={e=>setE(e.target.value)}/>
<button className='primary' onClick={addPick}>Add</button></div>
<div className='picks-list'>{Object.entries(picks).flatMap(([n,pk])=>pk.map((p,i)=>
<div key={i} className='pick-item'><span>{n}</span><span>{formatDate(p.start)}→{formatDate(p.end)} ({p.days}d)</span>{p.summer&&<span className='tag summer'>Summer</span>}</div>))}</div>
</div><div className='card summary'><h2>Summary</h2><table><thead><tr><th>Det</th><th>Used</th><th>Remain</th><th>Picks</th><th>Summer</th></tr></thead>
<tbody>{DETECTIVES.map(d=>{const s=summary[d];return <tr key={d}><td>{d}</td><td>{s.used}</td><td>{s.remain}</td><td>{s.total}</td><td>{s.summer}/2</td></tr>;})}</tbody></table></div></div></div>;}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);