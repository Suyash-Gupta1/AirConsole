# Air Console - Setup Guide

A real-time dual-screen web game where your smartphone acts as the motion controller for a desktop game.

## 🚀 How to Run Locally

Since this project uses modern ES Modules and imports directly from a CDN, you do not need a complex build step (Webpack/Vite is optional). You simply need to serve the files.

### 1. Start a Local Server
Run one of the following commands in the project root:

**Using Node.js (Recommended):**
```bash
npx serve .
```

**Using Python:**
```bash
python3 -m http.server 8000
```

### 2. The "HTTPS" Requirement (Crucial for Phones)
Smartphones (especially iPhones) **will not** allow access to the Gyroscope/Accelerometer on `http://` websites. You must use **HTTPS**.

To test this on your phone while developing locally, use **ngrok** to create a secure tunnel:

1. Install ngrok: `brew install ngrok` (or download from ngrok.com).
2. Run: `ngrok http 3000` (replace 3000 with your local server port).
3. Open the **https** URL provided by ngrok on your Laptop (Host).
4. Scan the QR code with your Phone.

---

## 🔥 Firebase Setup (Step-by-Step)

This app requires Firebase Realtime Database to sync the phone movement to the screen.

### Step 1: Create Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name it `air-console` (or anything you want).
4. Disable Google Analytics (not needed for this).
5. Click **"Create Project"**.

### Step 2: Create Database
1. In the left sidebar, go to **Build** -> **Realtime Database**.
2. Click **"Create Database"**.
3. Choose a location (e.g., United States).
4. **Security Rules:** Start in **Test Mode** (allows read/write).
   * Or select **Locked Mode** and see Step 3 below.

### Step 3: Configure Rules
Go to the **Rules** tab in Realtime Database and paste this to allow anyone to join a game (for development):

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true,
      // Optional: Cleanup old data automatically
      "$roomId": {
        ".validate": "newData.hasChildren(['timestamp']) || !newData.exists()"
      }
    }
  }
}
```

### Step 4: Get API Keys
1. Click the **Gear Icon** (Project Settings) next to "Project Overview" in the top left.
2. Scroll down to **"Your apps"**.
3. Click the **Web (`</>`)** icon.
4. Register app (name it "Web").
5. **Copy the `firebaseConfig` object.** It looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "project-id.firebaseapp.com",
  databaseURL: "https://project-id-default-rtdb.firebaseio.com",
  projectId: "project-id",
  storageBucket: "project-id.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
```

### Step 5: Connect App
1. Open your app in the browser.
2. On the Home screen, click the **Gear Icon** (Settings) in the top right.
3. Paste the JSON object you copied above.
4. Click **"Save & Connect"**.

If successful, you can now click "HOST A GAME" and scan the QR code!


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const DEFAULT_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyDHUDVReOWGhKwTy9KoAiHHHCrGSQKJPfI",
  authDomain: "airconsole-1ce52.firebaseapp.com",
  databaseURL: "https://airconsole-1ce52-default-rtdb.firebaseio.com",
  projectId: "airconsole-1ce52",
  storageBucket: "airconsole-1ce52.firebasestorage.app",
  messagingSenderId: "14111851032",
  appId: "1:14111851032:web:259d11fe31a626e570796d"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);