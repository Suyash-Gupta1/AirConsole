import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { initFirebase, subscribeToRoomList, deleteRoom } from '../services/firebaseService';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [activeRooms, setActiveRooms] = useState<{ id: string; status: string }[]>([]);

  // Initialize Firebase on mount using the hardcoded config in firebaseService.ts
  useEffect(() => {
      initFirebase(); 
      
      // Subscribe to the list of available rooms
      const unsubscribe = subscribeToRoomList((rooms) => {
        setActiveRooms(rooms);
      });

      return () => unsubscribe();
  }, []);

  const handleJoin = () => {
    if (roomId.length < 4) return;
    navigate(`/controller/${roomId.toUpperCase()}`);
  };

  const handleJoinSpecific = (id: string) => {
      navigate(`/controller/${id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm(`Delete room ${id}?`)) {
        deleteRoom(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative">
      <div className="max-w-md w-full text-center space-y-12 z-10">
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
             
             {/* Active Rooms Manager */}
             {activeRooms.length > 0 && (
                 <div className="mt-8">
                    <p className="text-xs text-slate-600 mb-2 uppercase tracking-widest">Active Sessions ({activeRooms.length})</p>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        {activeRooms.map(room => (
                            <div 
                                key={room.id} 
                                onClick={() => handleJoinSpecific(room.id)}
                                className="flex items-center justify-between p-3 border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-cyan-400 font-bold">{room.id}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${room.status === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                        {room.status}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(e, room.id)}
                                    className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                                    title="Delete Room"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18"></path>
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};