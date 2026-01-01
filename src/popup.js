// Video Speed Controller - Popup Script

let settings = null;
let state = null;

const DEFAULT_STATE = {
  currentSpeed: 1,
  lastSpeed: 1.5
};

// Initialize
async function init() {
  await loadState();
  updateDisplay();
  setupEventListeners();
}

// Load state from storage
async function loadState() {
  const data = await chrome.storage.sync.get(['settings', 'state']);
  settings = data.settings || {};
  state = data.state || DEFAULT_STATE;
}

// Update the display
function updateDisplay() {
  const speedValue = document.getElementById('speed-value');
  speedValue.textContent = formatSpeed(state.currentSpeed);

  // Highlight active preset
  document.querySelectorAll('.preset-btn').forEach(btn => {
    const speed = parseFloat(btn.dataset.speed);
    btn.classList.toggle('active', speed === state.currentSpeed);
  });
}

// Format speed for display
function formatSpeed(speed) {
  if (speed === Math.floor(speed)) {
    return speed + 'x';
  }
  return speed.toFixed(1) + 'x';
}

// Set speed
async function setSpeed(speed) {
  // Clamp between 0.25 and 4
  speed = Math.max(0.25, Math.min(4, speed));
  // Round to avoid floating point issues
  speed = Math.round(speed * 100) / 100;

  // Update state
  if (state.currentSpeed !== 1 && speed === 1) {
    state.lastSpeed = state.currentSpeed;
  } else if (speed !== 1) {
    state.lastSpeed = speed;
  }
  state.currentSpeed = speed;

  // Save to storage
  await chrome.storage.sync.set({ state });

  // Send to content script in active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'setSpeed', speed });
    }
  } catch (e) {
    // Tab might not have content script
  }

  updateDisplay();
}

// Toggle speed
function toggleSpeed() {
  if (state.currentSpeed === 1) {
    setSpeed(state.lastSpeed || 1.5);
  } else {
    setSpeed(1);
  }
}

// Setup event listeners
function setupEventListeners() {
  const increment = settings.increment || 0.1;

  // Decrease button
  document.getElementById('decrease').addEventListener('click', () => {
    setSpeed(state.currentSpeed - increment);
  });

  // Increase button
  document.getElementById('increase').addEventListener('click', () => {
    setSpeed(state.currentSpeed + increment);
  });

  // Toggle button
  document.getElementById('toggle').addEventListener('click', toggleSpeed);

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setSpeed(parseFloat(btn.dataset.speed));
    });
  });

  // Options link
  document.getElementById('options-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.state) {
    state = changes.state.newValue;
    updateDisplay();
  }
});

// Start
init();
