import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { initFirebase } from '../services/firebaseService';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  // Initialize Firebase on mount using the hardcoded config in firebaseService.ts
  useEffect(() => {
      initFirebase(); 
  }, []);

  const handleJoin = () => {
    if (roomId.length < 4) return;
    navigate(`/controller/${roomId.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative">
      <div className="max-w-md w-full text-center space-y-12">
        <div className="space-y-4">
            <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            AIR CONSOLE
            </h1>
            <p className="text-slate-400">Turn your phone into a motion controller.</p>
        </div>

        <div className="grid gap-6">
            <Button onClick={() => navigate('/host')} className="h-16 text-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                HOST A GAME
            </Button>
            
            <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-950 text-slate-500">OR</span></div>
            </div>

            {/* Join Game Section */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4 shadow-lg">
               <label className="text-xs text-slate-500 font-mono tracking-widest block text-left uppercase">Join Existing Game</label>
               <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    maxLength={4}
                    placeholder="ENTER ROOM ID" 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-4 text-center font-mono text-2xl tracking-[0.3em] uppercase focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all text-white placeholder-slate-800"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  />
                  <Button onClick={handleJoin} variant="secondary" fullWidth disabled={roomId.length < 4}>
                      CONNECT
                  </Button>
               </div>
            </div>
             
             <p className="text-xs text-slate-600">
                You can also use your system camera app to scan the QR code on the Host screen.
             </p>
        </div>
      </div>
    </div>
  );
};
