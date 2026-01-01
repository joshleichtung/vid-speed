# Video Speed Controller

A minimal, privacy-focused Chrome extension for controlling video playback speed on any website.

## Features

- **Universal**: Works on YouTube, Netflix, Max, Vimeo, and any HTML5 video
- **Global Speed**: Speed setting persists across all sites and browser sessions
- **Customizable Hotkeys**: Assign any key combination you prefer
- **Visual Overlay**: Clean, unobtrusive speed indicator with clickable controls
- **Zero Tracking**: No analytics, no data collection, no external requests
- **Open Source**: Fully auditable code

## Default Hotkeys

| Action | Shortcut |
|--------|----------|
| Decrease Speed (-0.1x) | `Ctrl+Shift+A` |
| Increase Speed (+0.1x) | `Ctrl+Shift+S` |
| Toggle (1x ↔ last speed) | `Ctrl+Shift+D` |

All hotkeys are fully customizable in the extension settings.

## Installation

### From Source (Recommended for Privacy)

1. **Download or clone this repository**
   ```bash
   git clone https://github.com/yourusername/vid-speed.git
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `vid-speed` folder

5. **Done!** The extension icon will appear in your toolbar

## Usage

### Keyboard Shortcuts
- Press `Ctrl+Shift+S` to speed up by 0.1x
- Press `Ctrl+Shift+A` to slow down by 0.1x
- Press `Ctrl+Shift+D` to toggle between 1x and your last speed

### Overlay Controls
When a video is playing, a small overlay appears showing the current speed:
- Click `−` to decrease speed
- Click `+` to increase speed
- Click the speed value (e.g., "1.5x") to toggle between 1x and last speed

The overlay auto-hides after 2 seconds and reappears when you change the speed.

### Customizing Hotkeys
1. Click the extension icon → Settings (or right-click → Options)
2. Click on any hotkey to record a new key combination
3. Press your desired key combination (must include Ctrl, Alt, or Cmd)
4. Settings save automatically

## Privacy

This extension:
- ✅ Stores settings locally using Chrome's sync storage
- ✅ Contains no analytics or tracking code
- ✅ Makes no external network requests
- ✅ Requests minimal permissions (storage only)
- ✅ Is fully open source and auditable

## Permissions

- `storage`: Save your speed and hotkey preferences
- `host_permissions: <all_urls>`: Required to inject the speed controller into video pages

## Why Another Speed Controller?

The main Video Speed Controller extension is fine, but:
1. **Hotkey conflicts**: Many speed controllers use simple letter keys that conflict with games and web apps
2. **Complex settings**: Some have confusing configuration interfaces
3. **Trust**: Extensions can be sold and updated with malware; this one stays simple and auditable

## Development

```bash
# Clone the repo
git clone https://github.com/yourusername/vid-speed.git

# Load in Chrome as unpacked extension
# Make changes, then reload extension to test
```

## License

MIT License - do whatever you want with it.
