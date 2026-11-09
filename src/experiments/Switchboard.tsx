import { useEffect, useRef, useState } from "react";
import { advanceShift, connectCaller, DESTINATIONS, newShift, type Destination } from "./switchboard";
import "./switchboard.css";
const SYMBOLS:Record<Destination,string>={Moon:"☾",Key:"⚿",Wave:"≋",Star:"✧"};
export default function Switchboard() {
  const [game,setGame]=useState(newShift); const [mode,setMode]=useState<"intro"|"play"|"pause">("intro");
  const [selected,setSelected]=useState<number|null>(null); const [message,setMessage]=useState("Choose a caller, then their destination.");
  const last=useRef(0);
  useEffect(()=>{const hide=()=>{if(document.hidden)setMode(m=>m==="play"?"pause":m);};document.addEventListener("visibilitychange",hide);return()=>document.removeEventListener("visibilitychange",hide);},[]);
  useEffect(()=>{if(mode!=="play"||game.finished)return;last.current=performance.now();let frame=0;const tick=(now:number)=>{const dt=(now-last.current)/1000;last.current=now;setGame(s=>advanceShift(s,dt));frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[mode,game.finished]);
  const start=()=>{setGame(newShift());setSelected(null);setMessage("Your first caller arrives in two seconds.");setMode("play");};
  const connect=(destination:Destination)=>{if(mode!=="play"||game.finished)return;const caller=game.waiting.find(c=>c.id===selected);if(!caller){setMessage("First select a waiting caller.");return;}if(caller.destination!==destination){setMessage(`Caller ${caller.id+1} needs ${caller.destination}. No penalty — try again.`);return;}if(game.active.length>=3){setMessage("All three cords are busy. A line will free when its call ends.");return;}setGame(s=>connectCaller(s,caller.id,destination));setSelected(null);setMessage(`Connected to ${destination}. The cord returns in ${caller.duration}s.`);};
  return <section className="switchboard">
    <div className="sb-heading"><span>THE NIGHT EXCHANGE · 03</span><h1>Midnight<br/><em>Switchboard</em></h1><p>Somewhere, someone is waiting for a connection.</p></div>
    {mode==="intro"?<div className="sb-intro"><div className="sb-demo">☾ ━━━━━ ⚿</div><h2>Three cords. A hundred little worlds.</h2><p>Tap a caller, then their matching destination. Every call occupies one of your three reusable cords.</p><ol><li><strong>WAIT</strong> is how long a caller can stay.</li><li><strong>LINE</strong> is how long their call takes.</li><li>Long calls pay more. Decide who goes first.</li></ol><p>A two-minute shift. Missed calls lower your final service rating, but never end your shift early. No dragging or sound needed.</p><button className="sb-primary" onClick={start}>Begin the night shift ↗</button></div>:<>
      <div className="sb-stats"><span><b>{Math.ceil(120-game.time)}s</b>shift left</span><span><b>{game.score}</b>points</span><span><b>{game.missed}</b>unserved</span><button onClick={()=>setMode(mode==="play"?"pause":"play")} disabled={game.finished}>{mode==="pause"?"Resume":"Pause"}</button></div>
      {game.finished?<div className="sb-result"><span>SHIFT COMPLETE</span><h2>{game.completed} connections.<br/>A quieter kind of hero.</h2><p>{game.score} points · {game.missed} unserved<br/>Service rating: {game.completed+game.missed?Math.round(game.completed/(game.completed+game.missed)*100):0}%</p><button className="sb-primary" onClick={start}>Work another night ↗</button></div>:mode==="pause"?<div className="sb-result"><h2>The exchange is on hold.</h2><p>All clocks are frozen.</p><button className="sb-primary" onClick={()=>setMode("play")}>Resume shift</button></div>:<>
      <div className="sb-cords" aria-label="Three reusable cords">{[0,1,2].map(i=>{const c=game.active[i];return <div key={i} className={c?"busy":""}><span>{c?SYMBOLS[c.caller.destination]:"○"}</span><b>{c?`${Math.ceil(c.ends-game.time)}s`:"FREE"}</b><small>{c?c.caller.destination:`CORD ${i+1}`}</small></div>;})}</div>
      <div className="sb-label">INCOMING CALLS <span>choose one</span></div>
      <div className="sb-callers">{[0,1,2,3,4,5].map(slot=>{const c=game.waiting.find(c=>c.slot===slot);return c?<button key={slot} className={`sb-caller ${selected===c.id?"selected":""} ${c.arrived+c.patience-game.time<5?"urgent":""}`} onClick={()=>{setSelected(selected===c.id?null:c.id);setMessage(`Caller ${c.id+1}: ${c.destination}, ${c.duration}s line, ${c.value} points.`);}} aria-pressed={selected===c.id}><span className="sb-symbol">{SYMBOLS[c.destination]}</span><span><strong>{c.destination} <small>+{c.value}pt</small></strong><small>WAIT {Math.ceil(c.arrived+c.patience-game.time)}s · LINE {c.duration}s</small></span><progress max={c.patience} value={c.arrived+c.patience-game.time}/></button>:<div className="sb-empty" key={slot}><span>·</span>quiet line</div>;})}</div>
      <div className="sb-label">DESTINATIONS <span>then connect</span></div><div className="sb-destinations">{DESTINATIONS.map(d=><button key={d} onClick={()=>connect(d)}><span>{SYMBOLS[d]}</span>{d}</button>)}</div><p className="sb-message" role="status">{message}</p>
      </>}
    </>}
    <footer>NO VOICES LOST. JUST CALLS TO TRY AGAIN.</footer>
  </section>;
}
