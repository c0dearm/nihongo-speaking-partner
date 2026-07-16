# Native Smartphone PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `nihongo-speaking-partner` into an installable, offline-capable Progressive Web App (PWA) with high-fidelity smartphone icons, standalone full-screen display mode, automatic service worker updates, and graceful offline status guards for AI voice/evaluation features.

**Architecture:** We install `vite-plugin-pwa` and configure `VitePWA` in `vite.config.ts` to auto-generate `manifest.webmanifest` and `sw.js` (Workbox pre-caching all static assets). We add standalone smartphone meta tags to `index.html` and generate custom app icons (`favicon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) inside `public/`. We create a `useOnlineStatus` hook and integrate it into `LivePartnerView.tsx` to disable network-dependent AI controls and display a helpful banner when offline.

**Tech Stack:** React 18, TypeScript, Vite, `vite-plugin-pwa`, Workbox, Vitest

## Global Constraints

- Must maintain strict TypeScript type safety (`npm run build` must pass with 0 errors).
- All Vitest tests (`npm run test`) must pass without regression.
- Preserve existing comment integrity across modified files.

---

### Task 1: Create High-Fidelity PWA App Icons (`public/`)

**Files:**
- Create: `public/favicon.svg`
- Create: `scripts/generate-icons.mjs`
- Create: `public/icon-192.png` (via script)
- Create: `public/icon-512.png` (via script)
- Create: `public/apple-touch-icon.png` (via script)

**Interfaces:**
- Consumes: Node.js canvas/zlib or raw PNG generator for static assets.
- Produces: `public/favicon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` for PWA manifest and iOS shortcuts.

- [ ] **Step 1: Write `public/favicon.svg`**

Create `public/favicon.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="120" fill="#0f172a"/>
  <!-- Rising Sun Motif -->
  <circle cx="256" cy="220" r="110" fill="#e11d48"/>
  <!-- Sound Wave / Voice Bars Motif inside Sun -->
  <rect x="186" y="180" width="16" height="80" rx="8" fill="#ffffff" opacity="0.95"/>
  <rect x="216" y="150" width="16" height="140" rx="8" fill="#ffffff" opacity="0.95"/>
  <rect x="248" y="130" width="16" height="180" rx="8" fill="#ffffff"/>
  <rect x="280" y="150" width="16" height="140" rx="8" fill="#ffffff" opacity="0.95"/>
  <rect x="310" y="180" width="16" height="80" rx="8" fill="#ffffff" opacity="0.95"/>
  <!-- Japanese Character Label Below -->
  <text x="256" y="390" font-family="sans-serif" font-size="52" font-weight="bold" fill="#f8fafc" text-anchor="middle">日本語</text>
  <text x="256" y="445" font-family="monospace" font-size="28" font-weight="600" fill="#818cf8" text-anchor="middle" letter-spacing="4">PARTNER</text>
</svg>
```

- [ ] **Step 2: Create PNG generation script `scripts/generate-icons.mjs`**

We create a pure Node.js script using `zlib` / minimal uncompressed PNG buffer writer or canvas so that we can generate valid PNG icons (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) from our theme specifications without requiring native binary dependencies like `canvas` or `sharp`.

Create `scripts/generate-icons.mjs`:
```javascript
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Writes a simple solid/styled uncompressed RGBA PNG buffer
function createPngBuffer(width, height) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  const bgColor = [15, 23, 42, 255]; // #0f172a
  const sunColor = [225, 29, 72, 255]; // #e11d48
  const barColor = [255, 255, 255, 255]; // white

  const cx = width / 2;
  const cy = height * 0.43;
  const sunR = width * 0.215;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      let color = bgColor;

      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= sunR * sunR) {
        color = sunColor;
        // Simple vertical bars inside sun
        const barW = width * 0.03;
        if (
          (Math.abs(dx) < barW * 0.5 && Math.abs(dy) < sunR * 0.7) ||
          (Math.abs(dx - barW * 2) < barW * 0.5 && Math.abs(dy) < sunR * 0.5) ||
          (Math.abs(dx + barW * 2) < barW * 0.5 && Math.abs(dy) < sunR * 0.5)
        ) {
          color = barColor;
        }
      }

      rawData[pixelOffset] = color[0];
      rawData[pixelOffset + 1] = color[1];
      rawData[pixelOffset + 2] = color[2];
      rawData[pixelOffset + 3] = color[3];
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG header chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace

  function makeChunk(type, data) {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = zlib.crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPngBuffer(192, 192));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPngBuffer(512, 512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPngBuffer(180, 180));
console.log('Generated PNG icons successfully in public/');
```

- [ ] **Step 3: Run icon generation script**

Run: `node scripts/generate-icons.mjs`
Expected: `Generated PNG icons successfully in public/`

- [ ] **Step 4: Verify files created**

Run: `ls -la public/`
Expected: `favicon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` listed with positive file sizes.

- [ ] **Step 5: Commit**

```bash
git add public/favicon.svg scripts/generate-icons.mjs public/icon-192.png public/icon-512.png public/apple-touch-icon.png
git commit -m "feat(pwa): create high fidelity vector and png app icons in public/"
```

---

### Task 2: Configure Standalone Meta Tags & PWA Plugin (`index.html`, `vite.config.ts`, `package.json`)

**Files:**
- Modify: `package.json:20-36`
- Modify: `vite.config.ts:1-14`
- Modify: `index.html:1-13`

**Interfaces:**
- Consumes: `vite-plugin-pwa`, `public/*` icons.
- Produces: `dist/manifest.webmanifest`, `dist/sw.js`, standalone smartphone meta tags in `index.html`.

- [ ] **Step 1: Install `vite-plugin-pwa`**

Run: `npm install -D vite-plugin-pwa@^0.19.7`
Expected: Package installed successfully with no errors.

- [ ] **Step 2: Update `vite.config.ts`**

Replace `vite.config.ts` with:
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
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
    }),
  ],
  base: process.env.VITE_BASE_PATH || '/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 3: Update `index.html`**

Replace `index.html` with:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nihongo Speaking Partner | 日本語スピーキング</title>
    <meta name="theme-color" content="#0f172a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Nihongo Partner" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Verify build generates PWA manifest and service worker**

Run: `npm run build && ls -la dist/manifest.webmanifest dist/sw.js`
Expected: Build passes with 0 errors and lists `dist/manifest.webmanifest` and `dist/sw.js` with positive sizes.

- [ ] **Step 5: Run tests to ensure no regressions**

Run: `npm test`
Expected: All 101 tests pass across 16 files.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts index.html
git commit -m "feat(pwa): integrate vite-plugin-pwa, standalone manifest, and smartphone meta tags"
```

---

### Task 3: Online Status Hook (`src/hooks/useOnlineStatus.ts` & `src/hooks/useOnlineStatus.test.ts`)

**Files:**
- Create: `src/hooks/useOnlineStatus.ts`
- Create: `src/hooks/useOnlineStatus.test.ts`

**Interfaces:**
- Consumes: `window.addEventListener('online' | 'offline')`, `navigator.onLine`.
- Produces: `export const useOnlineStatus = (): boolean;`

- [ ] **Step 1: Write the failing test `src/hooks/useOnlineStatus.test.ts`**

Create `src/hooks/useOnlineStatus.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('returns initial navigator.onLine value', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('updates when offline and online events fire on window', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useOnlineStatus.test.ts`
Expected: FAIL due to `Cannot find module './useOnlineStatus'`.

- [ ] **Step 3: Write minimal implementation `src/hooks/useOnlineStatus.ts`**

Create `src/hooks/useOnlineStatus.ts`:
```typescript
import { useState, useEffect } from 'react';

export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useOnlineStatus.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useOnlineStatus.ts src/hooks/useOnlineStatus.test.ts
git commit -m "feat(hooks): add useOnlineStatus hook to track network connectivity"
```

---

### Task 4: Graceful Offline Connectivity Guard in `LivePartnerView`

**Files:**
- Modify: `src/components/partner/LivePartnerView.tsx:14-25,441-450,654-657,740-745,775-780,430-445`
- Modify: `src/components/partner/LivePartnerView.test.tsx`

**Interfaces:**
- Consumes: `useOnlineStatus()` from `../../hooks/useOnlineStatus`.
- Produces: Graceful offline banner in `LivePartnerView.tsx` and disabled buttons when `!isOnline`.

- [ ] **Step 1: Write the failing tests in `src/components/partner/LivePartnerView.test.tsx`**

Append to `src/components/partner/LivePartnerView.test.tsx`:
```tsx
  it('displays offline status banner and disables live session buttons when offline', () => {
    // Simulate going offline
    renderWithProviders(<LivePartnerView repository={mockRepo} />);
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText(/📡 Offline Mode: Voice conversations and AI evaluations require an active internet connection/i)).toBeInTheDocument();
    
    const startBtn = screen.getByRole('button', { name: /Start Live Roleplay Mission|Start Live Conversation/i });
    expect(startBtn).toBeDisabled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/partner/LivePartnerView.test.tsx`
Expected: FAIL because offline banner and button disabling are not yet implemented.

- [ ] **Step 3: Update `src/components/partner/LivePartnerView.tsx`**

1. Import `useOnlineStatus` at the top of `src/components/partner/LivePartnerView.tsx`:
```tsx
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
```

2. Inside `LivePartnerView` component (right after `useSettings()`), invoke the hook:
```tsx
  const isOnline = useOnlineStatus();
```

3. Update the `startSession` function guard (around lines 246-255) and `handleToggleTurnVocab` (around lines 60-65) to check `isOnline`:
```tsx
  const startSession = async () => {
    if (!isOnline) {
      alert('You are offline. Live voice conversations require an active internet connection.');
      return;
    }
    if (!apiKey) {
      alert('Please configure your Gemini API Key in Settings first.');
      return;
    }
```
And inside `handleToggleTurnVocab`:
```tsx
    if (!isOnline) {
      setStatusMessage('You are offline. Vocabulary lookup requires an active internet connection.');
      return;
    }
```
And inside `handleGenerateReport`:
```tsx
  const handleGenerateReport = async () => {
    if (!isOnline) {
      alert('You are offline. Generating session feedback reports requires an active internet connection.');
      return;
    }
    if (transcript.length === 0 || !apiKey) return;
```

4. Update the status bar box (around line 655) to render the offline warning when `!isOnline`:
```tsx
        <div className="w-full max-w-lg px-4 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-center text-xs font-mono text-slate-300">
          Status:{' '}
          {!isOnline ? (
            <span className="text-amber-400 font-semibold">
              📡 Offline Mode: Voice conversations and AI evaluations require an active internet connection.
            </span>
          ) : (
            <span className="text-indigo-400">{statusMessage}</span>
          )}
        </div>
```

5. Update the `Start Live Conversation` / `Start Live Roleplay Mission` button (around lines 740-745) to be disabled when `!isOnline`:
```tsx
        {isConnected ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            {/* Existing connected UI */}
```
In the `else` block:
```tsx
        ) : (
          <button
            type="button"
            disabled={!isOnline}
            title={!isOnline ? "Requires internet connection" : ""}
            onClick={startSession}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Mic className="w-5 h-5" />
            {mode === 'missions' ? 'Start Live Roleplay Mission' : 'Start Live Conversation'}
          </button>
        )}
```

6. Update the `Generate Feedback Report` button (around lines 775-780) to be disabled when `!isOnline`:
```tsx
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generatingReport || !isOnline}
              title={!isOnline ? "Requires internet connection" : ""}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              {generatingReport ? 'Evaluating Session...' : 'Generate Feedback Report'}
            </button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/partner/LivePartnerView.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full verification suite**

Run: `npm test && npm run build`
Expected: All 103+ tests pass across 17 files, and `npm run build` succeeds with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/partner/LivePartnerView.tsx src/components/partner/LivePartnerView.test.tsx
git commit -m "feat(pwa): add graceful offline connectivity guard in LivePartnerView"
```

---

## Self-Review Checklist

1. **Spec coverage**:
   - PWA manifest, service worker (`vite-plugin-pwa`), standalone display -> Task 2
   - Custom icons (`favicon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) -> Task 1 & Task 2
   - Offline static caching -> Task 2
   - Graceful offline status guard (`useOnlineStatus`, disabled buttons, warning banner) -> Task 3 & Task 4
2. **No Placeholders**: All code snippets, scripts, configurations, and commands are fully written out.
3. **Type consistency**: `useOnlineStatus()` returns `boolean` and is consistently consumed across tests and `LivePartnerView.tsx`.
