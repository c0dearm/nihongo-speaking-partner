# 🌸 Nihongo Speaking Partner (日本語スピーキングパートナー)

[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite 5](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Gemini Live API](https://img.shields.io/badge/Powered_by-Gemini_Live_API-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Local First](https://img.shields.io/badge/Storage-Local--First_(IndexedDB)-10B981?logo=database&logoColor=white)](#-100-local-first--private-architecture)

An autonomous, **100% client-side & local-first Japanese speaking practice studio** built for self-taught JLPT students (**N5 through N1**). 

**Nihongo Speaking Partner** leverages the **Google Gemini Live API (Bidirectional Audio WebSockets)** for ultra-low-latency, natural voice-to-voice roleplay conversations, combined with **Gemini 3.5 Flash** for structured turn-by-turn speaking suggestions, real-time grammar corrections, and session feedback evaluations—all running directly in your web browser with zero backend servers required.

---

## ✨ Core Features

### 🎯 Goal-Oriented Roleplay Missions
Step into authentic, scenario-based Japanese missions where you must achieve a secret objective against an AI conversation partner acting with realistic constraints, personalities, and role dynamics:
* **Reserving an Izakaya Table (`izakaya_reserve`):** Call a busy Tokyo izakaya to book a table for 5 people on Saturday night under your name while navigating seating choices and time constraints.
* **Hotel Check-In (`hotel_checkin`):** Check into a Kyoto ryokan or hotel, confirm breakfast inclusions, and ask about local hot spring (`onsen`) reservations.
* **Ordering at a Diner (`diner_order`):** Order lunch at a bustling neighborhood diner, ask for dietary recommendations, and request separate checks (`べつべつで`).
* **Lost & Found at Police Box (`lost_property`):** Visit a Japanese police box (`Koban`) to report a lost wallet or train pass, describing the item, time, and location precisely.
* **Rescheduling a Business Meeting (`client_reschedule`):** Politely call a Japanese client or manager using appropriate honorifics (`Keigo` / `謙譲語`) to reschedule an important meeting due to a train delay.
* **Custom Mission Creator:** Build your own custom roleplay scenarios with custom user/AI roles, mission objectives, and categories!

### 🎙️ Ultra-Low-Latency Voice Immersion (`LiveAudioClient`)
* **Real-Time Bidirectional PCM Streaming:** Connects directly via WebSockets to `gemini-3.1-flash-live-preview` using raw 16kHz PCM microphone capture (`AudioCapture`) and smooth 24kHz PCM playback queueing (`AudioPlayer`).
* **Live Waveform & Audio Level Visualizers:** Interactive visual feedback showing input and output RMS sound levels during speech.
* **Furigana Mode Toggle:** Slide-out interactive transcript drawer with on-demand bracketed or ruby Furigana annotations (`漢字[かんじ]`) above Japanese text to aid character reading while listening.

### 💡 Turn-by-Turn Dynamic Speaking Suggestions Engine
Never get stuck during a roleplay mission or casual chat again. Powered by `gemini-3.5-flash` with strict JSON schema outputs:
* **Context-Aware Scaffolding:** After every AI conversational turn, the coach generates 2 to 3 natural, authentic Japanese response options that smoothly advance your secret mission objective or steer the conversation.
* **Multimodal Hints:** Every suggestion includes the authentic Japanese phrase, full ruby/bracketed Furigana readings (`予約[よやく]したいのですが`), clean English translations, and a concise strategic tip.
* **Flexible Modes (`/settings`):** Choose between **Automatic (`AUTO`)** (generates after every turn), **On-Demand (`MANUAL`)** (click the *"💡 Stuck? Click to Generate Response Suggestions"* button right when you need inspiration), or **Off (`OFF`)** for unassisted immersion.
* **Instant Turn 0 Kickstarters:** If you don't know how to open the conversation when starting a new mission or free chat, the engine immediately provides versatile conversation starters (`すみません、お話ししたいことがあるのですが`).

### 🧠 Dynamic Adaptive Proficiency Engine (`Auto` vs `Rigid`)
Your AI partner grows with you. The `ProficiencyProfileService` continuously scans your past session reports, practice duration, and unmastered mistakes inside `IndexedDB` ($<5\text{ms}$ query time) to build a dynamic proficiency profile:
* **Adaptive Mode (`AUTO`):** The AI automatically scales its vocabulary complexity, grammar structures, speaking speed, and slang/honorific usage in real-time to match your estimated proficiency while subtly pushing you toward your next milestone.
* **Rigid Benchmark Mode (`STRICT N5-N1`):** Locks the AI partner into strict JLPT benchmark parameters, perfect for testing whether you can survive a real N3 or N2 conversation without adaptation.

### 📓 Local-First Mistake & Vocabulary Notebook (`/notebook`)
Every time you complete a live speaking session, you receive a comprehensive **Session Feedback Report** with a goal verdict (`Achieved 🎯` / `Partially Achieved ⚠️`), fluency score, and itemized grammar/phrasing corrections.
* **One-Click Save:** Save any corrected sentence or natural alternative directly into your persistent study notebook.
* **Smart Filtering & Search:** Filter mistakes by JLPT level (`N5..N1`), category (`grammar`, `vocabulary`, `pronunciation`, `natural_phrasing`), or mastery status.
* **Audio Pronunciation Playback:** Listen to the natural Japanese pronunciation of saved phrases using the browser's native Web Speech API (`speechSynthesis`).

### 📊 Study Dashboard & Streak Tracking (`/dashboard`)
Stay consistent with daily speaking habits:
* **Daily Streak (`dailyStreak`):** Track your consecutive practice days (`🔥 Streak`).
* **Study Goals:** Set and monitor custom daily speaking minute targets (`⏱️ Daily Goal`).
* **Mission Success Metrics:** View total **Roleplay Missions Completed** and your overall **Mission Success Rate** across all practice sessions.

---

## 🔒 100% Local-First & Private Architecture

This application operates with **Zero External Databases, Zero Backend Servers, and Zero Telemetry**.

1. **API Key Security:** Your Google Gemini API Key is stored exclusively in your browser's local storage (`localStorage.getItem('nihongo_api_key')`) and is used directly from your device to establish secure WebSocket and HTTPS connections to Google's API.
2. **IndexedDB Storage (`StorageRepository`):** All transcripts, session reports, custom roleplay scenarios, user statistics, and saved notebook items are persisted locally inside an `idb` IndexedDB database (`nihongo_partner_db`).
3. **Complete Data Ownership:** The Settings view (`/settings`) allows you to **Export all local data as a JSON backup** or **Import / Restore previous backups** at any time.

---

## 🚀 Quickstart & Local Development

### Prerequisites
* **Node.js** v20 or v22+ (`node -v`)
* **Google Gemini API Key** with access to Gemini Live API (`gemini-3.1-flash-live-preview`) and Gemini 3.5 Flash (`gemini-3.5-flash`). Get a free key at [Google AI Studio](https://aistudio.google.com/).

### Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/<YOUR_GITHUB_USERNAME>/nihongo-speaking-partner.git
cd nihongo-speaking-partner

# 2. Install dependencies
npm install

# 3. Run the comprehensive unit test suite (69 Vitest unit tests across 14 suites)
npm test

# 4. Start the local Vite development server
npm run dev
```

Open your browser to `http://localhost:5173/`, go to **Settings**, paste your Gemini API Key, and start speaking Japanese!

---

## 📱 Using on Your Mobile Phone (iOS & Android)

Because the app is entirely client-side, you can use it seamlessly on your smartphone for on-the-go Japanese immersion.

> [!IMPORTANT]
> **Secure Context (HTTPS) Requirement for Mobile Microphones:**  
> Modern mobile browsers (iOS Safari and Android Chrome) **require HTTPS (or `localhost`)** to allow microphone access (`navigator.mediaDevices.getUserMedia`) and Web Audio API (`AudioWorklet`). If you access the app over plain HTTP over Wi-Fi (`http://192.168.x.x:5173`), microphone permissions will be blocked!

### Option A: Free Static Web Hosting (Recommended ⭐)
Deploy the app directly to **GitHub Pages, Vercel, Netlify, or Cloudflare Pages**. 
* Every static host provides automatic **HTTPS**, making microphone permissions and WebSockets work instantly on both iOS and Android.
* **Automatic GitHub Pages Deployment:** This repository includes a pre-configured GitHub Actions workflow (`.github/workflows/deploy.yml`). Simply push to your GitHub repo, go to **Settings → Pages**, and select **Source: GitHub Actions**. Your app will automatically build and publish to `https://<YOUR_GITHUB_USERNAME>.github.io/nihongo-speaking-partner/`!

### Option B: Local Wi-Fi Network with Secure Tunneling
If running `npm run dev` locally on your Linux/Mac/Windows computer and testing on your phone over Wi-Fi:
```bash
# Terminal 1: Start Vite
npm run dev

# Terminal 2: Create a secure public HTTPS tunnel using Cloudflare Tunnel or ngrok
cloudflared tunnel --url http://localhost:5173
# OR
ngrok http 5173
```
Open the generated `https://...` URL on your phone for instant, secure mobile microphone access!

### Option C: Install as a Mobile App (Progressive Web App)
When viewing the secure HTTPS app URL on your phone:
* **iOS (Safari):** Tap the **Share button** (bottom center) → **"Add to Home Screen"**.
* **Android (Chrome):** Tap the **Three Dots menu** (top right) → **"Add to Home screen"** / **"Install app"**.

Tapping the home screen icon launches the studio in full-screen mobile immersion without browser address bars!

---

## 🧪 Testing & Code Quality

The project adheres to strict Test-Driven Development (TDD) and clean architectural separation between React UI views (`src/components/*`), domain services (`src/services/*`), and local storage repositories (`src/services/storage/*`).

```bash
# Run all unit tests with Vitest (69 tests across 14 suites)
npm test

# Run TypeScript strict type checking
npx tsc --noEmit

# Build production bundle
npm run build
```

---

## 📁 Project Structure

```text
nihongo-speaking-partner/
├── .github/workflows/
│   └── deploy.yml              # Automated GitHub Pages CI/CD deployment
├── src/
│   ├── components/
│   │   ├── dashboard/          # Study dashboard & streak tracker views
│   │   ├── layout/             # Header and navigation bar
│   │   ├── notebook/           # Saved mistakes & vocabulary notebook + pronunciation
│   │   ├── partner/            # Live partner studio, waveform visualizer, scenarios modal
│   │   └── settings/           # API key management, adaptive mode toggle, JSON backup/restore
│   ├── context/
│   │   └── SettingsContext.tsx # Persistent local settings state provider (`localStorage`)
│   ├── data/
│   │   ├── personas.ts         # Curated AI persona profiles (Casual Friend, Keigo Tutor, Kansai-ben, etc.)
│   │   └── scenarios/          # Curated level-agnostic roleplay missions
│   ├── services/
│   │   ├── ai/
│   │   │   ├── EvaluationService.ts         # Gemini 3.5 Flash evaluations, suggestions, and furigana
│   │   │   ├── LiveAudioClient.ts           # Gemini Live API bidirectional WebSocket client
│   │   │   └── ProficiencyProfileService.ts # Dynamic adaptive proficiency level calculator
│   │   ├── audio/
│   │   │   ├── AudioCapture.ts              # 16kHz PCM microphone audio worklet processor
│   │   │   └── AudioPlayer.ts               # 24kHz PCM streaming playback queue
│   │   ├── persona/
│   │   │   └── PersonaService.ts            # System instruction & dynamic adaptation rules builder
│   │   ├── scenarios/
│   │   │   └── RoleplayScenarioService.ts   # Scenario retrieval and custom scenario manager
│   │   └── storage/
│   │       └── StorageRepository.ts         # IndexedDB (`idb`) persistence layer
│   ├── types/
│   │   └── index.ts            # Comprehensive strict TypeScript domain interfaces
│   ├── utils/
│   │   └── furigana.tsx        # Bracketed ruby furigana renderer (`漢字[かんじ]`)
│   ├── App.tsx                 # Root single-page application & tab router
│   └── main.tsx                # Application entrypoint
├── vite.config.ts              # Vite configuration with dynamic GitHub Pages base path
└── package.json
```

---

## 📜 License

MIT License. Built with ❤️ for Japanese language learners around the world. がんばってください！
