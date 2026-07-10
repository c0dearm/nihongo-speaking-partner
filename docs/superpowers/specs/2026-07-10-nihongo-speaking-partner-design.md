# Nihongo Speaking Partner (日本語スピーキングパートナー) — System Design Specification

**Date:** 2026-07-10  
**Project:** `/home/aitorruano/nihongo-speaking-partner`  
**Target Audience:** Self-taught Japanese language learners studying for JLPT (N5–N1) needing daily speaking practice and structured oral feedback.

---

## 1. Executive Summary & Core Requirements

### 1.1 Problem Statement
Self-studying Japanese learners often excel at JLPT reading, listening, vocabulary, and grammar tests but lack access to native conversation partners or teachers to practice spoken production and natural conversation flow.

### 1.2 Solution Overview
**Nihongo Speaking Partner** is a modern, local-first browser web application combining:
1. **Real-Time Voice-to-Voice AI Role-Play Studio:** Powered by the **Gemini Live API** (`gemini-3.1-flash-live-preview`) over WebSockets for ultra-low-latency, natural turn-taking Japanese spoken conversations across customizable personas (*Casual Friend*, *Izakaya Staff*, *JLPT Examiner*, *Formal Interviewer*).
2. **Structured JLPT Speaking Drill Studio:** Curated and customizable speaking exercises for JLPT levels **N5–N1** with instant structured evaluation (`gemini-3.5-flash`) scoring Grammar Accuracy, Natural Phrasing, and Vocabulary Appropriateness.
3. **Mistake & Vocabulary Notebook:** A searchable local bank of corrected sentences, native recasts, and grammar notes saved from live sessions and drills.
4. **Study Dashboard & Streaks:** Daily study goal tracking and JLPT proficiency metrics to sustain consistent self-study habits.

---

## 2. Technical Architecture & Stack

```
+-----------------------------------------------------------------------------------+
|                            Modern Web App (React 18 + TypeScript)                 |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |  Live Partner      |  |  JLPT Drill Studio |  |  Notebook & Dashboard       |  |
|  |  (/partner)        |  |  (/drills)         |  |  (/notebook, /dashboard)    |  |
|  +---------+----------+  +---------+----------+  +--------------+--------------+  |
|            |                       |                            |                 |
|  +---------v-----------------------v----------------------------v--------------+  |
|  |                     App State & Custom Hooks Layer                          |  |
|  |       (useLiveSession, useJLPTDrills, useNotebook, useStudyStats)           |  |
|  +---------+----------------------------------------------------+--------------+  |
|            |                                                    |                 |
|  +---------v---------------------------+              +---------v--------------+  |
|  |   Gemini AI Services Layer          |              |  IndexedDB Repository  |  |
|  |                                     |              |  (Local-First Storage) |  |
|  | * LiveAudioClient (WebSockets)      |              |                        |  |
|  |   - AudioWorklet (16kHz PCM input)  |              | * sessions             |  |
|  |   - AudioPlayer (24kHz PCM output)  |              | * drills_progress      |  |
|  |   - Model: gemini-3.1-flash-live... |              | * notebook_items       |  |
|  |                                     |              | * user_stats           |  |
|  | * EvaluationService (@google/genai) |              | * custom_drills        |  |
|  |   - Structured JSON schemas         |              +------------------------+  |
|  |   - Model: gemini-3.5-flash         |                                          |
|  +-------------------------------------+                                          |
+-----------------------------------------------------------------------------------+
```

### 2.1 Core Stack
* **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons.
* **Web Audio Pipeline:** Native Web Audio API (`AudioContext`, `AudioWorkletNode`) for low-latency PCM capture (`16kHz 16-bit mono PCM`) and playback (`24kHz PCM buffer queue`).
* **AI Engine:**
  * **Real-Time Conversational Audio:** `@google/genai` Live API (`gemini-3.1-flash-live-preview` via WebSocket).
  * **Structured Evaluation & Feedback Reports:** `@google/genai` (`gemini-3.5-flash` with `responseSchema` JSON structured output).
* **Storage Layer:** Local-first IndexedDB (`nihongo_partner_db`) via a typed repository layer with zero external database dependencies.

---

## 3. Core Modules & User Flows

### 3.1 Live Partner Studio (`/partner`)
* **Persona Selection:**
  1. **Hiro / Aoi (Casual Friend):** *Tameguchi* (plain casual style, 〜だよ / 〜じゃん). Daily conversation, hobbies, slang.
  2. **Kenji (Izakaya / Store Staff):** Polite service Japanese (*Teineigo*). Ordering food, asking directions, convenience store situations.
  3. **Sayuri (JLPT Oral Practice Tutor):** Standard *Teineigo* (〜です / 〜ます) tailored to target JLPT level (**N5–N1**). Gentle conversational recasts.
  4. **Tanaka-sensei (Workplace & Interview):** Formal Business Japanese (*Keigo* / *Sonkeigo* / *Kenjougo*).
* **Live Audio Streaming Flow:**
  1. User clicks **"Start Conversation"** → `LiveAudioClient` initializes microphone `AudioWorklet` (16kHz PCM) and opens WebSocket connection.
  2. Incoming 24kHz PCM chunks play through `AudioPlayer` queue; animated waveform visualizer reflects RMS volume in real time.
  3. Voice Activity Detection (VAD) handles interruptions automatically (`interrupted: true`).
* **Interactive Transcript & Furigana Overlay:**
  * Real-time transcript drawer with toggleable **Furigana Mode** (annotating Kanji with Hiragana readings).
  * One-click **"Add to Notebook"** on any utterance.
* **Session Feedback Report:**
  * On ending a session, user can trigger **"Generate Session Report"**, which calls `gemini-3.5-flash` to evaluate the transcript and highlight top 3 grammar corrections, natural phrasing suggestions, and vocabulary level estimate.

### 3.2 JLPT Drill Studio (`/drills`)
* **Preloaded Curated Drills (N5–N1):**
  * 75+ preloaded exercises (15 per JLPT level) covering:
    * **Scenario Prompt Response** (e.g., N4: Asking for permission using 〜てもいいですか).
    * **Grammar Transformation** (e.g., N3: Combining sentences with 〜にもかかわらず).
    * **Shadowing & Paraphrasing** (e.g., N2: Paraphrasing a news-style sentence into conversational speech).
* **Custom Drill Creator:**
  * Modal to create custom prompts (`jlptLevel`, `title`, `scenarioPrompt`, `targetGrammar`).
* **Structured Evaluation (`EvaluationService`):**
  * Uses `gemini-3.5-flash` with structured JSON output:
    ```typescript
    interface SpeakingAssessment {
      overallScore: number;       // 0-100
      grammarScore: number;       // 0-100
      naturalnessScore: number;   // 0-100
      userTranscript: string;
      nativeRecast: {
        japanese: string;         // Native, natural phrasing
        furigana: string;         // Full reading annotation
        english: string;          // Natural English translation
      };
      grammarCorrections: Array<{
        originalPart: string;
        correctedPart: string;
        explanation: string;
        jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
      }>;
      keyVocabulary: Array<{
        word: string;
        reading: string;
        meaning: string;
      }>;
    }
    ```

### 3.3 Mistake & Vocabulary Notebook (`/notebook`)
* Local repository storing saved corrections, vocabulary items, and pronunciation notes.
* Filters by **JLPT Level (N5–N1)**, **Category (`grammar` | `vocabulary` | `pronunciation`)**, and **Mastered Status**.
* Supports one-click audio synthesis playback of corrected sentences.

### 3.4 Study Dashboard & Streak Tracking (`/dashboard`)
* **Daily Goal Tracker:** Target minutes per day (e.g. 15 mins) and active streak counter (`🔥 X Days`).
* **JLPT Level Mastery Breakdown:** Visual progress bar and score average across N5–N1 practice exercises.
* **Practice History Log:** Searchable list of past conversation transcripts and drill assessment scores.

### 3.5 Settings (`/settings`)
* **API Key Management:** Encrypted/secure local storage (`localStorage`) for the Gemini API key (`AIza...`).
* **Audio Device Selection:** Microphone input picker and speaker volume control.
* **Default JLPT Level:** Select target study level (`N5` – `N1`).
* **Data Management:** Full-data JSON Export and JSON Import for backup and device migration.

---

## 4. Local-First Storage Schema (IndexedDB)

Database Name: `nihongo_partner_db` (Version 1)

```typescript
export interface SessionRecord {
  id: string;
  timestamp: number;
  durationSeconds: number;
  personaId: 'casual_friend' | 'izakaya_staff' | 'jlpt_tutor' | 'workplace_formal';
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  transcript: Array<{
    speaker: 'user' | 'ai';
    text: string;
    furiganaText?: string;
    timestamp: number;
  }>;
  feedbackReport?: {
    summary: string;
    topGrammarCorrections: Array<{ original: string; corrected: string; note: string }>;
    naturalPhrasingTips: string[];
    estimatedLevel: string;
  };
}

export interface DrillProgressRecord {
  id: string;
  drillId: string;
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  completedAt: number;
  assessment: SpeakingAssessment;
}

export interface NotebookItemRecord {
  id: string;
  createdAt: number;
  category: 'grammar' | 'vocabulary' | 'pronunciation';
  jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  originalText: string;
  correctedText: string;
  furiganaText: string;
  explanation: string;
  mastered: boolean;
}

export interface UserStatsRecord {
  id: 'current_stats';
  dailyStreak: number;
  lastPracticeDate: string; // YYYY-MM-DD
  totalMinutesPracticed: number;
  dailyGoalMinutes: number;
}
```

---

## 5. Error Handling & Edge Cases

1. **Microphone Permission Denied / Audio Context Blocked:**
   * Clearly display an accessible alert banner explaining how to enable browser microphone permissions and provide a text-input fallback mode.
2. **WebSocket / Live API Disconnection:**
   * Handle unexpected network drops or session timeouts with automatic exponential backoff reconnection and visual status indicator (`Connected` / `Reconnecting` / `Offline`).
3. **Invalid or Missing Gemini API Key:**
   * Prompt user with an inline setup banner directing them to `/settings` with instructions on obtaining a free/paid key from Google AI Studio.
4. **Furigana Generation Fallback:**
   * If structured furigana tokenization fails, cleanly display standard Kanji text without crashing the UI.

---

## 6. Testing Strategy

1. **Unit Testing (Vitest):**
   * Repository CRUD operations (`StorageRepository`) for sessions, drills, notebook items, and streaks.
   * Assessment schema validation (`EvaluationService`) and JSON parser resilience.
   * Persona prompt builder logic.
2. **Audio Worklet & Audio Queue Testing:**
   * Mock `AudioContext` and PCM buffer handling to verify 16kHz resampling and 24kHz playback queue sequencing.
3. **Component Integration Testing (React Testing Library):**
   * Verify navigation flows, drill submission states, notebook filtering/toggle behavior, and settings export/import.
