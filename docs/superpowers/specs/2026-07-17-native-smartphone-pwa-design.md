# Native Smartphone PWA (Progressive Web App) Design Specification

## Overview
This specification defines how to transform the Japanese Speaking Partner (`nihongo-speaking-partner`) web application into an installable, offline-capable Progressive Web App (PWA). Once deployed, learners on smartphones (iOS via Safari "Add to Home Screen", Android via Chrome "Install App") will experience a native-like application with a custom home screen icon, standalone full-screen display mode without browser bars, automatic background updates, and offline caching for static assets, drills, and notebooks.

---

## Architectural & Build Configuration

### 1. Vite PWA Plugin (`vite.config.ts` & `package.json`)
We integrate `vite-plugin-pwa` (which wraps Google Workbox) into our build pipeline:
- Add `vite-plugin-pwa` to `devDependencies` in `package.json`.
- Configure `VitePWA` in `vite.config.ts`:
  ```typescript
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
    manifest: {
      name: 'Nihongo Speaking Partner | 日本語スピーキング',
      short_name: 'Nihongo Partner',
      description: 'AI-powered conversational Japanese practice and JLPT oral assessment with real-time feedback.',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      orientation: 'any',
      icons: [
        {
          src: 'icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    },
  })
  ```
- **`registerType: 'autoUpdate'`**: Ensures that whenever a new build is deployed to production, the service worker checks for changes in the background, downloads the new static assets, and automatically activates upon the next page reload or session open without requiring manual user intervention.

---

## Assets & HTML Head Setup

### 2. High-Fidelity App Icons (`public/`)
We create the static `public/` directory (if not present) and populate it with four essential icon files:
- **`public/favicon.svg`**: Vector SVG icon featuring a sleek Japanese rising sun (red circle) and voice waveform / microphone motif on a dark slate background (`#0f172a`).
- **`public/icon-192.png`**: $192 \times 192\text{ px}$ PNG representation of the app icon for standard Android/PWA home screen grids.
- **`public/icon-512.png`**: $512 \times 512\text{ px}$ PNG representation for high-resolution displays, splash screens, and maskable icon frames.
- **`public/apple-touch-icon.png`**: $180 \times 180\text{ px}$ PNG with proper safe-area padding specifically tailored for iOS home screen shortcuts.

### 3. Standalone Mobile Meta Tags (`index.html`)
To ensure iOS Safari and Android Chrome render proper full-screen headers and status bars before the React bundle mounts:
```html
<meta name="theme-color" content="#0f172a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Nihongo Partner" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

---

## Offline Caching & Graceful API Guards

### 4. Offline Static Caching (Workbox)
Because `workbox.globPatterns` caches all HTML, JavaScript chunks, CSS files, and icons during the build, the app launches instantly from smartphone flash memory even when offline or in airplane mode.
- Users can browse all local data stored in IndexedDB (`StorageRepository`) and `localStorage`: Vocabulary/Grammar Notebooks, past session transcripts, practice streaks, and curated drill/scenario templates without any internet connectivity.

### 5. Graceful Connectivity Guard (`src/hooks/useOnlineStatus.ts` & `LivePartnerView.tsx`)
Because the Gemini Live API WebSocket (`wss://generativelanguage.googleapis.com/...`) and REST evaluations require an active internet connection, we introduce a lightweight hook `useOnlineStatus()`:

```typescript
// src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';

export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
```

In `LivePartnerView.tsx`:
- We consume `const isOnline = useOnlineStatus();`.
- When `!isOnline`:
  - The status bar displays: `Status: 📡 Offline Mode: Voice conversations and AI evaluations require an active internet connection.`
  - The `Start Live Conversation` / `Start Live Roleplay Mission` button is disabled (`disabled={isConnected || !isOnline}`) with a visual opacity indicator (`disabled:opacity-50 disabled:cursor-not-allowed`).
  - If offline while viewing a transcript, the `Generate Feedback Report` and `Look Up Turn Vocabulary` buttons are similarly disabled with a clear offline tooltip (`title="Requires internet connection"`).

Per user decision during brainstorming, no extra in-app "Install App" button or iOS guidance popups will be added, keeping the UI completely clean and native.

---

## Verification & Testing Plan
1. **Unit & Hook Testing**:
   - `src/hooks/useOnlineStatus.test.ts`: Verify the hook correctly initializes from `navigator.onLine` and updates state when `window.dispatchEvent(new Event('online' | 'offline'))` fires.
   - `src/components/partner/LivePartnerView.test.tsx`: Verify that when `useOnlineStatus` returns `false`, the Start Session and Generate Feedback buttons are disabled and the offline status message is displayed.
2. **Build & PWA Asset Verification**:
   - Run `npm run build` and confirm that `dist/manifest.webmanifest` and `dist/sw.js` are generated without errors.
   - Verify that `dist/index.html` contains all required meta tags and links (`apple-mobile-web-app-capable`, `theme-color`, `apple-touch-icon`).
   - Confirm all 101+ existing unit/integration tests pass (`npm test`) with zero regressions.
