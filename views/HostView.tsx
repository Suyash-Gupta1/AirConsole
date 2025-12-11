import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import { generateRoomId, subscribeToRoom } from '../services/firebaseService';
import { ControllerData } from '../types';
import { TelemetryChart } from '../components/TelemetryChart';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';

export const HostView: React.FC = () => {
  const [roomId] = useState(generateRoomId());
  const [data, setData] = useState<ControllerData>({ x: 0, y: 0, isBoosting: false, timestamp: 0 });
  const [history, setHistory] = useState<ControllerData[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const navigate = useNavigate();
  const demoInterval = useRef<number | null>(null);

  useEffect(() => {
    // Subscribe to Firebase real-time updates
    const unsubscribe = subscribeToRoom(roomId, (newData) => {
      setData(newData);
      setHistory(prev => [...prev.slice(-49), newData]); // Keep last 50 points
    });

    return () => unsubscribe();
  }, [roomId]);

  // Demo Mode Logic (Simulates sensor data if user has no keys)
  useEffect(() => {
    if (isDemoMode) {
      let tick = 0;
      demoInterval.current = window.setInterval(() => {
        tick += 0.05;
        const mockData = {
          x: Math.sin(tick) * 30,
          y: Math.cos(tick * 0.5) * 15,
          isBoosting: Math.sin(tick * 3) > 0.8,
          timestamp: Date.now()
        };
        setData(mockData);
        setHistory(prev => [...prev.slice(-49), mockData]);
      }, 50);
    } else {
      if (demoInterval.current) clearInterval(demoInterval.current);
    }
    return () => {
      if (demoInterval.current) clearInterval(demoInterval.current);
    };
  }, [isDemoMode]);

  // Visual transformation based on sensor data
  const shipStyle = {
    transform: `
      perspective(1000px) 
      rotateZ(${data.x}deg) 
      rotateX(${-data.y}deg) 
      scale(${data.isBoosting ? 1.1 : 1})
    `,
  };

  const controllerUrl = `${window.location.origin}/#/controller/${roomId}`;
  const isConnected = data.timestamp > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,27,0.8)_2px,transparent_2px),linear-gradient(90deg,rgba(18,18,27,0.8)_2px,transparent_2px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>

      <div className="absolute top-6 left-6 flex gap-4 z-10">
         <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-2">
        <label className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-700 cursor-pointer">
          <input 
            type="checkbox" 
            checked={isDemoMode} 
            onChange={(e) => setIsDemoMode(e.target.checked)} 
            className="form-checkbox text-cyan-500 rounded focus:ring-0"
          />
          DEMO MODE
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl z-10">
        
        {/* Left Panel: QR Code */}
        <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-slate-700 flex flex-col items-center justify-center shadow-2xl">
          <h2 className="text-2xl font-bold mb-2 tracking-tighter text-cyan-400">JOIN GAME</h2>
          <p className="text-slate-400 mb-6 text-sm text-center">Scan with your phone to connect</p>
          
          <div className="p-4 bg-white rounded-lg relative">
            <QRCode value={controllerUrl} size={180} />
            {isConnected && !isDemoMode && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                    <span className="text-green-600 font-bold text-xl rotate-[-12deg] border-4 border-green-600 px-2 rounded-lg">CONNECTED</span>
                </div>
            )}
          </div>
          
          <div className="mt-6 flex flex-col items-center">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-mono mb-1">Room ID</p>
            <p className="text-4xl font-mono font-bold text-white tracking-widest">{roomId}</p>
          </div>
        </div>

        {/* Center Panel: The "Game" */}
        <div className="lg:col-span-2 relative h-[500px] flex items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 shadow-inner overflow-hidden">
          
          {/* Horizon Line */}
          <div className="absolute w-full h-[1px] bg-cyan-500/30 top-1/2 left-0 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>

          {/* Connection Status Overlay */}
          {!isConnected && !isDemoMode && (
              <div className="absolute top-4 left-0 w-full text-center z-20">
                  <div className="inline-block px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-500/50 text-xs font-mono animate-pulse">
                      WAITING FOR CONTROLLER...
                  </div>
              </div>
          )}

          {/* The Ship / Object */}
          <div 
            className="transition-transform duration-75 ease-out will-change-transform"
            style={shipStyle}
          >
            <div className={`
              w-48 h-12 rounded-lg relative flex items-center justify-center
              ${data.isBoosting 
                ? 'bg-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.8)]' 
                : 'bg-slate-700 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
              }
            `}>
              <div className="absolute -top-6 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[24px] border-b-cyan-500/50"></div>
              <span className={`font-bold tracking-widest ${data.isBoosting ? 'text-black' : 'text-white'}`}>
                {data.isBoosting ? 'BOOSTING' : 'AIR CONSOLE'}
              </span>
              
              {/* Thrusters */}
              <div className="absolute -bottom-2 w-full flex justify-between px-4">
                 <div className={`w-2 h-8 rounded-full blur-md ${data.isBoosting ? 'bg-orange-400 h-16' : 'bg-cyan-400'}`}></div>
                 <div className={`w-2 h-8 rounded-full blur-md ${data.isBoosting ? 'bg-orange-400 h-16' : 'bg-cyan-400'}`}></div>
              </div>
            </div>
          </div>

          {/* HUD Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex gap-4">
             <TelemetryChart data={history} />
             <div className="flex flex-col justify-end">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-700">
                   <div className="text-[10px] text-slate-500 font-mono">X-AXIS</div>
                   <div className="font-mono text-cyan-400 text-lg text-right">{data.x.toFixed(1)}°</div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-700 mt-2">
                   <div className="text-[10px] text-slate-500 font-mono">Y-AXIS</div>
                   <div className="font-mono text-pink-400 text-lg text-right">{data.y.toFixed(1)}°</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};