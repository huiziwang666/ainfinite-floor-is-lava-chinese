import React, { useState } from 'react';
import { GameState } from './types';
import WebcamController from './components/WebcamController';
import GameEngine from './components/GameEngine';
import { Play, RotateCcw, Pause } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    score: 0,
    gameOver: false,
    speed: 0,
    cameraReady: false,
    lastLaneChange: 0,
    lives: 3
  });

  const [poseData, setPoseData] = useState<any>(null);

  const handleStart = () => {
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      score: 0,
      lives: 3
    }));
  };

  const handleRestart = () => {
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      score: 0,
      lives: 3
    }));
  };

  const handlePause = () => {
    setGameState(prev => ({ ...prev, isPaused: true }));
  };

  const handleResume = () => {
    setGameState(prev => ({ ...prev, isPaused: false }));
  };

  const onCameraReady = () => {
    setGameState(prev => ({ ...prev, cameraReady: true }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1a0a2e]">
      {/* Branding - CNY Theme */}
      <div className="absolute bottom-4 right-4 z-50 bg-[#8B0000]/80 backdrop-blur-md p-2 rounded-lg border border-[#FFD700]/50 flex flex-col items-center">
        <img src="/new-logo.png" alt="AInfinite Game Studio" className="w-10 h-10 mb-1" />
        <div className="text-[#FFD700]/90 text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
            AInfinite<br/>Game Studio
        </div>
      </div>

      <WebcamController 
        onPoseUpdate={setPoseData} 
        onCameraReady={onCameraReady}
        showSkeleton={true} 
      />

      {/* Main Game Container */}
      <GameEngine 
          gameState={gameState} 
          setGameState={setGameState} 
          poseData={poseData}
      />

      {/* Pause Button - visible during active gameplay - CNY Theme */}
      {gameState.isPlaying && !gameState.gameOver && !gameState.isPaused && (
        <button
          onClick={handlePause}
          className="absolute top-8 right-8 z-50 bg-[#8B0000]/80 hover:bg-[#8B0000] p-3 rounded-lg border-2 border-[#FFD700] transition-all"
        >
          <Pause size={28} color="#FFD700" />
        </button>
      )}

      {/* Pause Overlay - CNY Theme */}
      {gameState.isPlaying && gameState.isPaused && !gameState.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-[#8B0000] to-[#660000] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-4 border-[#FFD700]">
            <div className="text-6xl mb-4">🏮</div>
            <h2 className="text-3xl text-[#FFD700] font-black mb-6 game-font">PAUSED</h2>
            <button
              onClick={handleResume}
              className="w-full py-4 bg-[#FFD700] hover:bg-[#FFC000] text-[#8B0000] text-xl rounded-xl font-black shadow-[0_4px_0_#B8860B] active:shadow-[0_2px_0_#B8860B] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <Play size={24} fill="currentColor" />
              Resume
            </button>
          </div>
        </div>
      )}

      {/* UI Overlays - Chinese New Year Theme */}
      {(!gameState.isPlaying || gameState.gameOver) && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
           <div className="bg-gradient-to-b from-[#8B0000] to-[#660000] rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl border-4 border-[#FFD700] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-28 bg-[#FFD700]/10 z-0"></div>

              <div className="relative z-10 pt-2">
                {!gameState.gameOver ? (
                    // START SCREEN - CNY Theme
                    <>
                        <div className="text-6xl mb-2">🐒</div>
                        <h1 className="text-3xl text-[#FFD700] font-black drop-shadow-md mb-2 game-font">
                            MONKEY KING RUN
                        </h1>
                        <p className="text-[#FFD700]/80 text-sm mb-4">🏮 Happy Chinese New Year! 🏮</p>

                        {!gameState.cameraReady ? (
                            <div className="animate-pulse text-xl text-[#FFD700]/70 mb-8 py-8">
                                Loading Vision AI...
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-left bg-black/20 p-4 rounded-xl border-2 border-[#FFD700]/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 flex items-center justify-center text-xl">🧍</div>
                                        <div>
                                            <div className="font-bold text-[#FFD700] text-sm">Stand Back</div>
                                            <div className="text-xs text-white/60">Show full body</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 flex items-center justify-center text-xl">↔️</div>
                                        <div>
                                            <div className="font-bold text-[#FFD700] text-sm">Lean</div>
                                            <div className="text-xs text-white/60">To switch lanes</div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 bg-[#FFD700]/10 p-2 rounded-lg border border-[#FFD700]/30">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#FFD700]/30 flex items-center justify-center text-xl">⬆️</div>
                                            <div>
                                                <div className="font-bold text-[#FFD700] text-sm">HOW TO JUMP</div>
                                                <div className="text-xs text-white/70">Quickly jump UP with your whole body!</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStart}
                                    className="w-full py-5 bg-[#FFD700] hover:bg-[#FFC000] text-[#8B0000] text-3xl rounded-2xl font-black shadow-[0_6px_0_#B8860B] active:shadow-[0_2px_0_#B8860B] active:translate-y-1 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                                >
                                    <Play size={32} fill="currentColor" />
                                    PLAY
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    // GAME OVER - CNY Theme
                    <div className="-mt-4">
                        {/* Monkey King emoji with glow effect */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex justify-center items-center">
                                <div className="w-28 h-28 bg-[#FFD700]/20 rounded-full blur-xl"></div>
                            </div>
                            <div className="text-8xl relative z-10">🐒</div>
                        </div>

                        {/* Game Over Text */}
                        <h1 className="text-4xl text-[#FFD700] font-black mb-1 game-font tracking-wide">
                            GAME OVER
                        </h1>
                        <p className="text-sm text-white/50 font-medium mb-6">Better luck next time!</p>

                        {/* Score Display */}
                        <div className="bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/10 rounded-2xl p-6 mb-6 shadow-lg border-2 border-[#FFD700]/30">
                            <div className="text-[#FFD700] text-xs font-bold uppercase tracking-widest mb-2">🧧 Your Score</div>
                            <div className="text-5xl text-white font-black game-font">{gameState.score}</div>
                        </div>

                        {/* Play Again Button */}
                        <button
                            onClick={handleRestart}
                            className="w-full py-4 bg-[#FFD700] hover:bg-[#FFC000] text-[#8B0000] text-xl rounded-xl font-black shadow-[0_4px_0_#B8860B] active:shadow-[0_2px_0_#B8860B] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                            <RotateCcw size={24} />
                            Play Again
                        </button>
                    </div>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;