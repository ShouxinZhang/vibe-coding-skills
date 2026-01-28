import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameState, CellType, Direction, startLevel, move, parseLevel } from '@/logic/core';
import { LEVEL_1, LEVEL_2 } from '@/logic/levels';
import { Undo2, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CELL_SIZE = 40;

const Cell = ({ type, x, y }: { type: CellType, x: number, y: number }) => {
  let content = null;
  let bgClass = "bg-stone-200"; // FLOOR default

  // Rendering logic (The "Proof" details)
  switch (type) {
    case CellType.WALL:
      bgClass = "bg-stone-800 shadow-inner";
      break;
    case CellType.TARGET:
      bgClass = "bg-stone-300";
      content = <div className="w-3 h-3 rounded-full bg-red-400 opacity-50" />;
      break;
    case CellType.BOX:
      bgClass = "bg-stone-200";
      content = <div className="w-8 h-8 bg-amber-700 rounded-sm border-2 border-amber-800 shadow-md flex items-center justify-center text-amber-100 font-bold">$</div>;
      break;
    case CellType.BOX_ON_TARGET:
      bgClass = "bg-stone-300"; // Target floor
      content = <div className="w-8 h-8 bg-green-600 rounded-sm border-2 border-green-800 shadow-[0_0_10px_rgba(0,255,0,0.5)] flex items-center justify-center text-white font-bold">✓</div>;
      break;
    case CellType.PLAYER:
      bgClass = "bg-stone-200";
      content = <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-blue-800 shadow-lg text-white flex items-center justify-center">@</div>;
      break;
    case CellType.PLAYER_ON_TARGET:
      bgClass = "bg-stone-300";
      content = <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-blue-800 shadow-lg text-white flex items-center justify-center">@</div>;
      break;
    case CellType.EMPTY: 
    default:
      // Keep floor styles
      break;
  }

  // Adjust for visual niceties
  if (type === CellType.WALL) content = null;

  return (
    <div 
      className={cn("absolute flex items-center justify-center transition-all duration-200", bgClass)}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        left: x * CELL_SIZE,
        top: y * CELL_SIZE,
      }}
    >
      {content}
    </div>
  );
};

export const Game = () => {
  const [levelIndex, setLevelIndex] = useState(0);
  const levels = [LEVEL_1, LEVEL_2];
  
  // History for undo
  const [history, setHistory] = useState<GameState[]>([]);
  const [currentState, setCurrentState] = useState<GameState>(() => parseLevel(levels[0]));

  const loadLevel = (idx: number) => {
    const newState = parseLevel(levels[idx]);
    setCurrentState(newState);
    setHistory([]);
  };

  const handleMove = useCallback((dir: Direction) => {
    if (currentState.isWon) return;
    
    const nextState = move(currentState, dir);
    if (nextState !== currentState) {
      setHistory(prev => [...prev, currentState]);
      setCurrentState(nextState);
    }
  }, [currentState]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentState(previous);
  };

  const handleReset = () => {
    loadLevel(levelIndex);
  };

  const nextLevel = () => {
    const nextIdx = (levelIndex + 1) % levels.length;
    setLevelIndex(nextIdx);
    loadLevel(nextIdx);
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowUp': case 'w': handleMove(Direction.UP); break;
        case 'ArrowDown': case 's': handleMove(Direction.DOWN); break;
        case 'ArrowLeft': case 'a': handleMove(Direction.LEFT); break;
        case 'ArrowRight': case 'd': handleMove(Direction.RIGHT); break;
        case 'z': if (e.ctrlKey || e.metaKey) handleUndo(); break;
        case 'r': handleReset(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove]); // Dependencies must be correct

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 p-4 font-sans text-stone-800">
      <div className="max-w-2xl w-full space-y-4">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900">Modular Sokoban</h1>
          <p className="text-stone-500">
            A demonstration of separating <span className="font-semibold text-blue-600">Business Logic</span> from <span className="font-semibold text-amber-600">Implementation Details</span>.
          </p>
        </div>

        {/* Game Card */}
        <Card className="border-2 border-stone-200 shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-stone-50 border-b border-stone-100 flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Level {levelIndex + 1}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Moves: <span className="font-mono font-bold">{currentState.moves}</span></p>
            </div>
            <div className="flex gap-2">
               <Button variant="outline" size="icon" onClick={handleUndo} disabled={history.length === 0} title="Undo (Ctrl+Z)">
                 <Undo2 className="h-4 w-4" />
               </Button>
               <Button variant="outline" size="icon" onClick={handleReset} title="Reset (R)">
                 <RotateCcw className="h-4 w-4" />
               </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-8 flex justify-center bg-stone-50/50 min-h-[400px] items-center overflow-auto">
             <div 
               className="relative bg-stone-800 rounded-md border-4 border-stone-800 shadow-2xl"
               style={{
                 width: currentState.width * CELL_SIZE,
                 height: currentState.height * CELL_SIZE,
               }}
             >
                {currentState.grid.map((row, y) => 
                  row.map((cell, x) => (
                    <Cell key={`${x}-${y}`} type={cell} x={x} y={y} />
                  ))
                )}
                
                {currentState.isWon && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
                    <h2 className="text-3xl font-bold mb-2">Level Complete!</h2>
                    <Button onClick={nextLevel} className="mt-4 bg-green-600 hover:bg-green-700 text-white border-none">
                      Next Level
                    </Button>
                  </div>
                )}
             </div>
          </CardContent>

          <CardFooter className="bg-stone-50 border-t border-stone-100 p-4 flex justify-between items-center text-sm text-stone-500">
            <div className="hidden sm:flex gap-1 items-center">
              <span className="bg-stone-200 px-2 py-1 rounded text-xs font-mono">WASD</span>
              <span>to move</span>
            </div>
            
             {/* Virtual Controls for Mobile */}
            <div className="flex sm:hidden gap-2 mx-auto">
               <Button size="icon" variant="secondary" onClick={() => handleMove(Direction.LEFT)}><ArrowLeft className="h-4 w-4"/></Button>
               <div className="flex flex-col gap-2">
                 <Button size="icon" variant="secondary" onClick={() => handleMove(Direction.UP)}><ArrowUp className="h-4 w-4"/></Button>
                 <Button size="icon" variant="secondary" onClick={() => handleMove(Direction.DOWN)}><ArrowDown className="h-4 w-4"/></Button>
               </div>
               <Button size="icon" variant="secondary" onClick={() => handleMove(Direction.RIGHT)}><ArrowRight className="h-4 w-4"/></Button>
            </div>
          </CardFooter>
        </Card>

        {/* Explanation Section */}
        <div className="grid md:grid-cols-2 gap-4 text-sm bg-blue-50/50 p-4 rounded-lg border border-blue-100">
          <div>
            <h3 className="font-bold text-blue-800 mb-2">Logic (Statement)</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-700/80">
              <li>Pure TypeScript functions</li>
              <li>Type: <code>(State, Action) ={'>'} State</code></li>
              <li>Unit testable without UI</li>
              <li>Located in <code>src/logic/core.ts</code></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-amber-800 mb-2">Implementation (Proof)</h3>
            <ul className="list-disc list-inside space-y-1 text-amber-700/80">
              <li>React Components</li>
              <li>Tailwind Styles</li>
              <li>Input handling (Keyboard/Touch)</li>
              <li>Located in <code>src/components/</code></li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};
