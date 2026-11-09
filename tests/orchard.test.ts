import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, nextEcho, previewAction, resolveTurn, destination, roomFor, solveRoom, ROOMS, ROOM_BUDGET, type Action, type Game } from "../src/experiments/orchard.ts";

const wait: Action = { type: "wait" };
const cross: Action = { type: "cross" };
function play(game: Game, actions: Action[]) { return actions.reduce(resolveTurn, game); }

test("fixed entry, dual-layer key and exit; illegal actions cost nothing", () => {
  const game = newGame();
  assert.deepEqual(game.position, { cell: 0, layer: 0 });
  assert.equal(game.remaining, 24);
  assert.equal(game.integrity, 3);
  for (const cell of [-1, 25, 1.5, NaN, 4, 6, 12]) {
    assert.equal(resolveTurn(game, { type: "move", cell }), game);
  }
  const atOne = resolveTurn(game, { type: "move", cell: 1 });
  assert.equal(destination(atOne, { type: "move", cell: 2 }), null);
  assert.deepEqual(destination(atOne, cross), { cell: 1, layer: 1 });
  assert.equal(destination({ ...game, position: { cell: 5, layer: 0 } }, cross), null);
  assert.equal(destination({ ...game, position: { cell: 4, layer: 1 } }, { type: "move", cell: 5 }), null);
});

test("all actions record their resulting position; fourth action echoes first in opposite layer", () => {
  let game = newGame();
  for (const action of [{ type: "move", cell: 1 }, cross, wait] as Action[]) {
    assert.equal(nextEcho(game), null);
    game = resolveTurn(game, action);
    assert.equal(game.echo, null);
  }
  assert.deepEqual(game.history, [{ cell: 1, layer: 0 }, { cell: 1, layer: 1 }, { cell: 1, layer: 1 }]);
  assert.deepEqual(nextEcho(game), { cell: 1, layer: 1 });
  assert.equal(previewAction(game, wait).collision, true);
  assert.equal(previewAction(game, cross).collision, false);
  const safe = resolveTurn(game, cross);
  assert.deepEqual(safe.echo, { cell: 1, layer: 1 });
  assert.deepEqual(nextEcho(safe), { cell: 1, layer: 0 });
  assert.equal(safe.integrity, 3);
});

test("contact is previewed exactly and clears history for recovery without resetting position or key", () => {
  const before = play(newGame(), [{ type: "move", cell: 1 }, cross, wait]);
  const frozen = JSON.stringify(before);
  assert.equal(previewAction(before, wait).collision, true);
  assert.equal(JSON.stringify(before), frozen);
  const hit = resolveTurn({ ...before, key: true }, wait);
  assert.equal(hit.integrity, 2);
  assert.equal(hit.remaining, 20);
  assert.deepEqual(hit.position, before.position);
  assert.equal(hit.key, true);
  assert.deepEqual(hit.history, []);
  assert.equal(hit.echo, null);
  let recover = hit;
  for (let turn = 0; turn < 3; turn++) {
    assert.equal(nextEcho(recover), null);
    recover = resolveTurn(recover, wait);
    assert.equal(recover.integrity, 2);
  }
  assert.deepEqual(nextEcho(recover), { cell: 1, layer: 0 });
});

test("only final occupancy collides: previous echo and crossing edges are safe", () => {
  const game: Game = { ...newGame(), position: { cell: 1, layer: 0 },
    echo: { cell: 1, layer: 1 },
    history: [{ cell: 1, layer: 1 }, { cell: 0, layer: 0 }, { cell: 1, layer: 0 }] };
  // Player crosses 0→1 while the echo crosses 1→0 at this coordinate.
  assert.equal(previewAction(game, cross).collision, false);
  assert.equal(resolveTurn(game, cross).integrity, 3);
  const move = { ...game, echo: { cell: 0, layer: 0 } };
  assert.equal(resolveTurn(move, { type: "move", cell: 0 }).integrity, 3);
});

test("expiry resets same room, consumes integrity, and zero integrity freezes with a reason", () => {
  let game = { ...newGame(), key: true, room: 2 };
  for (let loss = 1; loss <= 3; loss++) {
    game = play(game, Array.from({ length: ROOM_BUDGET }, () => wait));
    assert.equal(game.integrity, 3 - loss);
    assert.equal(game.room, 2);
    assert.equal(game.remaining, ROOM_BUDGET);
    assert.equal(game.key, false);
    assert.deepEqual(game.history, []);
    assert.deepEqual(game.position, { cell: 0, layer: 0 });
  }
  assert.equal(game.reason, "Room expired");
  assert.equal(resolveTurn(game, wait), game);
  assert.deepEqual(newGame(), newGame());
});

test("contact ends at zero with its own reason; expiry/contact overlap costs one integrity", () => {
  const setup = play(newGame(), [{ type: "move", cell: 1 }, cross, wait]);
  const ended = resolveTurn({ ...setup, integrity: 1 }, wait);
  assert.equal(ended.integrity, 0);
  assert.equal(ended.reason, "Echo contact");
  assert.equal(resolveTurn(ended, cross), ended);
  const overlap = resolveTurn({ ...setup, remaining: 1 }, wait);
  assert.equal(overlap.integrity, 2);
  assert.equal(overlap.remaining, 24);
  assert.deepEqual(overlap.position, { cell: 0, layer: 0 });
});

test("every authored plan has a real damage-free BFS solution inside the action budget", () => {
  for (let room = 1; room <= ROOMS.length; room++) {
    const path = solveRoom(room);
    assert.ok(path, `room ${room} must solve within the bounded search`);
    assert.ok(path.length <= ROOM_BUDGET);
    const initial = { ...newGame(), room };
    let game = initial;
    let foundKey = false;
    for (const action of path) {
      assert.equal(previewAction(game, action).collision, false);
      game = resolveTurn(game, action);
      if (game.key) { foundKey = true; assert.equal(game.integrity, 3); }
    }
    assert.ok(foundKey);
    assert.equal(game.room, room + 1);
    assert.equal(game.score, 1);
    assert.equal(game.remaining, ROOM_BUDGET);
    assert.equal(game.integrity, 3);
    assert.equal(game.key, false);
    assert.deepEqual(game.history, []);
    assert.notDeepEqual(roomFor(room).walls, roomFor(game.room).walls);
    // Force last-action exit through the same reducer used by the UI.
    const beforeExit = play(initial, path.slice(0, -1));
    assert.equal(resolveTurn({ ...beforeExit, remaining: 1 }, path[path.length - 1]).room, room + 1);
  }
});

test("key exists only in Return and exit requires key; loop has no final ending", () => {
  const noKey = resolveTurn({ ...newGame(), position: { cell: 19, layer: 0 } }, { type: "move", cell: 24 });
  assert.equal(noKey.room, 1);
  assert.equal(noKey.key, false);
  const key = resolveTurn({ ...newGame(), position: { cell: 12, layer: 1 } }, wait);
  assert.equal(key.key, true);
  let game = { ...newGame(), room: 999 };
  const solutions = [solveRoom(1)!, solveRoom(2)!];
  for (let i = 0; i < 8; i++) game = play(game, solutions[(game.room - 1) % ROOMS.length]);
  assert.equal(game.room, 1007);
  assert.equal(game.score, 8);
  assert.equal(game.integrity, 3);
  assert.equal(game.reason, "");
  assert.equal(solveRoom(1, 1), null);
});
