import { lazy, Suspense, useEffect } from "react";
import "./collection.css";
const Orchard=lazy(()=>import("./Orchard"));
const Gravity=lazy(()=>import("./Gravity"));
const Switchboard=lazy(()=>import("./Switchboard"));
const games=[
  {slug:"loop-house",alias:"night-orchard",number:"01",name:"Loop House",kind:"YOUR PAST IS IN THE NEXT ROOM",description:"Cross between two floor plans. Your earlier steps return on the other side. The exit is another entrance.",gesture:"Spatial survival",time:"Endless rooms",mark:"▦",color:"orchard"},
  {slug:"false-orbit",alias:"borrowed-gravity",number:"02",name:"False Orbit",kind:"NOT EVERYTHING WILL CATCH YOU",description:"Launch into a machine that remembers your route incorrectly. Read the real anchors among the afterimages.",gesture:"Tap / hold / release",time:"Endless crossings",mark:"◉",color:"gravity"},
  {slug:"dead-frequency",alias:"midnight-switchboard",number:"03",name:"Dead Frequency",kind:"YOU HAVE HEARD THIS BEFORE",description:"The network repeats the messages you trusted. Read the seals. Check the ledger. Decide what deserves an answer.",gesture:"Evidence & decisions",time:"Endless transmissions",mark:"⌁",color:"switchboard"},
];
export default function Experiments(){
  const slug=window.location.pathname.replace(/\/+$/,"").split("/").pop();
  const game=games.find(g=>g.slug===slug||g.alias===slug);
  useEffect(()=>{document.title=game?`Endless Psychosis: ${game.name}`:"Endless Psychosis / Three Loops";},[game]);
  return <div className="collection"><header className="collection-nav"><a href="/" aria-label="Endless Psychosis collection">EP<span> / NO FINAL EXIT</span></a><a href={game?"/":"/original"}>{game?"Other loops ↗":"Original build ↗"}</a></header>
  {game?<main className="collection-play"><Suspense fallback={<p className="collection-loading">THE ROOM IS REPEATING…</p>}>{game.slug==="loop-house"?<Orchard/>:game.slug==="false-orbit"?<Gravity/>:<Switchboard/>}</Suspense><nav className="collection-other" aria-label="Other Endless Psychosis games">{games.filter(g=>g!==game).map(g=><a key={g.slug} href={`/games/${g.slug}`}>{g.name} ↗</a>)}</nav></main>:
  <main className="collection-home"><div className="collection-eyebrow">THREE GAMES / ONE RECURRING NIGHTMARE</div><h1>ENDLESS<br/><em>PSYCHOSIS</em></h1><p className="collection-lede">The room remembers. The orbit lies. The signal comes back.<br/>Learn the rule. Recognize the repeat. Last one more loop.</p><div className="collection-grid">{games.map(g=><a className={`collection-card card-${g.color}`} href={`/games/${g.slug}`} key={g.slug}><div className="collection-card-top"><span>LOOP {g.number} / ENDLESS PSYCHOSIS</span><span>↗</span></div><div className="collection-art" aria-hidden="true">{g.mark}<i/><i/><i/></div><div className="collection-eyebrow">{g.kind}</div><h2>{g.name}</h2><p>{g.description}</p><div className="collection-card-bottom"><span>{g.gesture}</span><span>{g.time}</span></div><strong>ENTER THE LOOP ↗</strong></a>)}</div><footer>PHONE / MOUSE / KEYBOARD · NO ACCOUNT · NO FINAL LEVEL</footer></main>}
  </div>;
}
