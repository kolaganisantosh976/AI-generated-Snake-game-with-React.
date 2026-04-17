/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

// Public domain / free to use programmatic audio as AI placeholders
const AUDIO_TRACKS = [
  { id: 'TRACK_01', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
  { id: 'TRACK_02', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
  { id: 'TRACK_03', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
];

type Point = { x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const [trackIdx, setTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [gameOverDisplay, setGameOverDisplay] = useState(false);
  const [startedDisplay, setStartedDisplay] = useState(false);
  const [shake, setShake] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Mutable game state to avoid re-renders during loop
  const state = useRef({
    snake: [{ x: 10, y: 10 }] as Point[],
    food: { x: 15, y: 15 } as Point,
    dir: { x: 1, y: 0 } as Point,
    nextDir: { x: 1, y: 0 } as Point,
    gameOver: false,
    started: false,
    score: 0,
    lastTick: 0,
    particles: [] as Particle[],
  });

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { dir, nextDir, started, gameOver } = state.current;
      
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowUp' && dir.y === 0) state.current.nextDir = { x: 0, y: -1 };
      else if (e.key === 'ArrowDown' && dir.y === 0) state.current.nextDir = { x: 0, y: 1 };
      else if (e.key === 'ArrowLeft' && dir.x === 0) state.current.nextDir = { x: -1, y: 0 };
      else if (e.key === 'ArrowRight' && dir.x === 0) state.current.nextDir = { x: 1, y: 0 };
      
      if (e.key === 'Enter') {
        if (!started || gameOver) {
          state.current = {
            ...state.current,
            snake: [{ x: 10, y: 10 }],
            dir: { x: 1, y: 0 },
            nextDir: { x: 1, y: 0 },
            gameOver: false,
            started: true,
            score: 0,
            particles: [],
          };
          setGameOverDisplay(false);
          setStartedDisplay(true);
          setScoreDisplay(0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Audio Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, trackIdx]);

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const spawnParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 15; i++) {
        state.current.particles.push({
          x: x * CELL_SIZE + CELL_SIZE / 2,
          y: y * CELL_SIZE + CELL_SIZE / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1.0,
          color,
        });
      }
    };

    const update = (time: number) => {
      const gs = state.current;
      
      // Handle logic step
      if (gs.started && !gs.gameOver && time - gs.lastTick > 100) {
        gs.dir = gs.nextDir;
        const head = gs.snake[0];
        const newHead = { x: head.x + gs.dir.x, y: head.y + gs.dir.y };

        // Collision logic
        if (
          newHead.x < 0 || newHead.x >= GRID_SIZE || 
          newHead.y < 0 || newHead.y >= GRID_SIZE ||
          gs.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)
        ) {
          gs.gameOver = true;
          setGameOverDisplay(true);
          setShake(Date.now()); // trigger screen shake
          spawnParticles(head.x, head.y, '#f0f'); // Death explosion
        } else {
          gs.snake.unshift(newHead);
          if (newHead.x === gs.food.x && newHead.y === gs.food.y) {
            gs.score += 1;
            setScoreDisplay(gs.score);
            spawnParticles(gs.food.x, gs.food.y, '#0ff'); // Eat explosion
            gs.food = {
              x: Math.floor(Math.random() * GRID_SIZE),
              y: Math.floor(Math.random() * GRID_SIZE),
            };
          } else {
            gs.snake.pop();
          }
        }
        gs.lastTick = time;
      }

      // Update particles
      for (let i = gs.particles.length - 1; i >= 0; i--) {
        const p = gs.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) {
          gs.particles.splice(i, 1);
        }
      }

      render(ctx);
      rafRef.current = requestAnimationFrame(update);
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      const gs = state.current;
      
      // Clear
      ctx.fillStyle = '#030005';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw Grid lines
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < CANVAS_SIZE; i += CELL_SIZE) {
         ctx.beginPath();
         ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE);
         ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i);
         ctx.stroke();
      }

      if (!gs.started) return;

      // Draw Food
      if (!gs.gameOver) {
        ctx.fillStyle = '#f0f';
        ctx.shadowColor = '#f0f';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(
          gs.food.x * CELL_SIZE + CELL_SIZE / 2, 
          gs.food.y * CELL_SIZE + CELL_SIZE / 2, 
          (Math.sin(Date.now() / 150) + 1.5) * 3, // pulsating
          0, Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw Snake
      gs.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#fff' : '#0ff';
        ctx.shadowColor = i === 0 ? '#fff' : '#0ff';
        ctx.shadowBlur = i === 0 ? 15 : 5;
        ctx.fillRect(seg.x * CELL_SIZE + 2, seg.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      });
      ctx.shadowBlur = 0;

      // Draw Particles
      gs.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const isShaking = shake > 0 && Date.now() - shake < 400;

  return (
    <div className="w-full min-h-screen bg-[#030005] text-[#0ff] font-['Press_Start_2P',_monospace] relative overflow-hidden glitch-container flex flex-col items-center justify-center p-4">
      <div className="scanlines" />
      <div className="noise" />
      
      <audio 
        ref={audioRef} 
        src={AUDIO_TRACKS[trackIdx].url} 
        onEnded={() => setTrackIdx(i => (i + 1) % AUDIO_TRACKS.length)}
      />

      <div className="z-10 flex flex-col items-center w-full max-w-xl">
        
        {/* MUSIC PLAYER */}
        <div className="border border-[#f0f] p-4 w-full bg-black/60 backdrop-blur flex justify-between items-center mb-6 z-20">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#0ff]/70 mb-1">AURAL_FEED</span>
            <span className={`text-sm tracking-tight ${isPlaying ? 'text-[#f0f] glitch-text' : 'text-[#f0f]'}`}>
              {AUDIO_TRACKS[trackIdx].id}
            </span>
          </div>
          <div className="flex space-x-6 text-sm">
             <button onClick={() => setTrackIdx((i) => (i - 1 + AUDIO_TRACKS.length) % AUDIO_TRACKS.length)} className="hover:text-[#f0f] hover:scale-110 transition-transform cursor-pointer"> [ &lt;&lt; ] </button>
             <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-[#f0f] hover:scale-110 transition-transform cursor-pointer"> [ {isPlaying ? '||' : '>'} ] </button>
             <button onClick={() => setTrackIdx((i) => (i + 1) % AUDIO_TRACKS.length)} className="hover:text-[#f0f] hover:scale-110 transition-transform cursor-pointer"> [ &gt;&gt; ] </button>
          </div>
        </div>

        {/* CANVAS CONTAINER */}
        <div 
          className={`border-2 ${gameOverDisplay ? 'border-[#f0f]' : 'border-[#0ff]'} bg-[#000808]/80 shadow-[0_0_20px_rgba(0,255,255,0.2)] relative z-10 w-full max-w-[400px] aspect-square transition-transform ${isShaking ? 'translate-x-[5px] -translate-y-[5px]' : ''}`}
        >
           <canvas 
             ref={canvasRef}
             width={CANVAS_SIZE}
             height={CANVAS_SIZE}
             className="w-full h-full block"
           />
           
           {/* OVERLAY */}
           {(!startedDisplay || gameOverDisplay) && (
             <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center z-20 p-4">
               {gameOverDisplay ? (
                 <>
                   <h2 className="text-[#f0f] text-2xl mb-4 glitch-text">SYS_FAILURE</h2>
                   <p className="text-[#0ff] text-sm mb-8 leading-loose">SCORE: {scoreDisplay}</p>
                 </>
               ) : (
                 <h2 className="text-[#0ff] text-xl mb-6 glitch-text tracking-widest leading-loose text-center">SNAKE<br/>AWAITING_INPUT</h2>
               )}
               <p className="text-white text-[10px] animate-pulse">PRESS [ENTER] TO INITIALIZE</p>
             </div>
           )}
        </div>

        {/* STATUS BAR */}
        <div className="mt-6 flex justify-between w-full border border-[#0ff]/50 bg-black/70 p-3 text-xs z-20">
          <span>STATUS: <span className={startedDisplay && !gameOverDisplay ? "text-[#0ff]" : "text-[#f0f]"}>{startedDisplay ? (gameOverDisplay ? 'OFFLINE' : 'ACTIVE') : 'STANDBY'}</span></span>
          <span>SCORE: <span className="text-white">{scoreDisplay}</span></span>
        </div>
      </div>
    </div>
  );
}
