import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, Database, off } from 'firebase/database';
import { ControllerData, FirebaseConfig } from '../types';

let app: FirebaseApp | undefined;
let db: Database | undefined;

// Default config placeholder
const DEFAULT_CONFIG: FirebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  databaseURL: "https://your-db.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-bucket",
  messagingSenderId: "123456",
  appId: "1:12345:web:abc"
};

export const initFirebase = (config: FirebaseConfig = DEFAULT_CONFIG) => {
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
  if (!db) return () => {};
  
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

// Throttle configuration
const THROTTLE_MS = 50; 
let lastUpdate = 0;

export const sendControllerData = (roomId: string, data: ControllerData) => {
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
