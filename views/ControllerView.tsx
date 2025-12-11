import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { sendPlayerUpdate } from '../services/firebaseService';
import { Button } from '../components/Button';

// Neon colors for players
const PLAYER_COLORS = [
  '#06b6d4', // Cyan
  '#f472b6', // Pink
  '#a3e635', // Lime
  '#facc15', // Yellow
  '#818cf8', // Indigo
  '#fb923c', // Orange
];

type ControlMode = 'gyro' | 'touch';

export const ControllerView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string>('');
  const [controlMode, setControlMode] = useState<ControlMode>('gyro');
  
  // State for Gyro Visuals
  const [debugInfo, setDebugInfo] = useState({ x: 0, y: 0 });
  
  // State for Touch Input (Using Refs for the loop to avoid stale closures)
  const touchInput = useRef({
    left: false,
    right: false,
    brake: false,
    boost: false
  });

  // Generate a consistent Player ID and Color for this session
  const playerConfig = useMemo(() => {
    const id = 'P-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    return { id, color };
  }, []);

  const requestAccess = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
        } else {
          setError('Permission denied.');
        }
      } catch (e: any) {
        setError(e.message);
      }
    } else {
      setPermissionGranted(true);
    }
  };

  // --- GYRO LOGIC ---
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!roomId || controlMode !== 'gyro') return;
    
    // Clamp values
    const x = Math.min(Math.max(event.gamma || 0, -45), 45); 
    const y = Math.min(Math.max(event.beta || 0, -45), 45);

    setDebugInfo({ x: Math.round(x), y: Math.round(y) });

    sendPlayerUpdate(roomId, playerConfig.id, {
      id: playerConfig.id,
      color: playerConfig.color,
      x: Math.round(x),
      y: Math.round(y),
      isBoosting: false, // In gyro mode, boost is a separate button handled elsewhere
      alive: true
    });
  }, [roomId, playerConfig, controlMode]);

  useEffect(() => {
    if (permissionGranted && controlMode === 'gyro') {
      window.addEventListener('deviceorientation', handleOrientation);
      // Send initial "I'm here" packet
      sendPlayerUpdate(roomId!, playerConfig.id, { 
        id: playerConfig.id, 
        color: playerConfig.color,
        alive: true,
        x: 0, 
        y: 0 
      });
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permissionGranted, handleOrientation, roomId, playerConfig, controlMode]);


  // --- TOUCH LOGIC ---
  useEffect(() => {
    if (controlMode !== 'touch' || !roomId) return;

    const interval = setInterval(() => {
      const { left, right, brake, boost } = touchInput.current;
      
      // Calculate X (Steering)
      let x = 0;
      if (left) x = -45;
      if (right) x = 45;

      // Calculate Y (Speed/Brake)
      // Default 0. Brake moves back/down (positive Y in this game engine).
      let y = 0;
      if (brake) y = 45; 

      sendPlayerUpdate(roomId, playerConfig.id, {
        id: playerConfig.id,
        color: playerConfig.color,
        x,
        y,
        isBoosting: boost,
        alive: true
      });

      // Update local debug info for visuals
      setDebugInfo({ x, y });

    }, 50); // Send updates every 50ms

    return () => clearInterval(interval);
  }, [controlMode, roomId, playerConfig]);

  const handleTouch = (key: keyof typeof touchInput.current, active: boolean) => {
    touchInput.current[key] = active;
  };

  // --- BOOST BUTTON (GYRO MODE) ---
  const handleGyroBoost = (active: boolean) => {
    if(roomId && controlMode === 'gyro') {
        sendPlayerUpdate(roomId, playerConfig.id, { isBoosting: active });
    }
  };


  // --- RENDER HELPERS ---
  const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
  if (isHttp) return <div className="p-8 text-white">Please use HTTPS</div>;
  if (!roomId) return <div className="p-8 text-white">Invalid Room ID</div>;

  if (!permissionGranted) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white" style={{ borderTop: `6px solid ${playerConfig.color}`}}>
        <h1 className="text-3xl font-bold mb-4" style={{ color: playerConfig.color }}>Player Ready?</h1>
        <p className="mb-8 text-slate-300">Tap below to join the race.</p>
        <Button onClick={requestAccess} className="w-full py-6 text-xl" style={{ backgroundColor: playerConfig.color, color: 'black' }}>
          JOIN GAME
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden select-none touch-none">
      
      {/* Player Identity Header & Mode Toggle */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-slate-900/50 border-b border-slate-800 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: playerConfig.color, color: playerConfig.color }}></div>
            <span className="font-mono font-bold text-white">{playerConfig.id}</span>
        </div>
        
        {/* Toggle Switch */}
        <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
            <button 
                onClick={() => setControlMode('gyro')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${controlMode === 'gyro' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400'}`}
            >
                GYRO
            </button>
            <button 
                onClick={() => setControlMode('touch')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${controlMode === 'touch' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400'}`}
            >
                TOUCH
            </button>
        </div>
      </div>

      {/* --- GYRO UI --- */}
      {controlMode === 'gyro' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 space-y-8">
            <div 
                className="w-64 h-64 rounded-full border-4 relative flex items-center justify-center transition-transform duration-75"
                style={{ 
                    borderColor: playerConfig.color,
                    boxShadow: `0 0 20px ${playerConfig.color}40`,
                    transform: `rotate(${debugInfo.x}deg)`
                }}
            >
                <div className="absolute top-0 w-4 h-8 bg-white/50 rounded-b"></div>
                <div className="text-white/50 font-bold text-2xl tracking-widest">STEER</div>
            </div>

            <div className="w-full max-w-xs">
                <button
                    className="w-full aspect-video rounded-2xl font-bold text-3xl tracking-widest transition-all duration-100 border-2 flex flex-col items-center justify-center gap-2 bg-slate-800 text-white shadow-lg active:scale-95 active:bg-white active:text-black"
                    style={{ borderColor: playerConfig.color }}
                    onTouchStart={() => handleGyroBoost(true)}
                    onTouchEnd={() => handleGyroBoost(false)}
                    onMouseDown={() => handleGyroBoost(true)}
                    onMouseUp={() => handleGyroBoost(false)}
                >
                    BOOST
                </button>
            </div>
        </div>
      )}

      {/* --- TOUCH UI --- */}
      {controlMode === 'touch' && (
        <div className="flex-1 flex flex-row items-end justify-between p-6 z-10 gap-4 pb-12">
            
            {/* Left Hand: Steering */}
            <div className="flex gap-2 w-1/2 h-48">
                <button 
                    className="flex-1 bg-slate-800/80 border-2 border-slate-600 rounded-xl active:bg-cyan-500/50 active:border-cyan-400 transition-colors flex items-center justify-center"
                    onTouchStart={(e) => { e.preventDefault(); handleTouch('left', true); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleTouch('left', false); }}
                    onMouseDown={() => handleTouch('left', true)}
                    onMouseUp={() => handleTouch('left', false)}
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button 
                    className="flex-1 bg-slate-800/80 border-2 border-slate-600 rounded-xl active:bg-cyan-500/50 active:border-cyan-400 transition-colors flex items-center justify-center"
                    onTouchStart={(e) => { e.preventDefault(); handleTouch('right', true); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleTouch('right', false); }}
                    onMouseDown={() => handleTouch('right', true)}
                    onMouseUp={() => handleTouch('right', false)}
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
            </div>

            {/* Right Hand: Action */}
            <div className="flex flex-col gap-2 w-1/3 h-48">
                <button 
                    className="flex-1 bg-yellow-500/20 border-2 border-yellow-500 rounded-xl active:bg-yellow-500 active:text-black text-yellow-500 font-black tracking-widest transition-all"
                    style={{ color: playerConfig.color, borderColor: playerConfig.color, backgroundColor: `${playerConfig.color}20` }}
                    onTouchStart={(e) => { e.preventDefault(); handleTouch('boost', true); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleTouch('boost', false); }}
                    onMouseDown={() => handleTouch('boost', true)}
                    onMouseUp={() => handleTouch('boost', false)}
                >
                    BOOST
                </button>
                <button 
                    className="h-16 bg-red-500/20 border-2 border-red-500 rounded-xl active:bg-red-500 active:text-white text-red-500 font-bold tracking-widest transition-all"
                    onTouchStart={(e) => { e.preventDefault(); handleTouch('brake', true); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleTouch('brake', false); }}
                    onMouseDown={() => handleTouch('brake', true)}
                    onMouseUp={() => handleTouch('brake', false)}
                >
                    BRAKE
                </button>
            </div>
        </div>
      )}

    </div>
  );
};