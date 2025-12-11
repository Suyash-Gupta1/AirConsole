document.getElementById('connectBtn').addEventListener('click', async () => {
  const roomId = document.getElementById('roomId').value;
  const statusDiv = document.getElementById('status');

  if (!roomId) {
    statusDiv.textContent = "Please enter a Room ID";
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // EXECUTE IN ALL FRAMES
  chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: startController,
    args: [roomId]
  });

  statusDiv.textContent = `Injecting...`;
  setTimeout(() => { window.close(); }, 1500);
});

function startController(roomId) {
  // 1. FILTER: Ignore small iframes (ads/tracking pixels) to save resources
  if (window.innerWidth < 200 || window.innerHeight < 200) {
      return; 
  }

  console.log(`🚀 Air Console active on: ${window.location.origin}`);

  // 2. HELPER: Find Game Element (Canvas)
  function findGameElement() {
    let candidate = document.querySelector('canvas');
    if (candidate) return candidate;

    // Check Shadow Roots
    const all = document.querySelectorAll('*');
    for (let el of all) {
      if (el.shadowRoot) {
        candidate = el.shadowRoot.querySelector('canvas');
        if (candidate) return candidate;
      }
    }
    return null;
  }

  const gameEl = findGameElement();
  const isTop = window === window.top;

  // 3. FORCE FOCUS (Aggressive)
  // Always try to focus the window, even if we didn't find a canvas tag yet.
  // This ensures the iframe itself becomes the "Active Element"
  try {
      window.focus();
      document.body.focus();
      if (gameEl) {
          gameEl.focus();
          // Wake up the engine with fake clicks
          ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup'].forEach(evt => {
              gameEl.dispatchEvent(new MouseEvent(evt, { 
                  bubbles: true, cancelable: true, view: window, 
                  clientX: window.innerWidth/2, clientY: window.innerHeight/2 
              }));
          });
      }
  } catch (e) {
      // Ignore focus errors
  }

  // 4. UI BADGE
  const existingBadge = document.getElementById('air-console-badge');
  if (existingBadge) existingBadge.remove();

  const badge = document.createElement('div');
  badge.id = 'air-console-badge';
  badge.style = "position:fixed; top:10px; right:10px; background:#06b6d4; color:black; padding:5px 10px; border-radius:5px; z-index:2147483647; font-family:monospace; font-weight:bold; font-size:14px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); pointer-events:none; user-select:none;";
  
  if (isTop) {
      badge.textContent = `📱 Connecting to ${roomId}...`;
  } else {
      // If we are an iframe, make the badge smaller/transparent so it doesn't block UI
      badge.textContent = `⚡ Game Frame`;
      badge.style.transform = "scale(0.8)";
      badge.style.opacity = "0.7";
      badge.style.top = "50px";
  }
  document.body.appendChild(badge);

  // 5. FIREBASE CONNECTION
  const PROJECT_ID = "airconsole-1ce52"; 
  const DB_URL = `https://${PROJECT_ID}-default-rtdb.firebaseio.com/rooms/${roomId}/controller.json`;

  let isRunning = true;
  
  // Smoothing Vars
  let smoothedX = 0;
  const SMOOTHING_FACTOR = 0.2;
  
  // PWM Vars
  let frameCounter = 0;
  const PWM_CYCLE = 6;
  const DEADZONE = 8;
  const MAX_TILT = 45;

  async function pollLoop() {
    if (!isRunning) return;

    try {
      const res = await fetch(DB_URL);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      
      if (data) {
        const { x, isBoosting } = data;
        
        // Smoothing
        smoothedX = (smoothedX * (1 - SMOOTHING_FACTOR)) + (x * SMOOTHING_FACTOR);
        const absX = Math.abs(smoothedX);
        
        // PWM Calculation
        let intensity = 0;
        if (absX > DEADZONE) {
          intensity = (absX - DEADZONE) / (MAX_TILT - DEADZONE);
          if (intensity > 1) intensity = 1;
          if (intensity < 0) intensity = 0;
        }

        let shouldPressKey = false;
        frameCounter++;
        if (frameCounter >= PWM_CYCLE) frameCounter = 0;
        
        const activeFrames = Math.round(intensity * PWM_CYCLE);
        if (frameCounter < activeFrames) shouldPressKey = true;
        if (intensity > 0.05 && activeFrames === 0 && frameCounter === 0) shouldPressKey = true;

        // Visuals (Only update top badge to save performance)
        if (isTop) {
            const turnStrength = Math.round(intensity * 100);
            badge.textContent = `Tilt: ${Math.round(smoothedX)}° | Power: ${turnStrength}%`;
            badge.style.background = shouldPressKey ? "#22c55e" : "#06b6d4"; 
        }

        // Apply Inputs
        if (shouldPressKey) {
            if (smoothedX < 0) {
                press('a', true);   press('ArrowLeft', true);
                press('d', false);  press('ArrowRight', false);
            } else {
                press('d', true);   press('ArrowRight', true);
                press('a', false);  press('ArrowLeft', false);
            }
        } else {
            press('a', false);  press('ArrowLeft', false);
            press('d', false);  press('ArrowRight', false);
        }

        press('w', isBoosting);
        press('ArrowUp', isBoosting);
        press(' ', isBoosting);
      }
    } catch (e) {
      // console.warn(e);
    }
    setTimeout(pollLoop, 16); 
  }

  pollLoop();

  // 6. KEY DISPATCHER (Aggressive Mode)
  const keyMap = { 
      'a': 65, 'd': 68, 'w': 87, ' ': 32,
      'ArrowLeft': 37, 'ArrowRight': 39, 'ArrowUp': 38
  };

  function press(key, state) {
     const keyCode = keyMap[key];
     const code = key === ' ' ? 'Space' : (key.startsWith('Arrow') ? key : `Key${key.toUpperCase()}`);
     const eventType = state ? 'keydown' : 'keyup';

     const evt = new KeyboardEvent(eventType, {
         key: key, code: code, keyCode: keyCode, which: keyCode,
         bubbles: true, cancelable: true, view: window, composed: true
     });

     // Dispatch to EVERYTHING to ensure we hit the game
     if (gameEl) gameEl.dispatchEvent(evt);
     document.activeElement.dispatchEvent(evt);
     document.dispatchEvent(evt);
     window.dispatchEvent(evt);
  }
}