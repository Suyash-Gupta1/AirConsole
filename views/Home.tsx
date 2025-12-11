import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { initFirebase } from '../services/firebaseService';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [showConfig, setShowConfig] = useState(false);
  const [configStr, setConfigStr] = useState('');

  const handleSaveConfig = () => {
    try {
        const config = JSON.parse(configStr);
        if (initFirebase(config)) {
            setShowConfig(false);
            alert("Firebase connected!");
        } else {
            alert("Initialization failed. Check console.");
        }
    } catch (e) {
        alert("Invalid JSON");
    }
  };

  // Auto-init with mock/env if available, otherwise rely on user
  React.useEffect(() => {
      initFirebase(); // Try default
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-4 right-4">
        <button onClick={() => setShowConfig(true)} className="text-slate-500 hover:text-white p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
      </div>

      <div className="max-w-md w-full text-center space-y-12">
        <div className="space-y-4">
            <h1 className="text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            AIR CONSOLE
            </h1>
            <p className="text-slate-400">Turn your phone into a motion controller.</p>
        </div>

        <div className="grid gap-4">
            <Button onClick={() => navigate('/host')} className="h-16 text-xl">
                HOST A GAME
            </Button>
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-950 text-slate-500">OR</span></div>
            </div>
             <p className="text-xs text-slate-500">To join, scan the QR code on the host screen.</p>
        </div>
      </div>

      {showConfig && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 p-6 rounded-lg max-w-lg w-full border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">Firebase Configuration</h2>
                  <p className="text-sm text-slate-400 mb-4">
                      Paste your firebase config JSON object here to enable real-time features.
                  </p>
                  <textarea 
                    className="w-full h-48 bg-slate-950 text-cyan-400 font-mono text-xs p-4 rounded border border-slate-700 mb-4 focus:outline-none focus:border-cyan-500"
                    placeholder='{"apiKey": "...", "databaseURL": "..."}'
                    value={configStr}
                    onChange={(e) => setConfigStr(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setShowConfig(false)}>Cancel</Button>
                      <Button onClick={handleSaveConfig}>Save & Connect</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
