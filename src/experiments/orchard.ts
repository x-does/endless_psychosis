export const SIZE = 5;
export const ROOM_BUDGET = 24;
export type Layer = 0 | 1;
export type Position = { cell: number; layer: Layer };
export type Action = { type: "move"; cell: number } | { type: "cross" } | { type: "wait" };
export type Game = {
  position: Position; history: Position[]; echo: Position | null; room: number; remaining: number;
  integrity: number; key: boolean; score: number; reason: string; message: string;
};
export type Room = { name: string; walls: readonly [readonly number[], readonly number[]] };
const transpose = (cell: number) => (cell % SIZE) * SIZE + Math.floor(cell / SIZE);
const walls = [[2, 7, 12, 17, 22], [5, 6, 8, 9, 18, 23]] as const;
// Both plans keep entry, key and exit fixed. The surface seam and broken
// return corridor make crossing a route decision, not merely a shortcut.
export const ROOMS: readonly Room[] = [
  { name: "Longitudinal seam", walls },
  { name: "Transverse seam", walls: [walls[0].map(transpose), walls[1].map(transpose)] },
];
export function roomFor(room: number): Room { return ROOMS[(room - 1) % ROOMS.length]; }
export function walkable(room: number, position: Position): boolean {
  return Number.isInteger(position.cell) && position.cell >= 0 && position.cell < SIZE * SIZE &&
    !roomFor(room).walls[position.layer].includes(position.cell);
}
export function newGame(): Game {
  return { position: { cell: 0, layer: 0 }, history: [], echo: null, room: 1, remaining: ROOM_BUDGET,
    integrity: 3, key: false, score: 0, reason: "", message: "Find the key in the return. Leave through the surface." };
}
export function destination(game: Game, action: Action): Position | null {
  if (game.integrity <= 0) return null;
  const current = game.position;
  const target: Position = action.type === "cross" ? { cell: current.cell, layer: current.layer === 0 ? 1 : 0 }
    : action.type === "move" ? { cell: action.cell, layer: current.layer } : current;
  if (action.type === "move" && Math.abs(Math.floor(target.cell / SIZE) - Math.floor(current.cell / SIZE)) +
    Math.abs(target.cell % SIZE - current.cell % SIZE) !== 1) return null;
  return walkable(game.room, target) ? target : null;
}
/** Three recorded actions are the grace period. Action four replays action one. */
export function nextEcho(game: Game): Position | null {
  const old = game.history.length === 3 ? game.history[0] : null;
  return old ? { cell: old.cell, layer: old.layer === 0 ? 1 : 0 } : null;
}
export function previewAction(game: Game, action: Action) {
  const target = destination(game, action);
  const echo = nextEcho(game);
  return { target, echo, collision: !!target && !!echo && target.cell === echo.cell && target.layer === echo.layer };
}
function damage(game: Game, reason: string, expiry: boolean): Game {
  const integrity = game.integrity - 1;
  return { ...game, integrity, history: [], echo: null,
    ...(expiry ? { position: { cell: 0, layer: 0 } as Position, key: false, remaining: ROOM_BUDGET } : {}),
    reason: integrity === 0 ? reason : "",
    message: integrity === 0 ? `${reason}. The house has closed.` : expiry
      ? "Room expired. Integrity lost. Entry reset; three actions of silence."
      : "Echo contact. Integrity lost. Trail cleared; three actions of silence." };
}
export function resolveTurn(game: Game, action: Action): Game {
  const preview = previewAction(game, action);
  if (!preview.target) return game;
  let next: Game = { ...game, position: preview.target, echo: preview.echo, remaining: game.remaining - 1,
    history: [...game.history, preview.target].slice(-3),
    key: game.key || (preview.target.cell === 12 && preview.target.layer === 1),
    message: action.type === "cross" ? "Crossed the seam." : action.type === "wait" ? "You wait. The house remembers." : "Footstep recorded." };
  // Final occupancy only: traversed edges and the previous echo are safe.
  if (preview.collision) {
    next = damage(next, "Echo contact", false);
    if (next.integrity === 0) return next;
  }
  if (next.key && next.position.cell === 24 && next.position.layer === 0) {
    return { ...next, room: game.room + 1, position: { cell: 0, layer: 0 }, history: [], echo: null,
      remaining: ROOM_BUDGET, key: false, score: game.score + 1,
      message: "Door released. The plan turns. There is another room." };
  }
  // A last-action escape succeeds. Simultaneous contact + expiry costs one integrity.
  if (next.remaining <= 0) return preview.collision
    ? { ...next, position: { cell: 0, layer: 0 }, key: false, remaining: ROOM_BUDGET, message: "Echo contact at expiry. Entry reset; trail cleared." }
    : damage(next, "Room expired", true);
  return next;
}
export function actionsFor(game: Game): Action[] {
  const cell = game.position.cell;
  return ([cell - SIZE, cell + SIZE, cell - 1, cell + 1].map(cell => ({ type: "move", cell } as Action))
    .concat([{ type: "cross" }, { type: "wait" }])).filter(action => destination(game, action));
}
/** Bounded BFS through the actual reducer and its exact three-step memory.
 * Earliest arrival dominates identical states, keeping the search finite.
 */
export function solveRoom(room: number, maxStates = 150_000): Action[] | null {
  type Node = { game: Game; parent: number; action: Action | null };
  const nodes: Node[] = [{ game: { ...newGame(), room }, parent: -1, action: null }];
  const signature = (g: Game) => `${g.position.cell}:${g.position.layer}:${+g.key}:${g.history.map(p => p.cell * 2 + p.layer).join(",")}`;
  const seen = new Set([signature(nodes[0].game)]);
  for (let cursor = 0; cursor < nodes.length && nodes.length <= maxStates; cursor++) {
    const node = nodes[cursor];
    for (const action of actionsFor(node.game)) {
      const next = resolveTurn(node.game, action);
      if (next.integrity !== 3 || next.remaining === ROOM_BUDGET && next.room === room) continue;
      if (next.room > room) {
        const path = [action];
        for (let index = cursor; nodes[index].parent !== -1; index = nodes[index].parent) path.push(nodes[index].action!);
        return path.reverse();
      }
      const key = signature(next);
      if (!seen.has(key)) { seen.add(key); nodes.push({ game: next, parent: cursor, action }); }
    }
  }
  return null;
}
