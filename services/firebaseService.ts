import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, Database, off, remove } from 'firebase/database';
import { ControllerData, FirebaseConfig } from '../types';

let app: FirebaseApp | undefined;
let db: Database | undefined;

// Default config placeholder - The user has likely replaced this with real values
const DEFAULT_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyDHUDVReOWGhKwTy9KoAiHHHCrGSQKJPfI",
  authDomain: "airconsole-1ce52.firebaseapp.com",
  databaseURL: "https://airconsole-1ce52-default-rtdb.firebaseio.com",
  projectId: "airconsole-1ce52",
  storageBucket: "airconsole-1ce52.firebasestorage.app",
  messagingSenderId: "14111851032",
  appId: "1:14111851032:web:259d11fe31a626e570796d"
};

export const initFirebase = (config: FirebaseConfig = DEFAULT_CONFIG) => {
  // If already initialized, skip
  if (db) return true;

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getDatabase(app);
    return true;
  } catch (error) {
    console.error("Firebase init failed:", error);
    return false;
  }
};

export const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

export const subscribeToRoom = (roomId: string, onData: (data: ControllerData) => void) => {
  // Lazy init: If the view loads before App.tsx useEffect, ensure DB is ready
  if (!db) {
    initFirebase();
    if (!db) {
        console.error("Failed to initialize Firebase in subscribeToRoom");
        return () => {};
    }
  }
  
  console.log(`Subscribing to room: ${roomId}`);
  const roomRef = ref(db, `rooms/${roomId}/controller`);
  
  const unsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      onData(data);
    }
  });

  // Set up disconnect cleanup for the host
  const statusRef = ref(db, `rooms/${roomId}/status`);
  set(statusRef, 'waiting');
  onDisconnect(statusRef).remove();

  return () => {
    unsubscribe();
    off(roomRef);
  };
};

export const subscribeToRoomList = (onData: (rooms: { id: string; status: string }[]) => void) => {
  if (!db) initFirebase();
  if (!db) return () => {};

  const roomsRef = ref(db, 'rooms');
  
  const unsubscribe = onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convert Object { "ID": { ... } } to Array [ { id: "ID", ... } ]
      const roomList = Object.keys(data).map(key => ({
        id: key,
        status: data[key].status || 'unknown'
      }));
      onData(roomList);
    } else {
      onData([]);
    }
  });

  return () => {
    unsubscribe();
    off(roomsRef);
  };
};

export const deleteRoom = async (roomId: string) => {
  if (!db) initFirebase();
  if (!db) return;
  
  try {
    await remove(ref(db, `rooms/${roomId}`));
  } catch (e) {
    console.error("Error deleting room:", e);
  }
};

// Throttle configuration
const THROTTLE_MS = 50; 
let lastUpdate = 0;

export const sendControllerData = (roomId: string, data: ControllerData) => {
  if (!db) {
    initFirebase();
  }
  if (!db) return;

  const now = Date.now();
  if (now - lastUpdate < THROTTLE_MS && !data.isBoosting) {
    // Skip update if too soon (unless boosting, which we want responsive)
    return;
  }

  lastUpdate = now;
  
  // Update data
  set(ref(db, `rooms/${roomId}/controller`), {
    ...data,
    timestamp: now
  });

  // Update status to connected
  set(ref(db, `rooms/${roomId}/status`), 'connected');
};