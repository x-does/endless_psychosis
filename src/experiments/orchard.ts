export const SIZE = 5;
export const TURNS = 12;
export type PlantKind = "tree" | "flower";
export type Moon = "N" | "E" | "S" | "W";
export type Plant = { kind: PlantKind; growth: number };
export type Board = (Plant | null)[];
export type Game = { board: Board; turns: number };
export type Placement = { index: number; kind: PlantKind };

export function newGame(): Game {
  return { board: Array.from({ length: SIZE * SIZE }, () => null), turns: 0 };
}

/** The moon names its source: northern light sends shadows south. */
export function shadows(board: Board, moon: Moon): Set<number> {
  const [dr, dc] = { N: [1, 0], E: [0, -1], S: [-1, 0], W: [0, 1] }[moon];
  const shaded = new Set<number>();
  board.forEach((plant, index) => {
    if (plant?.kind !== "tree" || plant.growth < 2) return;
    for (let distance = 1; distance <= 2; distance++) {
      const row = Math.floor(index / SIZE) + dr * distance;
      const col = index % SIZE + dc * distance;
      if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) shaded.add(row * SIZE + col);
    }
  });
  return shaded;
}

export function score(board: Board): number {
  return board.reduce((total, plant) => total + (plant && plant.growth >= 2 ? (plant.kind === "tree" ? 2 : 3) : 0), 0);
}

/** A preview is the exact next state; all growth uses the same starting shadows. */
export function previewTurn(game: Game, placement: Placement, moon: Moon) {
  if (game.turns >= TURNS) throw new Error("The twelve nights are complete.");
  if (!Number.isInteger(placement.index) || placement.index < 0 || placement.index >= SIZE * SIZE || game.board[placement.index]) {
    throw new Error("Choose an empty garden bed.");
  }
  const shade = shadows(game.board, moon);
  const planted = game.board.map((plant, index) => index === placement.index ? { kind: placement.kind, growth: 0 } : plant);
  const growing: number[] = [];
  const board = planted.map((plant, index) => {
    if (!plant || plant.growth >= 2) return plant;
    const grows = plant.kind === "tree" ? !shade.has(index) : shade.has(index);
    if (!grows) return plant;
    growing.push(index);
    return { ...plant, growth: plant.growth + 1 };
  });
  const next: Game = { board, turns: game.turns + 1 };
  return { next, shade, growing, points: score(board) - score(game.board) };
}

export function resolveTurn(game: Game, placement: Placement, moon: Moon): Game {
  return previewTurn(game, placement, moon).next;
}
