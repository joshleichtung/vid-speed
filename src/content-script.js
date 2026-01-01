// Video Speed Controller - Content Script
// Handles video detection, hotkeys, speed control, and overlay

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__vidSpeedControllerLoaded) return;
  window.__vidSpeedControllerLoaded = true;

  // State
  let settings = null;
  let state = null;
  let videos = [];
  let overlay = null;
  let overlayTimeout = null;

  // Default settings (fallback)
  const DEFAULT_SETTINGS = {
    increment: 0.1,
    overlayPosition: 'bottom-right',
    overlayTimeout: 2000,
    showOverlay: true,
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

  // Initialize
  async function init() {
    await loadSettings();
    findVideos();
    setupMutationObserver();
    setupKeyboardListener();
    setupMessageListener();

    // Apply stored speed to any existing videos
    if (state.currentSpeed !== 1) {
      applySpeedToAllVideos(state.currentSpeed);
    }
  }

  // Load settings from storage
  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get(['settings', 'state']);
      settings = data.settings || DEFAULT_SETTINGS;
      state = data.state || DEFAULT_STATE;
    } catch (e) {
      settings = DEFAULT_SETTINGS;
      state = DEFAULT_STATE;
    }
  }

  // Find all video elements on the page
  function findVideos() {
    const newVideos = document.querySelectorAll('video');
    newVideos.forEach(video => {
      if (!videos.includes(video)) {
        videos.push(video);
        setupVideoListeners(video);

        // Apply current speed to new video
        if (state.currentSpeed !== 1) {
          setVideoSpeed(video, state.currentSpeed);
        }
      }
    });

    // Clean up removed videos
    videos = videos.filter(video => document.contains(video));
  }

  // Setup listeners on a video element
  function setupVideoListeners(video) {
    // Create overlay when video starts playing
    video.addEventListener('play', () => {
      if (settings.showOverlay && !overlay) {
        createOverlay();
      }
    });

    // Re-apply speed if video resets it
    video.addEventListener('ratechange', (e) => {
      if (e.target.playbackRate !== state.currentSpeed && !e.target.__settingSpeed) {
        e.target.__settingSpeed = true;
        e.target.playbackRate = state.currentSpeed;
        e.target.__settingSpeed = false;
      }
    });
  }

  // Watch for dynamically added videos
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeName === 'VIDEO' ||
                (node.nodeType === 1 && node.querySelector && node.querySelector('video'))) {
              shouldCheck = true;
              break;
            }
          }
        }
        if (shouldCheck) break;
      }
      if (shouldCheck) {
        findVideos();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Setup keyboard listener for hotkeys
  function setupKeyboardListener() {
    document.addEventListener('keydown', handleKeydown, true);
  }

  // Handle keydown events
  function handleKeydown(event) {
    // Don't trigger in input fields
    if (event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable) {
      return;
    }

    const keyCombo = getKeyCombo(event);
    const hotkeys = settings.hotkeys || DEFAULT_SETTINGS.hotkeys;

    if (keyCombo === hotkeys.toggle) {
      event.preventDefault();
      event.stopPropagation();
      toggleSpeed();
    } else if (keyCombo === hotkeys.increase) {
      event.preventDefault();
      event.stopPropagation();
      incrementSpeed(settings.increment || 0.1);
    } else if (keyCombo === hotkeys.decrease) {
      event.preventDefault();
      event.stopPropagation();
      incrementSpeed(-(settings.increment || 0.1));
    }
  }

  // Convert keyboard event to key combo string
  function getKeyCombo(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.metaKey) parts.push('Meta');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    parts.push(event.code);
    return parts.join('+');
  }

  // Setup message listener for service worker communication
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'speedChanged' || message.action === 'stateUpdated') {
        state = message.state;
        applySpeedToAllVideos(state.currentSpeed);
        showOverlayFeedback();
      }
      if (message.action === 'setSpeed') {
        setSpeed(message.speed);
      }
      if (message.action === 'settingsUpdated') {
        settings = message.settings;
      }
    });
  }

  // Toggle between 1x and last speed
  function toggleSpeed() {
    if (state.currentSpeed === 1) {
      setSpeed(state.lastSpeed || 1.5);
    } else {
      setSpeed(1);
    }
  }

  // Increment speed by delta
  function incrementSpeed(delta) {
    let newSpeed = state.currentSpeed + delta;
    // Clamp between 0.25 and 4
    newSpeed = Math.max(0.25, Math.min(4, newSpeed));
    // Round to avoid floating point issues
    newSpeed = Math.round(newSpeed * 100) / 100;
    setSpeed(newSpeed);
  }

  // Set speed and sync to storage
  async function setSpeed(speed) {
    // Update local state
    if (state.currentSpeed !== 1 && speed === 1) {
      state.lastSpeed = state.currentSpeed;
    } else if (speed !== 1) {
      state.lastSpeed = speed;
    }
    state.currentSpeed = speed;

    // Apply to all videos
    applySpeedToAllVideos(speed);

    // Show overlay feedback
    showOverlayFeedback();

    // Sync to storage and other tabs
    try {
      await chrome.runtime.sendMessage({ action: 'setSpeed', speed });
    } catch (e) {
      // Extension might be reloading
    }
  }

  // Apply speed to a single video
  function setVideoSpeed(video, speed) {
    try {
      video.__settingSpeed = true;
      video.playbackRate = speed;
      video.__settingSpeed = false;
    } catch (e) {
      // Some videos may not support speed changes
    }
  }

  // Apply speed to all videos on page
  function applySpeedToAllVideos(speed) {
    findVideos(); // Refresh video list
    videos.forEach(video => setVideoSpeed(video, speed));
  }

  // Create the overlay UI
  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'vid-speed-overlay';
    overlay.innerHTML = `
      <div class="vid-speed-controls">
        <button class="vid-speed-btn" data-action="decrease" title="Decrease speed (${settings.hotkeys?.decrease || 'Ctrl+Shift+A'})">−</button>
        <button class="vid-speed-value" data-action="toggle" title="Toggle 1x ↔ last speed (${settings.hotkeys?.toggle || 'Ctrl+Shift+D'})">${formatSpeed(state.currentSpeed)}</button>
        <button class="vid-speed-btn" data-action="increase" title="Increase speed (${settings.hotkeys?.increase || 'Ctrl+Shift+S'})">+</button>
      </div>
    `;

    // Position based on settings
    const position = settings.overlayPosition || 'bottom-right';
    overlay.setAttribute('data-position', position);

    // Add click handlers
    overlay.querySelector('[data-action="decrease"]').addEventListener('click', (e) => {
      e.stopPropagation();
      incrementSpeed(-(settings.increment || 0.1));
    });

    overlay.querySelector('[data-action="toggle"]').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSpeed();
    });

    overlay.querySelector('[data-action="increase"]').addEventListener('click', (e) => {
      e.stopPropagation();
      incrementSpeed(settings.increment || 0.1);
    });

    // Show on hover
    overlay.addEventListener('mouseenter', () => {
      clearTimeout(overlayTimeout);
      overlay.classList.add('vid-speed-visible');
    });

    overlay.addEventListener('mouseleave', () => {
      scheduleOverlayHide();
    });

    document.body.appendChild(overlay);
  }

  // Format speed for display
  function formatSpeed(speed) {
    if (speed === Math.floor(speed)) {
      return speed + 'x';
    }
    return speed.toFixed(1) + 'x';
  }

  // Show overlay feedback
  function showOverlayFeedback() {
    if (!settings.showOverlay) return;

    if (!overlay) {
      createOverlay();
    }

    // Update speed display
    const speedValue = overlay.querySelector('.vid-speed-value');
    if (speedValue) {
      speedValue.textContent = formatSpeed(state.currentSpeed);
    }

    // Show overlay
    overlay.classList.add('vid-speed-visible');

    // Schedule hide
    scheduleOverlayHide();
  }

  // Schedule overlay to hide after timeout
  function scheduleOverlayHide() {
    clearTimeout(overlayTimeout);
    if (settings.overlayTimeout > 0) {
      overlayTimeout = setTimeout(() => {
        if (overlay) {
          overlay.classList.remove('vid-speed-visible');
        }
      }, settings.overlayTimeout);
    }
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.settings) {
        settings = changes.settings.newValue;
      }
      if (changes.state) {
        state = changes.state.newValue;
        applySpeedToAllVideos(state.currentSpeed);
        showOverlayFeedback();
      }
    }
  });

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
