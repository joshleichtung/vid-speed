// Video Speed Controller - Service Worker
// Handles state management and cross-tab communication

const DEFAULT_SETTINGS = {
  increment: 0.1,
  overlayPosition: 'bottom-right',
  overlayTimeout: 2000,
  showOverlay: true,
  presets: [0.5, 1, 1.5, 2, 2.5, 3],
  blacklist: [],
  hotkeys: {
    decrease: 'Ctrl+Shift+KeyA',
    increase: 'Ctrl+Shift+KeyS',
    toggle: 'Ctrl+Shift+KeyD'
  }
};

const DEFAULT_STATE = {
  currentSpeed: 1,
  lastSpeed: 1.5
};

// Initialize storage with defaults on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.sync.get(['settings', 'state']);

  if (!data.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }

  if (!data.state) {
    await chrome.storage.sync.set({ state: DEFAULT_STATE });
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getState') {
    chrome.storage.sync.get(['settings', 'state']).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === 'setState') {
    chrome.storage.sync.set({ state: message.state }).then(() => {
      // Broadcast to all tabs
      broadcastToAllTabs({ action: 'stateUpdated', state: message.state });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'setSpeed') {
    updateSpeed(message.speed, sender.tab?.id).then(sendResponse);
    return true;
  }
});

// Update speed and broadcast to all tabs
async function updateSpeed(speed, excludeTabId = null) {
  const data = await chrome.storage.sync.get('state');
  const state = data.state || DEFAULT_STATE;

  // Track last non-1x speed for toggle
  if (state.currentSpeed !== 1 && speed === 1) {
    state.lastSpeed = state.currentSpeed;
  } else if (speed !== 1) {
    state.lastSpeed = speed;
  }

  state.currentSpeed = speed;

  await chrome.storage.sync.set({ state });

  // Broadcast to all tabs
  broadcastToAllTabs({ action: 'speedChanged', speed, state }, excludeTabId);

  return { success: true, state };
}

// Broadcast message to all tabs
async function broadcastToAllTabs(message, excludeTabId = null) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id !== excludeTabId && tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, message);
        } catch (e) {
          // Tab might not have content script loaded
        }
      }
    }
  } catch (e) {
    console.error('Error broadcasting to tabs:', e);
  }
}

// Listen for storage changes to sync across tabs
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.state) {
    broadcastToAllTabs({
      action: 'stateUpdated',
      state: changes.state.newValue
    });
  }
});
