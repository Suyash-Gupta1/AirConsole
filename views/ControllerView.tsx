import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { sendControllerData } from '../services/firebaseService';
import { Button } from '../components/Button';

type ControlMode = 'motion' | 'touch';

export const ControllerView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string>('');
  const [isBoosting, setIsBoosting] = useState(false);
  const [controlMode, setControlMode] = useState<ControlMode>('motion');
  
  // State for Visual Feedback
  const [debugInfo, setDebugInfo] = useState({ x: 0, y: 0, orientation: 'portrait' });
  
  // Track initial offset for Gyro calibration
  const baseOffset = useRef({ x: 0, y: 0, set: false });

  // State for Touch Input (Refs for mutable state in the loop)
  const touchInput = useRef({
    left: false,
    right: false,
  });

  const requestAccess = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
        } else {
          setError('Permission denied. Please allow motion sensors.');
        }
      } catch (e: any) {
        setError(e.message || 'Error requesting permission');
      }
    } else {
      setPermissionGranted(true);
    }
  };

  // --- GYRO LOGIC ---
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!roomId || controlMode !== 'motion') return;
    
    const isLandscape = window.innerWidth > window.innerHeight;
    
    let rawX = 0;
    let rawY = 0;
    let currentOrientation: 'portrait' | 'landscape' = isLandscape ? 'landscape' : 'portrait';

    // Sensor Values
    const gamma = event.gamma || 0; // Left/Right Roll
    const beta = event.beta || 0;   // Front/Back Pitch
    
    if (isLandscape) {
        // LANDSCAPE (Steering Wheel): Use Beta for steering (X). Gamma for vertical (Y).
        rawX = beta; 
        rawY = gamma;
        
        // CRITICAL SIGN FIX: Invert Beta for natural steering wheel feel (push away = negative/left)
        rawX = rawX * -1;
    } else {
        // PORTRAIT (Remote): Use Gamma for steering (X). Beta for vertical (Y).
        rawX = gamma;
        rawY = beta;
    }

    // 1. AUTO-CALIBRATION
    if (!baseOffset.current.set && Math.abs(rawX) > 1) {
        baseOffset.current.x = rawX;
        baseOffset.current.y = rawY;
        baseOffset.current.set = true;
    }

    // 2. Apply Calibration & Drift Correction (Decay Offset)
    if (baseOffset.current.set) {
       baseOffset.current.x = baseOffset.current.x * 0.99; 
       baseOffset.current.y = baseOffset.current.y * 0.99; 
       rawX -= baseOffset.current.x;
       rawY -= baseOffset.current.y;
    }
    
    // 3. Clamp values (-60 to 60 degrees is safe for input range)
    // Removed rounding to keep precision
    const x = Math.min(Math.max(rawX, -60), 60); 
    const y = Math.min(Math.max(rawY, -60), 60);

    setDebugInfo({ x: Math.round(x), y: Math.round(y), orientation: currentOrientation });

    sendControllerData(roomId, {
      x: x, // Send float value for precision
      y: y, 
      isBoosting: isBoosting, // Use local state for boost
      timestamp: Date.now()
    });
  }, [roomId, isBoosting, controlMode]);

  useEffect(() => {
    if (permissionGranted && controlMode === 'motion') {
      window.addEventListener('deviceorientation', handleOrientation);
      window.addEventListener('orientationchange', () => { baseOffset.current.set = false; });
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('orientationchange', () => {});
    };
  }, [permissionGranted, handleOrientation, roomId, controlMode]);


  // --- TOUCH LOGIC LOOP (Runs constantly in touch mode) ---
  useEffect(() => {
    if (controlMode !== 'touch' || !roomId) return;

    const interval = setInterval(() => {
      const { left, right } = touchInput.current;
      
      let x = 0;
      const MAX_DIGITAL_TILT = 60; // Max signal sent for digital press

      // Steering (X)
      if (left) x = -MAX_DIGITAL_TILT;
      if (right) x = MAX_DIGITAL_TILT;
      
      // Y axis is always 0 in digital steering mode (we assume the game handles acceleration via boost/W)
      const y = 0; 

      sendControllerData(roomId, {
        x, // -60, 0, or 60
        y, 
        isBoosting: isBoosting,
        timestamp: Date.now()
      });

      setDebugInfo(prev => ({ x, y, orientation: 'touch' }));

    }, 50); // Send updates every 50ms (20fps)

    return () => clearInterval(interval);
  }, [controlMode, roomId, isBoosting]);

  const handleDigitalSteer = (direction: 'left' | 'right' | 'stop') => {
      if (direction === 'stop') {
          touchInput.current.left = false;
          touchInput.current.right = false;
      } else if (direction === 'left') {
          touchInput.current.left = true;
          touchInput.current.right = false;
      } else if (direction === 'right') {
          touchInput.current.right = true;
          touchInput.current.left = false;
      }
  };

  const handleBoostStart = () => {
      setIsBoosting(true);
      // Immediately send the boost signal to override throttle for responsiveness
      if (roomId) {
        const currentX = controlMode === 'touch' ? (touchInput.current.left ? -60 : (touchInput.current.right ? 60 : 0)) : debugInfo.x;
        sendControllerData(roomId, {
            x: currentX,
            y: 0,
            isBoosting: true,
            timestamp: Date.now()
        });
      }
  };

  const handleBoostEnd = () => {
      setIsBoosting(false);
      // Immediately send the boost signal OFF
      if (roomId) {
          const currentX = controlMode === 'touch' ? (touchInput.current.left ? -60 : (touchInput.current.right ? 60 : 0)) : debugInfo.x;
          sendControllerData(roomId, {
              x: currentX,
              y: 0,
              isBoosting: false,
              timestamp: Date.now()
          });
      }
  };

  const recalibrate = () => { baseOffset.current.set = false; };

  // --- UI RENDERERS ---
  const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
  if (isHttp) return <div className="p-8 text-white">Please use HTTPS</div>;
  if (!roomId) return <div className="p-8 text-white">Invalid Room ID</div>;

  if (!permissionGranted) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
        <h1 className="text-3xl font-bold mb-4 text-cyan-400">Air Console</h1>
        <p className="mb-8 text-slate-300">Tap below to connect sensors.</p>
        <Button onClick={requestAccess} className="w-full py-6 text-xl shadow-lg shadow-cyan-500/30">
          START ENGINE
        </Button>
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    );
  }

  // Helper for D-Pad Buttons
  const DPadBtn = ({ dir, icon, className = "" }: { dir: 'left' | 'right', icon: React.ReactNode, className?: string }) => (
    <button
        className={`bg-slate-800 border-2 border-slate-600 rounded-xl active:bg-cyan-600 active:border-cyan-400 active:text-white text-slate-400 transition-colors flex items-center justify-center shadow-lg active:scale-95 ${className}`}
        onTouchStart={(e) => { e.preventDefault(); handleDigitalSteer(dir); }}
        onTouchEnd={(e) => { e.preventDefault(); handleDigitalSteer('stop'); }}
        onMouseDown={() => handleDigitalSteer(dir)}
        onMouseUp={() => handleDigitalSteer('stop')}
        onMouseLeave={() => handleDigitalSteer('stop')}
    >
        {icon}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden select-none touch-none">
      
      {/* Top Bar */}
      <div className="absolute top-0 w-full p-4 flex justify-end items-center bg-slate-900/80 border-b border-slate-800 z-20 backdrop-blur-md">
          {/* Toggle Switch */}
          <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
              <button 
                  onClick={() => setControlMode('motion')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${controlMode === 'motion' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400'}`}
              >
                  MOTION
              </button>
              <button 
                  onClick={() => setControlMode('touch')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${controlMode === 'touch' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400'}`}
              >
                  GAMEPAD
              </button>
          </div>
      </div>

      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 opacity-20 transition-transform duration-100 ease-linear"
        style={{ 
            background: `linear-gradient(${debugInfo.x * 2}deg, transparent 40%, #06b6d4 50%, transparent 60%)`,
            transform: `scale(1.5)`
        }}
      ></div>

      {controlMode === 'motion' ? (
        /* === MOTION CONTROLLER UI === */
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-5xl font-black text-white italic tracking-tighter">
                    {Math.abs(debugInfo.x) < 5 ? 'CENTER' : (debugInfo.x < 0 ? 'LEFT' : 'RIGHT')}
                </h2>
                <div className="flex gap-4 justify-center text-xs font-mono text-slate-500">
                    <span>{debugInfo.orientation.toUpperCase()}</span>
                    <span>TILT: {debugInfo.x}°</span>
                </div>
            </div>

            <div 
                className="w-64 h-64 border-4 border-slate-700 rounded-full relative flex items-center justify-center bg-slate-900/50 backdrop-blur shadow-2xl transition-transform duration-75 ease-out"
                style={{ transform: `rotate(${debugInfo.x}deg)` }}
                onClick={recalibrate}
            >
                <div className="absolute top-0 w-2 h-4 bg-cyan-500"></div>
                <div className="absolute inset-2 border-2 border-slate-800 rounded-full"></div>
                <div className="text-cyan-500 font-bold text-2xl transform">
                    {Math.abs(debugInfo.x) < 5 ? '◉' : (debugInfo.x < 0 ? '←' : '→')}
                </div>
                <div className="absolute bottom-10 text-[10px] text-slate-500">TAP TO CENTER</div>
            </div>

            <div className="w-full max-w-xs">
                <button
                    className={`
                        w-full aspect-video rounded-2xl font-bold text-3xl tracking-widest transition-all duration-100
                        border-4 flex items-center justify-center
                        ${isBoosting 
                            ? 'bg-orange-500 border-orange-400 text-black scale-95 shadow-[0_0_30px_#f97316]' 
                            : 'bg-slate-800 border-slate-600 text-cyan-400 shadow-lg active:scale-95'
                        }
                    `}
                    onTouchStart={handleBoostStart}
                    onTouchEnd={handleBoostEnd}
                    onMouseDown={handleBoostStart}
                    onMouseUp={handleBoostEnd}
                >
                    NITRO
                </button>
            </div>
        </div>
      ) : (
        /* === DIGITAL CONTROLLER UI === */
        <div className="flex-1 flex flex-row items-end justify-between p-6 z-10 gap-4 pb-8 max-w-4xl mx-auto w-full">
            
            {/* LEFT SIDE: D-Pad (Steering) */}
            <div className="w-48 h-48 grid grid-cols-3 grid-rows-3 gap-2">
                <div></div>
                {/* UP/DOWN buttons removed for race steering simplicity */}
                <div className='col-span-3 h-8'></div>
                
                <DPadBtn dir="left" icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>} />
                <div className="flex items-center justify-center rounded-full bg-slate-900/50 border border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                </div>
                <DPadBtn dir="right" icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>} />
                
                <div className='col-span-3 h-8'></div>
            </div>

            {/* RIGHT SIDE: Action Buttons */}
            <div className="flex flex-col gap-4 w-40 h-48 justify-end items-end">
                <button 
                    className={`
                        w-full h-24 rounded-2xl font-black text-2xl tracking-widest transition-all duration-75 border-4 shadow-xl
                        flex flex-col items-center justify-center
                        ${isBoosting 
                            ? 'bg-orange-500 border-orange-400 text-black scale-95 shadow-[0_0_30px_#f97316]' 
                            : 'bg-slate-800/80 border-slate-600 text-orange-500 shadow-slate-900/50'
                        }
                    `}
                    onTouchStart={handleBoostStart}
                    onTouchEnd={handleBoostEnd}
                    onMouseDown={handleBoostStart}
                    onMouseUp={handleBoostEnd}
                >
                    NITRO
                </button>
            </div>
        </div>
      )}
      
      <div className="p-4 bg-slate-900 border-t border-slate-800 text-center z-20">
          <p className="text-xs text-slate-500 font-mono">ROOM: {roomId} | MODE: {controlMode.toUpperCase()}</p>
      </div>

    </div>
  );
};