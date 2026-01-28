// ==========================================
// 1. The "Main Statement" (Business Logic)
// ==========================================
// This module contains pure logic. It knows nothing about React, DOM, or rendering.
// It can be tested, reviewed, and verified independently.

export type Position = { x: number; y: number };

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum CellType {
  EMPTY = ' ',
  WALL = '#',
  PLAYER = '@',
  PLAYER_ON_TARGET = '+',
  BOX = '$',
  BOX_ON_TARGET = '*',
  TARGET = '.',
}

export interface GameState {
  grid: CellType[][];
  width: number;
  height: number;
  moves: number;
  isWon: boolean;
  playerPos: Position;
}

// Helper to find player
const findPlayer = (grid: CellType[][]): Position => {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === CellType.PLAYER || grid[y][x] === CellType.PLAYER_ON_TARGET) {
        return { x, y };
      }
    }
  }
  throw new Error("Player not found in level!");
};

export const parseLevel = (levelStr: string): GameState => {
  const lines = levelStr.trim().split('\n');
  const height = lines.length;
  const width = Math.max(...lines.map(l => l.length));
  
  const grid: CellType[][] = Array.from({ length: height }, (_, y) => {
    const line = lines[y] || '';
    return Array.from({ length: width }, (_, x) => {
      const char = line[x] || ' ';
      // Basic validation or mapping could happen here
      return char as CellType;
    });
  });

  return {
    grid,
    width,
    height,
    moves: 0,
    isWon: false,
    playerPos: findPlayer(grid),
  };
};

const getOffset = (dir: Direction): Position => {
  switch (dir) {
    case Direction.UP: return { x: 0, y: -1 };
    case Direction.DOWN: return { x: 0, y: 1 };
    case Direction.LEFT: return { x: -1, y: 0 };
    case Direction.RIGHT: return { x: 1, y: 0 };
  }
};

const isWalkable = (cell: CellType): boolean => {
  return cell === CellType.EMPTY || cell === CellType.TARGET;
};

const isBox = (cell: CellType): boolean => {
  return cell === CellType.BOX || cell === CellType.BOX_ON_TARGET;
};

// Pure function: Takes state + action, returns NEW state.
export const move = (currentState: GameState, dir: Direction): GameState => {
  if (currentState.isWon) return currentState;

  const { grid, playerPos } = currentState;
  const dx = getOffset(dir).x;
  const dy = getOffset(dir).y;

  const newPos = { x: playerPos.x + dx, y: playerPos.y + dy };
  const nextPos = { x: newPos.x + dx, y: newPos.y + dy };

  // Check bounds
  if (newPos.y < 0 || newPos.y >= grid.length || newPos.x < 0 || newPos.x >= grid[0].length) return currentState;

  const targetCell = grid[newPos.y][newPos.x];
  
  // Case 1: Wall - No move
  if (targetCell === CellType.WALL) return currentState;

  // Clone grid for mutation (Structural Sharing optimization possible, but simple copy for now)
  const newGrid = grid.map(row => [...row]);
  let moved = false;

  // Case 2: Empty or Target - Walk
  if (isWalkable(targetCell)) {
    // Leave old cell
    newGrid[playerPos.y][playerPos.x] = 
      (grid[playerPos.y][playerPos.x] === CellType.PLAYER_ON_TARGET) ? CellType.TARGET : CellType.EMPTY;
    
    // Enter new cell
    newGrid[newPos.y][newPos.x] = 
      (targetCell === CellType.TARGET) ? CellType.PLAYER_ON_TARGET : CellType.PLAYER;
      
    moved = true;
  }
  
  // Case 3: Box - Push
  else if (isBox(targetCell)) {
    // Check if space behind box is valid
    if (nextPos.y < 0 || nextPos.y >= grid.length || nextPos.x < 0 || nextPos.x >= grid[0].length) return currentState;
    const afterBoxCell = grid[nextPos.y][nextPos.x];

    if (isWalkable(afterBoxCell)) {
      // Move Player (Leave old)
      newGrid[playerPos.y][playerPos.x] = 
        (grid[playerPos.y][playerPos.x] === CellType.PLAYER_ON_TARGET) ? CellType.TARGET : CellType.EMPTY;
      
      // Move Player (Enter new, where box was)
      newGrid[newPos.y][newPos.x] = 
        (targetCell === CellType.BOX_ON_TARGET) ? CellType.PLAYER_ON_TARGET : CellType.PLAYER;

      // Move Box (Enter next)
      newGrid[nextPos.y][nextPos.x] = 
        (afterBoxCell === CellType.TARGET) ? CellType.BOX_ON_TARGET : CellType.BOX;

      moved = true;
    }
  }

  if (!moved) return currentState;

  // Check Win Condition
  let isWon = true;
  for (let y = 0; y < newGrid.length; y++) {
    for (let x = 0; x < newGrid[y].length; x++) {
      if (newGrid[y][x] === CellType.BOX) { // Box not on target
        isWon = false; 
        break;
      }
    }
  }

  return {
    ...currentState,
    grid: newGrid,
    moves: currentState.moves + 1,
    playerPos: newPos,
    isWon
  };
};
