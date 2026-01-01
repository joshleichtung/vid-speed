// Video Speed Controller - Options Script

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

let settings = null;
let recordingAction = null;

// Initialize
async function init() {
  await loadSettings();
  updateUI();
  setupEventListeners();
}

// Load settings from storage
async function loadSettings() {
  const data = await chrome.storage.sync.get('settings');
  settings = { ...DEFAULT_SETTINGS, ...data.settings };
  // Merge hotkeys separately to preserve defaults
  settings.hotkeys = { ...DEFAULT_SETTINGS.hotkeys, ...settings.hotkeys };
}

// Update UI with current settings
function updateUI() {
  // Hotkeys
  updateHotkeyDisplay('decrease', settings.hotkeys.decrease);
  updateHotkeyDisplay('increase', settings.hotkeys.increase);
  updateHotkeyDisplay('toggle', settings.hotkeys.toggle);

  // Speed settings
  document.getElementById('increment').value = settings.increment.toString();

  // Overlay settings
  document.getElementById('showOverlay').checked = settings.showOverlay;
  document.getElementById('overlayPosition').value = settings.overlayPosition;
  document.getElementById('overlayTimeout').value = settings.overlayTimeout.toString();
}

// Update hotkey display
function updateHotkeyDisplay(action, combo) {
  const btn = document.getElementById(`hotkey-${action}`);
  const valueSpan = btn.querySelector('.hotkey-value');
  valueSpan.textContent = formatKeyCombo(combo) || 'Not set';
}

// Format key combo for display
function formatKeyCombo(combo) {
  if (!combo) return '';

  return combo
    .replace('Ctrl+', '⌃')
    .replace('Alt+', '⌥')
    .replace('Shift+', '⇧')
    .replace('Meta+', '⌘')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→')
    .replace('Key', '')
    .replace('Digit', '');
}

// Setup event listeners
function setupEventListeners() {
  // Hotkey recording
  document.querySelectorAll('.hotkey-input').forEach(btn => {
    btn.addEventListener('click', () => startRecording(btn.dataset.action));
  });

  // Hotkey clear buttons
  document.querySelectorAll('.hotkey-clear').forEach(btn => {
    btn.addEventListener('click', () => clearHotkey(btn.dataset.action));
  });

  // Global keydown for recording
  document.addEventListener('keydown', handleKeydown);

  // Click outside to cancel recording
  document.addEventListener('click', (e) => {
    if (recordingAction && !e.target.closest('.hotkey-input')) {
      cancelRecording();
    }
  });

  // Speed settings
  document.getElementById('increment').addEventListener('change', (e) => {
    settings.increment = parseFloat(e.target.value);
    saveSettings();
  });

  // Overlay settings
  document.getElementById('showOverlay').addEventListener('change', (e) => {
    settings.showOverlay = e.target.checked;
    saveSettings();
  });

  document.getElementById('overlayPosition').addEventListener('change', (e) => {
    settings.overlayPosition = e.target.value;
    saveSettings();
  });

  document.getElementById('overlayTimeout').addEventListener('change', (e) => {
    settings.overlayTimeout = parseInt(e.target.value, 10);
    saveSettings();
  });
}

// Start recording a hotkey
function startRecording(action) {
  // Cancel any existing recording
  cancelRecording();

  recordingAction = action;
  const btn = document.getElementById(`hotkey-${action}`);
  btn.classList.add('recording');
  btn.querySelector('.hotkey-value').textContent = 'Press keys...';
}

// Cancel recording
function cancelRecording() {
  if (recordingAction) {
    const btn = document.getElementById(`hotkey-${recordingAction}`);
    btn.classList.remove('recording');
    updateHotkeyDisplay(recordingAction, settings.hotkeys[recordingAction]);
    recordingAction = null;
  }
}

// Clear a hotkey
function clearHotkey(action) {
  settings.hotkeys[action] = '';
  updateHotkeyDisplay(action, '');
  saveSettings();
}

// Handle keydown for recording
function handleKeydown(event) {
  if (!recordingAction) return;

  // Ignore modifier-only presses
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  // Build key combo
  const combo = getKeyCombo(event);

  // Validate - must have at least Ctrl or Alt
  if (!event.ctrlKey && !event.altKey && !event.metaKey) {
    showStatus('Hotkey must include Ctrl, Alt, or Cmd', 'error');
    return;
  }

  // Check for conflicts with other hotkeys
  for (const [action, existingCombo] of Object.entries(settings.hotkeys)) {
    if (action !== recordingAction && existingCombo === combo) {
      showStatus(`This shortcut is already used for "${action}"`, 'error');
      return;
    }
  }

  // Save the hotkey
  settings.hotkeys[recordingAction] = combo;
  updateHotkeyDisplay(recordingAction, combo);

  const btn = document.getElementById(`hotkey-${recordingAction}`);
  btn.classList.remove('recording');

  recordingAction = null;
  saveSettings();
  showStatus('Hotkey saved');
}

// Convert keyboard event to key combo string
function getKeyCombo(event) {
  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  parts.push(event.code);
  return parts.join('+');
}

// Save settings to storage
async function saveSettings() {
  await chrome.storage.sync.set({ settings });
  showStatus('Settings saved');

  // Notify all tabs of settings change
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            settings
          });
        } catch (e) {
          // Tab might not have content script
        }
      }
    }
  } catch (e) {
    console.error('Error notifying tabs:', e);
  }
}

// Show status message
function showStatus(message, type = 'success') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.classList.add('visible');

  setTimeout(() => {
    status.classList.remove('visible');
  }, 2000);
}

// Start
init();
