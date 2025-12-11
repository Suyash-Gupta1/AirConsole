import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { sendControllerData } from '../services/firebaseService';
import { Button } from '../components/Button';

export const ControllerView: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string>('');
  const [isBoosting, setIsBoosting] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ x: 0, y: 0, updates: 0 });

  // iOS 13+ requires a user interaction to request permission
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
      // Non-iOS 13+ devices don't typically need explicit permission call
      setPermissionGranted(true);
    }
  };

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (!roomId) return;
    
    // Beta is front/back (-180 to 180), Gamma is left/right (-90 to 90)
    // Clamping values for better game feel
    const x = Math.min(Math.max(event.gamma || 0, -60), 60); 
    const y = Math.min(Math.max(event.beta || 0, -60), 60);

    // Update debug info occasionally (every ~10 frames) to avoid too many re-renders
    setDebugInfo(prev => ({
        x: Math.round(x),
        y: Math.round(y),
        updates: prev.updates + 1
    }));

    sendControllerData(roomId, {
      x: Math.round(x),
      y: Math.round(y),
      isBoosting,
      timestamp: Date.now()
    });
  }, [roomId, isBoosting]);

  useEffect(() => {
    if (permissionGranted) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permissionGranted, handleOrientation]);

  // Update boost state immediately
  const handleBoostStart = () => {
    setIsBoosting(true);
    // Send immediate update to avoid throttle lag for button presses
    if(roomId) {
        sendControllerData(roomId, {
            x: debugInfo.x,
            y: debugInfo.y,
            isBoosting: true,
            timestamp: Date.now()
        });
    }
  };

  const handleBoostEnd = () => setIsBoosting(false);

  // Check for HTTP
  const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';

  if (!roomId) return <div className="p-8 text-white">Invalid Room ID</div>;

  if (isHttp) {
    return (
        <div className="min-h-screen bg-red-900/20 flex flex-col items-center justify-center p-8 text-center text-white">
            <h1 className="text-2xl font-bold text-red-500 mb-4">CONNECTION ERROR</h1>
            <p>Motion sensors are blocked on insecure connections.</p>
            <p className="mt-4 text-sm bg-black/50 p-2 rounded">
                Please use <b>HTTPS</b> (e.g., via ngrok) to access this page on your phone.
            </p>
        </div>
    );
  }

  if (!permissionGranted) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
        <h1 className="text-3xl font-bold mb-4 text-cyan-400">Ready to Connect?</h1>
        <p className="mb-8 text-slate-300">Air Console needs access to your phone's gyroscope to control the game.</p>
        
        {error && <div className="bg-red-500/20 text-red-200 p-4 rounded mb-6 border border-red-500">{error}</div>}

        <Button onClick={requestAccess} className="w-full py-6 text-xl shadow-lg shadow-cyan-500/30">
          TAP TO START
        </Button>
        <p className="mt-8 text-xs text-slate-500">Room: {roomId}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden select-none touch-none">
      
      {/* Debug Overlay */}
      <div className="absolute top-2 left-2 z-50 text-[10px] font-mono text-slate-500 bg-black/50 p-1 rounded pointer-events-none">
        X: {debugInfo.x}° <br/>
        Y: {debugInfo.y}° <br/>
        UP: {debugInfo.updates} <br/>
        BOOST: {isBoosting ? 'ON' : 'OFF'}
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-64 h-64 border-[20px] border-cyan-500 rounded-full"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 space-y-8">
        <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-white italic tracking-tighter">CONNECTED</h2>
            <p className="text-cyan-400 font-mono tracking-widest text-sm animate-pulse">TRANSMITTING DATA</p>
        </div>

        <div className="w-64 h-64 border border-slate-700 rounded-full relative flex items-center justify-center bg-slate-900/50 backdrop-blur">
            <div className="text-slate-500 text-xs font-mono absolute top-4">TILT PHONE</div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_10px_#06b6d4]"></div>
            
            {/* Visual Tilt Indicator */}
            <div 
                className="absolute w-full h-1 bg-cyan-500/30 transition-transform duration-100"
                style={{ transform: `rotate(${debugInfo.x}deg)` }}
            ></div>
            <div 
                className="absolute h-full w-1 bg-cyan-500/30 transition-transform duration-100"
                style={{ transform: `rotate(${debugInfo.y}deg)` }}
            ></div>
        </div>

        <div className="w-full max-w-xs">
          <button
            className={`
                w-full aspect-square rounded-2xl font-bold text-2xl tracking-widest transition-all duration-100
                border-2 flex flex-col items-center justify-center gap-2
                ${isBoosting 
                    ? 'bg-cyan-500 border-cyan-300 text-black scale-95 shadow-inner' 
                    : 'bg-slate-800 border-slate-600 text-cyan-400 shadow-lg shadow-cyan-900/20 active:scale-95'
                }
            `}
            onTouchStart={handleBoostStart}
            onTouchEnd={handleBoostEnd}
            onMouseDown={handleBoostStart}
            onMouseUp={handleBoostEnd}
          >
            <span>BOOST</span>
            <span className="text-xs font-mono opacity-60">HOLD TO ACTIVATE</span>
          </button>
        </div>
      </div>
      
      <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500 font-mono">ROOM: {roomId}</p>
      </div>
    </div>
  );
};