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
  const [debugInfo, setDebugInfo] = useState({ x: 0, orientation: 'portrait' });
  const [controlMode, setControlMode] = useState<ControlMode>('motion');
  
  // Track initial offset to "Zero" the steering when we start
  const baseOffset = useRef({ x: 0, set: false });

  // Track digital input state (0 for stop, -60 for left, 60 for right)
  const digitalState = useRef({ x: 0 });

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

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!roomId || controlMode === 'touch') return;
    
    // Check screen width to determine orientation
    const isLandscape = window.innerWidth > window.innerHeight;
    
    let rawX = 0;
    let rawY = 0;
    let currentOrientation: 'portrait' | 'landscape' = isLandscape ? 'landscape' : 'portrait';

    if (isLandscape) {
        // LANDSCAPE MODE (Steering Wheel)
        // Beta is the axis for front/back tilt (pitch).
        // Gamma is the axis for left/right roll.
        
        // Use Beta for steering (like a wheel)
        rawX = event.beta || 0;
        rawY = event.gamma || 0;
        
        // Correct for 180-degree rotation if the phone is flipped (e.g., home button left vs right)
        // This relies on the internal window.orientation API, which helps determine the exact rotation.
        if (window.orientation === 90 || window.orientation === -90) {
            // Standardizing the base X axis to be relative to the phone's frame
            if (Math.abs(window.orientation) === 90) {
                // When in landscape, we often want the axis flipped so tilting 'up' means 'center'
                // This is a common fix for different browsers/OS
                rawX = (window.orientation === 90) ? (event.beta || 0) : -(event.beta || 0);
            }
        }
    } else {
        // PORTRAIT MODE (TV Remote)
        rawX = event.gamma || 0;
        rawY = event.beta || 0;
    }

    // --- SENSOR DATA CLEANUP AND CALIBRATION ---
    
    // 1. AUTO-CALIBRATION
    if (!baseOffset.current.set && rawX !== 0) {
        baseOffset.current.x = rawX;
        baseOffset.current.set = true;
    }

    // 2. Apply Calibration & Drift Correction (Decay Offset)
    if (baseOffset.current.set) {
       baseOffset.current.x = baseOffset.current.x * 0.99; 
       rawX -= baseOffset.current.x;
    }

    // 3. Clamp values (-60 to 60 degrees)
    const x = Math.min(Math.max(rawX, -60), 60); 
    const y = Math.min(Math.max(rawY, -60), 60);

    setDebugInfo({ x: Math.round(x), orientation: currentOrientation });

    sendControllerData(roomId, {
      x: Math.round(x),
      y: Math.round(y),
      isBoosting,
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
      window.removeEventListener('orientationchange', () => { });
    };
  }, [permissionGranted, handleOrientation, controlMode]);

  // --- DIGITAL INPUT HANDLERS ---
  const handleDigitalSteer = (direction: 'left' | 'right' | 'stop') => {
    if (controlMode !== 'touch' || !roomId) return;

    let targetX = 0;
    // Set targetX to max tilt value (60) if pressing left/right
    if (direction === 'left') targetX = -60;
    if (direction === 'right') targetX = 60;
    // If 'stop', targetX remains 0

    digitalState.current.x = targetX;
    
    // Update visual debug
    setDebugInfo(prev => ({ ...prev, x: targetX }));

    // Send data (send immediately on press/release for responsiveness)
    sendControllerData(roomId, {
        x: targetX,
        y: 0,
        isBoosting,
        timestamp: Date.now()
    });
  };

  const handleBoostStart = () => {
      setIsBoosting(true);
      if (roomId) {
        const currentX = controlMode === 'touch' ? digitalState.current.x : debugInfo.x;
        // Send immediate update to overcome throttling in the service layer
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
      // Send immediate update for release
      if (roomId) {
          sendControllerData(roomId, {
              x: digitalState.current.x,
              y: 0,
              isBoosting: false,
              timestamp: Date.now()
          });
      }
  };

  const recalibrate = () => { baseOffset.current.set = false; };

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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden select-none touch-none">
      
      {/* Mode Switcher */}
      <div className="absolute top-4 left-0 right-0 flex justify-center z-50">
          <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-700 flex">
              <button 
                  onClick={() => setControlMode('motion')}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all ${controlMode === 'motion' ? 'bg-cyan-500 text-black' : 'text-slate-400'}`}
              >
                  MOTION
              </button>
              <button 
                  onClick={() => setControlMode('touch')}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all ${controlMode === 'touch' ? 'bg-cyan-500 text-black' : 'text-slate-400'}`}
              >
                  TOUCH
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
        <div className="flex-1 flex flex-row items-center justify-between p-4 z-10 gap-4">
            
            {/* D-PAD Area */}
            {/* We use grid/flex here to keep buttons large for touch targets */}
            <div className="flex-1 flex gap-2 h-full items-center justify-center max-w-[50%]">
                <button
                    className="flex-1 h-32 bg-slate-800/80 border-2 border-slate-600 rounded-l-2xl active:bg-cyan-500 active:text-black active:border-cyan-400 transition-colors flex items-center justify-center shadow-xl shadow-slate-900/50"
                    onTouchStart={() => handleDigitalSteer('left')}
                    onTouchEnd={() => handleDigitalSteer('stop')}
                    onMouseDown={() => handleDigitalSteer('left')}
                    onMouseUp={() => handleDigitalSteer('stop')}
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button
                    className="flex-1 h-32 bg-slate-800/80 border-2 border-slate-600 rounded-r-2xl active:bg-cyan-500 active:text-black active:border-cyan-400 transition-colors flex items-center justify-center shadow-xl shadow-slate-900/50"
                    onTouchStart={() => handleDigitalSteer('right')}
                    onTouchEnd={() => handleDigitalSteer('stop')}
                    onMouseDown={() => handleDigitalSteer('right')}
                    onMouseUp={() => handleDigitalSteer('stop')}
                >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
            </div>

            {/* Action Buttons Area */}
            <div className="flex-1 flex items-center justify-center h-full max-w-[40%]">
                <button
                    className={`
                        w-full h-32 rounded-2xl font-black text-2xl tracking-tighter transition-all duration-75 border-4 shadow-xl
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
    </div>
  );
};