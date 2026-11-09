import { useState } from "react";
import { newGame, previewTurn, score, shadows, SIZE, TURNS, type Moon, type PlantKind } from "./orchard";
import "./orchard.css";

const BEST_KEY = "night-orchard.best.v1";
const directions: Moon[] = ["N", "E", "S", "W"];
const directionNames = { N: "North", E: "East", S: "South", W: "West" };
function readBest() {
  try { const n = Number(localStorage.getItem(BEST_KEY)); return Number.isFinite(n) && n >= 0 ? n : 0; } catch { return 0; }
}
function PlantIcon({ kind, mature = false }: { kind: PlantKind; mature?: boolean }) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" className={`orchard-plant orchard-${kind}`}>
    {kind === "tree" ? <><path d="M20 28v9" className="orchard-stem" /><path d={mature ? "M20 3 7 19h6L5 29h30l-8-10h6Z" : "M20 10 9 29h22Z"} fill="currentColor" /><path d="M20 15v13" className="orchard-vein" /></> : <><path d="M20 23v14m0-5c-6 0-8-4-8-4 6-1 8 4 8 4" className="orchard-stem" /><g fill="currentColor">{(mature ? [0, 72, 144, 216, 288] : [0, 120, 240]).map(angle => <ellipse key={angle} cx="20" cy="11" rx="5" ry="8" transform={`rotate(${angle} 20 18)`} />)}</g><circle cx="20" cy="18" r="4" fill="#ffdf9e" /></>}
  </svg>;
}

export default function Orchard() {
  const [screen, setScreen] = useState<"intro" | "play">("intro");
  const [game, setGame] = useState(newGame);
  const [kind, setKind] = useState<PlantKind>("tree");
  const [cell, setCell] = useState<number | null>(null);
  const [moon, setMoon] = useState<Moon>("N");
  const [best, setBest] = useState(readBest);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState("Choose a plant, then tap an empty bed.");
  const finished = game.turns === TURNS;
  const preview = cell === null || finished ? null : previewTurn(game, { index: cell, kind }, moon);
  const shade = preview?.shade ?? shadows(game.board, moon);
  const points = score(game.board);
  function reset() {
    setGame(newGame()); setCell(null); setKind("tree"); setMoon("N"); setHelp(false);
    setMessage("Choose a plant, then tap an empty bed."); setScreen("play");
  }
  function resolve() {
    if (!preview) return;
    setGame(preview.next); setCell(null);
    setMessage(`Night ${preview.next.turns} settled. ${preview.growing.length} plants grew; +${preview.points} points.`);
    if (preview.next.turns === TURNS) {
      const result = score(preview.next.board);
      if (result > best) { setBest(result); try { localStorage.setItem(BEST_KEY, String(result)); } catch { /* Storage is optional. */ } }
    }
  }
  const rules = <div className="orchard-rules">
    <div className="orchard-rule"><span className="orchard-rule-icon"><PlantIcon kind="tree" mature /></span><p><strong>Trees drink moonlight.</strong> Grow in light twice to mature. Each mature tree is worth <b>2 points</b>.</p></div>
    <div className="orchard-rule"><span className="orchard-rule-icon"><PlantIcon kind="flower" mature /></span><p><strong>Flowers love the shadows.</strong> Grow in shade twice to bloom. Each bloom is worth <b>3 points</b>.</p></div>
    <div className="orchard-shadow-example" aria-label="Moon in the north, mature tree, then two shaded beds in a column"><span>☾ N</span><PlantIcon kind="tree" mature /><span className="orchard-example-bed">╱</span><span className="orchard-example-bed">╱</span><small>North moon → shadows fall south, two beds deep.</small></div>
    <p>Each night: choose either plant, place it in an empty bed, choose the moon’s side, then resolve. A new plant can grow immediately. Growth stays between nights.</p>
    <p>Only trees <strong>already mature at the start</strong> cast shadows. All plants grow together; a tree maturing tonight casts its first shadow next night. Shadows pass through plants.</p>
    <p>You have <strong>12 nights</strong>. Change your placement or moon freely before resolving. Only mature plants score at the end.</p>
  </div>;

  return <section className="orchard" aria-label="Night Orchard game">
    <header className="orchard-header"><span className="orchard-eyebrow">A little garden after dark</span><h1>Night Orchard<span aria-hidden="true">☾</span></h1><p>Follow the light. Make room for the shade.</p></header>
    {screen === "intro" ? <div className="orchard-intro">
      <div className="orchard-intro-art" aria-hidden="true"><span>✧</span><PlantIcon kind="tree" mature /><PlantIcon kind="flower" mature /><PlantIcon kind="tree" mature /><span>✦</span></div>
      <h2>Twelve nights to make something grow.</h2><p className="orchard-intro-copy">A quiet strategy game of trees, flowers, and the shadows between them.</p>
      {rules}<button className="orchard-primary" onClick={reset}>Plant your first night <span aria-hidden="true">↗</span></button><p className="orchard-footnote">No timer. Every night is yours to arrange.</p>
    </div> : <>
      <div className="orchard-stats"><div><span>{finished ? "Dawn has arrived" : "Night"}</span><strong>{finished ? "12 / 12" : `${game.turns + 1} / 12`}</strong></div><div><span>Points</span><strong>{points.toString().padStart(2, "0")}</strong></div><div><span>Personal best</span><strong>{best.toString().padStart(2, "0")}</strong></div></div>
      {finished && <div className="orchard-results" role="status"><span className="orchard-eyebrow">Your orchard, at dawn</span><h2>{points >= 24 ? "A garden in harmony." : points >= 12 ? "A little night magic." : "Every garden starts somewhere."}</h2><p><strong>{game.board.filter(p => p?.kind === "tree" && p.growth === 2).length}</strong> mature trees × 2 + <strong>{game.board.filter(p => p?.kind === "flower" && p.growth === 2).length}</strong> blooms × 3 = <strong>{points} points</strong></p><button className="orchard-primary" onClick={reset}>Grow another orchard ↗</button></div>}
      {!finished && <div className="orchard-choices"><div className="orchard-step"><span>01</span><h2>Choose your planting</h2></div><div className="orchard-seeds">{(["tree", "flower"] as PlantKind[]).map(type => <button key={type} aria-pressed={kind === type} className={kind === type ? "is-chosen" : ""} onClick={() => setKind(type)}><PlantIcon kind={type} mature /><span><strong>{type === "tree" ? "Moon pine" : "Dusk flower"}</strong><small>{type === "tree" ? "Light · 2 points" : "Shade · 3 points"}</small></span><span className="orchard-choice-mark" aria-hidden="true">{kind === type ? "●" : "○"}</span></button>)}</div></div>}
      <div className="orchard-board-heading"><div className="orchard-step"><span>02</span><h2>{finished ? "Your finished garden" : "Tap an empty bed"}</h2></div><span className="orchard-moon-caption">☾ {directionNames[moon]} moon</span></div>
      <div className="orchard-board" role="group" aria-label="Five by five orchard">
        {game.board.map((existing, index) => {
          const pending = cell === index && !finished;
          const plant = existing ?? (pending ? { kind, growth: 0 } : null);
          const grows = preview?.growing.includes(index) ?? false;
          const nextGrowth = preview?.next.board[index]?.growth;
          const label = `Row ${Math.floor(index / SIZE) + 1}, column ${index % SIZE + 1}: ${plant ? `${pending ? "planned " : ""}${plant.kind}, growth ${plant.growth} of 2` : "empty"}, ${shade.has(index) ? "shade" : "light"}${grows ? `; will grow to ${nextGrowth} of 2` : ""}`;
          return <button key={index} className={`orchard-cell ${shade.has(index) ? "is-shaded" : ""} ${pending ? "is-pending" : ""} ${grows ? "is-growing" : ""}`} aria-label={label} aria-pressed={pending} disabled={finished || !!existing} onClick={() => setCell(index)}>
            {plant ? <><PlantIcon kind={plant.kind} mature={plant.growth >= 2} /><span className="orchard-growth" aria-hidden="true">{[1, 2].map(level => <i key={level} className={plant.growth >= level ? "is-filled" : grows && nextGrowth! >= level ? "is-next" : ""} />)}</span>{grows && <span className="orchard-grow-mark" aria-hidden="true">+</span>}</> : <span className="orchard-empty" aria-hidden="true">{shade.has(index) ? "╱" : "·"}</span>}
          </button>;
        })}
      </div>
      <div className="orchard-legend"><span>╱ Shaded bed</span><span>+ Will grow</span><span>●● Mature</span><span className="orchard-planned-legend">┄ Planned</span></div>
      {!finished && <>
        <div className="orchard-step"><span>03</span><h2>Turn the moon</h2><small>Light comes from…</small></div>
        <div className="orchard-moons" role="group" aria-label="Moon direction">{directions.map(dir => <button key={dir} aria-pressed={moon === dir} className={moon === dir ? "is-chosen" : ""} onClick={() => setMoon(dir)}><span aria-hidden="true">{ { N: "↑", E: "→", S: "↓", W: "←" }[dir]}</span> {directionNames[dir]}</button>)}</div>
        <div className="orchard-preview" aria-live="polite">{preview ? <><strong>{preview.growing.length} {preview.growing.length === 1 ? "plant" : "plants"} will grow <span>+{preview.points} pts</span></strong><p>{preview.growing.includes(cell!) ? `Your ${kind} will ${preview.next.board[cell!]!.growth === 2 ? "mature" : "gain its first growth"}.` : `Your ${kind} will wait: it needs ${kind === "tree" ? "light" : "shade"}.`} You can still move it or turn the moon.</p></> : <><strong>Your next night is unwritten.</strong><p>Tap an empty bed to preview growth and points.</p></>}</div>
        <button className="orchard-primary" disabled={!preview} onClick={resolve}>Resolve night {game.turns + 1}<span aria-hidden="true">☾</span></button>
        <p className="orchard-status" role="status">{message}</p>
      </>}
      <button className="orchard-help" aria-expanded={help} onClick={() => setHelp(!help)}>{help ? "Hide field notes −" : "How does this garden grow? +"}</button>{help && rules}
    </>}
    <footer className="orchard-footer">TWELVE NIGHTS · ONE SMALL WORLD</footer>
  </section>;
}
