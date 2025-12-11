export interface ControllerData {
  x: number; // Gamma (Tilt Left/Right)
  y: number; // Beta (Tilt Front/Back)
  isBoosting: boolean; // Button press state
  timestamp: number;
}

export interface RoomData {
  status: 'waiting' | 'connected';
  controller: ControllerData;
}

export enum AppRoute {
  HOME = '/',
  HOST = '/host',
  CONTROLLER = '/controller/:roomId',
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
