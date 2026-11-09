import { useEffect, useState } from "react";
import { newGame, nextEcho, previewAction, resolveTurn, roomFor, walkable, SIZE, type Action, type Game, type Layer, type Position } from "./orchard";
import "./orchard.css";

const BEST_KEY = "endless-psychosis.loop-house.best.v1";
const layerName = (layer: Layer) => layer === 0 ? "△ Surface / 0" : "◇ Return / 1";
const address = (p: Position) => `${layerName(p.layer)} · R${Math.floor(p.cell / SIZE) + 1} C${p.cell % SIZE + 1}`;
function readBest() {
  try { const n = Number(localStorage.getItem(BEST_KEY)); return Number.isSafeInteger(n) && n >= 0 ? n : 0; } catch { return 0; }
}
function OtherPlan({ game, layer }: { game: Game; layer: Layer }) {
  const echo = nextEcho(game);
  return <svg className="orchard-mini" viewBox="0 0 100 100" role="img" aria-label={`Other plan: ${layerName(layer)}. Solid blocks are walls; dashed diamond is next echo.`}>
    {Array.from({ length: 25 }, (_, cell) => {
      const x = cell % 5 * 20, y = Math.floor(cell / 5) * 20;
      return <g key={cell}><rect x={x + 1} y={y + 1} width="18" height="18" fill={walkable(game.room, { cell, layer }) ? "#1e211d" : "#79796b"} />
        {cell === 12 && layer === 1 && !game.key && <text x={x + 10} y={y + 14}>⚿</text>}
        {cell === 24 && layer === 0 && <text x={x + 10} y={y + 14}>⊏</text>}
        {echo?.cell === cell && echo.layer === layer && <path d={`M${x+10} ${y+3}l7 7-7 7-7-7Z`} fill="none" stroke="#d0df7b" strokeDasharray="2 1" />}
        {game.echo?.cell === cell && game.echo.layer === layer && <circle cx={x+10} cy={y+10} r="4" fill="#c79b61" />}
      </g>;
    })}
  </svg>;
}

export default function Orchard() {
  const [game, setGame] = useState(newGame);
  const [started, setStarted] = useState(false);
  const [best, setBest] = useState(readBest);
  useEffect(() => {
    if (game.score > best) {
      setBest(game.score);
      try { localStorage.setItem(BEST_KEY, String(game.score)); } catch { /* Optional personal best. */ }
    }
  }, [game.score, best]);
  const echo = nextEcho(game);
  const ended = game.integrity === 0;
  function act(action: Action) { setGame(current => resolveTurn(current, action)); }
  function reset() { setGame(newGame()); setStarted(true); }
  const rules = <>
    <p>Tap an orthogonal adjacent floor tile. <b>Cross</b> changes layer at the same coordinate, only where both plans have floor. <b>Wait</b> stays still. Each uses one of 24 actions.</p>
    <p>Every action records your final position and layer. The first three actions are silent. On action four, your first recorded position returns in the <b>opposite layer</b>; thereafter the echo follows three turns behind. Dashed ◇ marks its exact next position, even inside a wall. Amber ● is its current position.</p>
    <p>A striped target or “CONTACT” control ends on the next echo: lose one integrity. Only the final cell collides; crossing paths is safe. Damage clears the trail, giving three silent actions. Contact keeps your position and key.</p>
    <p>Collect ⚿ at R3 C3 in Return / 1; leave through ⊏ at R5 C5 in Surface / 0. A locked exit is ordinary floor. Escape earns one room and turns the plan. There is no final room.</p>
    <p>Expiry costs one integrity, resets you to R1 C1 Surface, restores 24 actions and removes the key. A last-action escape counts. Contact at expiry costs one integrity total. At zero integrity, the run ends.</p>
  </>;
  return <section className="orchard" aria-label="Endless Psychosis: Loop House">
    <header className="orchard-header"><p>ENDLESS PSYCHOSIS</p><h1>LOOP HOUSE</h1><span>OCCUPANCY INSTRUMENT / TWO INCOMPATIBLE PLANS</span></header>
    {!started ? <div className="orchard-intro">
      <div className="orchard-apparition" aria-hidden="true"><i /><i /><i /><span>△<br />◇</span></div>
      <h2>The house remembers where you were.</h2>
      <p>Two layers. One key. An echo three turns behind, on the other side. Escape before 24 actions expire. Survive with three integrity.</p>
      <p className="orchard-warning">Dashed ◇ previews the next echo. Striped moves mean contact. Read the opposite plan before crossing.</p>
      <details><summary>First entry / operating rules</summary><div className="orchard-rules">{rules}</div></details>
      <button className="orchard-primary" onClick={reset}>Enter room 01 →</button>
    </div> : <>
      <div className="orchard-stats"><span>ROOM <b>{String(game.room).padStart(2, "0")}</b></span><span>ACTIONS <b>{game.remaining}/24</b></span><span>INTEGRITY <b>{game.integrity}/3</b></span></div>
      {ended ? <div className="orchard-ending" role="status"><h2>HOUSE CLOSED</h2><p>{game.reason}. You escaped {game.score} rooms. Best: {best}.</p><button className="orchard-primary" onClick={reset}>Retry immediately →</button></div> : <>
        <div className="orchard-plan-heading"><div><h2>{layerName(game.position.layer)}</h2><p>{roomFor(game.room).name}</p><p>{game.key ? "⚿ KEY HELD" : "⚿ KEY IN RETURN"} · ⊏ EXIT IN SURFACE</p><p>Escaped {game.score} · Best {best}</p></div><div className="orchard-other"><span>{layerName(game.position.layer === 0 ? 1 : 0)}</span><OtherPlan game={game} layer={game.position.layer === 0 ? 1 : 0} /></div></div>
        <div className="orchard-board" role="group" aria-label={`5 by 5 floor plan, ${layerName(game.position.layer)}`}>
          {Array.from({ length: 25 }, (_, cell) => {
            const action: Action = { type: "move", cell };
            const preview = previewAction(game, action);
            const wall = !walkable(game.room, { cell, layer: game.position.layer });
            const player = game.position.cell === cell;
            const incoming = echo?.cell === cell && echo.layer === game.position.layer;
            const current = game.echo?.cell === cell && game.echo.layer === game.position.layer;
            const key = cell === 12 && game.position.layer === 1 && !game.key;
            const exit = cell === 24 && game.position.layer === 0;
            return <button key={cell} disabled={!preview.target} onClick={() => act(action)} className={`orchard-cell ${wall ? "is-wall" : ""} ${player ? "is-player" : ""} ${preview.target ? "is-reachable" : ""} ${preview.collision ? "is-danger" : ""}`}
              aria-label={`R${Math.floor(cell / SIZE) + 1} C${cell % SIZE + 1}, ${layerName(game.position.layer)}: ${wall ? "wall" : "floor"}${player ? ", you" : ""}${key ? ", key" : ""}${exit ? game.key ? ", open exit" : ", locked exit" : ""}${incoming ? ", next echo" : ""}${current ? ", current echo" : ""}${preview.target ? preview.collision ? ", move causes contact" : ", move safe" : ""}`}>
              <span className="orchard-cell-number" aria-hidden="true">{cell + 1}</span>
              <span aria-hidden="true">{player ? "▲" : key ? "⚿" : exit ? "⊏" : wall ? "" : "·"}</span>
              {current && <i className="orchard-echo" aria-hidden="true">●</i>}{incoming && <i className="orchard-incoming" aria-hidden="true">◇</i>}
            </button>;
          })}
        </div>
        <div className="orchard-legend">▲ YOU · ● ECHO · ◇ NEXT · ▨ CONTACT</div>
        <p className="orchard-forecast">{echo ? `NEXT ◇ ${address(echo)}` : `NEXT ◇ Silent · ${3 - game.history.length} grace actions left`}</p>
        <div className="orchard-controls">{([{ type: "cross" }, { type: "wait" }] as Action[]).map(action => {
          const preview = previewAction(game, action);
          return <button key={action.type} disabled={!preview.target} className={preview.collision ? "is-danger" : ""} onClick={() => act(action)}>{action.type === "cross" ? "Cross ⇄" : "Wait ─"}<small>{!preview.target ? "WALL BEYOND" : preview.collision ? "CONTACT · −1" : "SAFE · 1 ACTION"}</small></button>;
        })}</div>
      </>}
      <p className="orchard-status" role="status">{game.message}</p>
      <details><summary>Operating rules / symbols</summary><div className="orchard-rules">{rules}</div></details>
    </>}
  </section>;
}
