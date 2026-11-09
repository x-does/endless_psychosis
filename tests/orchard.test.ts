import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, shadows, previewTurn, resolveTurn, score, TURNS, type Board } from "../src/experiments/orchard.ts";

test("moon direction casts two-cell shadows away from the light", () => {
  const board = newGame().board;
  board[12] = { kind: "tree", growth: 2 };
  assert.deepEqual([...shadows(board, "N")], [17, 22]);
  assert.deepEqual([...shadows(board, "E")], [11, 10]);
  assert.deepEqual([...shadows(board, "S")], [7, 2]);
  assert.deepEqual([...shadows(board, "W")], [13, 14]);
});

test("shadows stop at every board edge without wrapping rows", () => {
  for (const [index, moon, expected] of [[0, "E", []], [4, "W", []], [0, "S", []], [20, "N", []], [3, "W", [4]], [5, "E", []]] as const) {
    const board = newGame().board;
    board[index] = { kind: "tree", growth: 2 };
    assert.deepEqual([...shadows(board, moon)], expected);
  }
});

test("growth is simultaneous: a newly mature tree shades only the next turn", () => {
  const game = newGame();
  game.board[0] = { kind: "tree", growth: 1 };
  game.board[5] = { kind: "flower", growth: 0 };
  const preview = previewTurn(game, { index: 1, kind: "tree" }, "N");
  assert.equal(preview.next.board[0]?.growth, 2);
  assert.equal(preview.next.board[5]?.growth, 0);
  assert.equal(preview.next.board[1]?.growth, 1);
  assert.equal(preview.points, 2);
  assert.equal(game.board[0]?.growth, 1);
  assert.equal(game.board[1], null);
  const next = resolveTurn(preview.next, { index: 10, kind: "flower" }, "N");
  assert.equal(next.board[5]?.growth, 1);
  assert.equal(next.board[10]?.growth, 1);
});

test("flowers grow in shade, trees in light, and mature growth is capped", () => {
  const board: Board = newGame().board;
  board[0] = { kind: "tree", growth: 2 };
  board[5] = { kind: "tree", growth: 1 };
  board[10] = { kind: "flower", growth: 1 };
  board[1] = { kind: "flower", growth: 1 };
  const result = previewTurn({ board, turns: 4 }, { index: 2, kind: "tree" }, "N");
  assert.equal(result.next.board[0]?.growth, 2);
  assert.equal(result.next.board[5]?.growth, 1);
  assert.equal(result.next.board[10]?.growth, 2);
  assert.equal(result.next.board[1]?.growth, 1);
  assert.equal(score(result.next.board), 5);
  assert.equal(result.points, 3);
});

test("shadows pass through plants and overlap as a union", () => {
  const board = newGame().board;
  board[0] = { kind: "tree", growth: 2 };
  board[5] = { kind: "tree", growth: 2 };
  assert.deepEqual([...shadows(board, "N")].sort((a, b) => a - b), [5, 10, 15]);
});

test("preview is editable without changing the game; placement validation is strict", () => {
  const game = newGame();
  previewTurn(game, { index: 0, kind: "flower" }, "N");
  const changed = previewTurn(game, { index: 24, kind: "tree" }, "W");
  assert.equal(changed.next.board[0], null);
  assert.equal(game.turns, 0);
  for (const index of [-1, 25, 1.5, NaN]) assert.throws(() => resolveTurn(game, { index, kind: "tree" }, "N"));
  assert.throws(() => resolveTurn(changed.next, { index: 24, kind: "flower" }, "N"));
});

test("exactly twelve placements resolve, and no thirteenth night is allowed", () => {
  let game = newGame();
  for (let index = 0; index < TURNS; index++) {
    game = resolveTurn(game, { index, kind: "tree" }, "N");
    assert.equal(game.turns, index + 1);
    assert.equal(game.board.filter(Boolean).length, index + 1);
  }
  assert.throws(() => resolveTurn(game, { index: 12, kind: "flower" }, "N"), /complete/);
  assert.equal(newGame().turns, 0);
  assert.equal(score(newGame().board), 0);
});
