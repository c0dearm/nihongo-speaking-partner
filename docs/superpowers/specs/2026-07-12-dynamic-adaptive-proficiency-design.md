# Dynamic Adaptive Proficiency Engine & Adaptation Mode Design Specification

**Date:** 2026-07-12  
**Status:** Approved  
**Topic:** Dynamic Adaptive Proficiency Engine (Historical Profile + Real-Time Live Adaptation)  

---

## 1. Overview & Purpose

The **Dynamic Adaptive Proficiency Engine** transforms the Nihongo Speaking Partner from a rigid, static benchmark tool into an intelligent, personalized Japanese speaking tutor. Instead of locking the AI strictly to a pre-selected JLPT level (such as N4) across every turn, the engine enables the Gemini Live API to:
1. **Learn across sessions (Historical Profile):** Synthesize the user's evaluated proficiency level, recent struggling grammar patterns from the local Notebook, and practice volume right before a conversation starts.
2. **Adapt turn-by-turn (Real-Time Live Adaptation):** Actively monitor the user's speaking fluency, hesitations, and sentence complexity during a WebSocket audio session, dynamically simplifying vocabulary and speaking pace when the user struggles, or elevating grammatical sophistication when the user demonstrates mastery.
3. **Preserve User Control (Adaptation Mode Selector):** Provide an **Auto / Rigid** toggle (`adaptationMode`), defaulting to `auto` for tailored adaptive tutoring, while allowing users to lock the AI into `rigid` mode when practicing against strict, unyielding exam standards.

---

## 2. Architecture & Data Model

### 2.1 Proficiency Profile Interface (`src/types/index.ts`)
```typescript
export type AdaptationMode = 'auto' | 'rigid';

export interface ProficiencyProfile {
  estimatedLevel: JLPTLevel;           // Rolling average / latest evaluated level from recent sessions
  recentStruggles: string[];           // Top 3-5 unmastered grammar/vocabulary items from Notebook
  recentStrengths: string[];           // Categories with high historical accuracy
  totalPracticeMinutes: number;        // Overall practice volume tracked in UserStats
}
```

### 2.2 Local Proficiency Synthesizer (`src/services/ai/ProficiencyProfileService.ts`)
The `ProficiencyProfileService` acts as a lightweight, zero-latency ($<5\text{ms}$) algorithmic synthesizer querying `StorageRepository` (`IndexedDB`):
* **`getProficiencyProfile(defaultLevel: JLPTLevel): Promise<ProficiencyProfile>`:**
  1. Queries `repository.getSessions()`. Checks up to the 10 most recent sessions for `feedbackReport.estimatedLevel`. If available, sets `estimatedLevel` to the most recent/common evaluated level; otherwise falls back to `defaultLevel`.
  2. Queries `repository.getNotebookItems()`. Filters for items where `mastered === false`. Extracts up to 5 unique `originalText` / `explanation` descriptions as `recentStruggles`.
  3. Queries `repository.getUserStats()`. Extracts `totalMinutesPracticed`.
  4. Returns the structured `ProficiencyProfile` object.

---

## 3. System Instruction & Prompt Injection (`PersonaService` & `LiveAudioClient`)

### 3.1 `PersonaService.buildSystemInstruction`
Updated signature:
```typescript
buildSystemInstruction(
  personaId: PersonaId,
  targetLevel: JLPTLevel,
  _furiganaEnabled?: boolean,
  scenario?: RoleplayScenario,
  profile?: ProficiencyProfile,
  adaptationMode: AdaptationMode = 'auto'
): string
```

#### Prompt Behavior by Mode:
* **`adaptationMode === 'rigid'`:**
  ```markdown
  TARGET JLPT LEVEL: ${targetLevel}
  Adaptation Mode: RIGID BENCHMARK. Maintain rigid grammatical complexity, vocabulary register, and speaking speed appropriate for exact Japanese proficiency level ${targetLevel}. Do not simplify for the user even if they hesitate or make mistakes.
  ```
* **`adaptationMode === 'auto'` (Default):**
  ```markdown
  DYNAMIC ADAPTIVE PROFICIENCY PROFILE:
  The user's historical evaluated proficiency is approximately: ${profile?.estimatedLevel || targetLevel}.
  Total practice experience: ${profile?.totalPracticeMinutes || 0} minutes.
  Known recent struggling grammar/vocabulary areas to gently scaffold and practice: [${profile?.recentStruggles.join('; ') || 'None recorded yet'}].

  REAL-TIME ADAPTATION RULES:
  You are an intelligent, responsive Japanese speaking tutor and conversation partner. Actively monitor the user's speaking fluency, hesitations, and grammar accuracy turn-by-turn:
  - If the user hesitates, uses broken grammar, pauses frequently, or asks for clarification, immediately adapt by slowing your speaking pace, using simpler sentence structures, and naturally recasting their intended meaning without breaking character.
  - If the user speaks fluently with accurate complex grammar and native flow, dynamically elevate your grammatical register, introduce natural native idioms, and increase conversational depth.
  ```

### 3.2 WebSocket Connection Setup (`LiveAudioClient.connect`)
Updated signature and pipeline:
```typescript
async connect(
  personaId: PersonaId,
  jlptLevel: JLPTLevel,
  apiKey: string,
  scenario?: RoleplayScenario,
  profile?: ProficiencyProfile,
  adaptationMode: AdaptationMode = 'auto'
): Promise<void>
```
Passes `profile` and `adaptationMode` directly to `this.personaService.buildSystemInstruction(...)` during WebSocket `BidiGenerateContent` initialization.

---

## 4. State Management & Studio UI Integration

### 4.1 Global Settings (`SettingsContext.tsx`)
* State: `adaptationMode: AdaptationMode` (defaults to `'auto'`).
* Persistence: Saved in browser storage via `localStorage.getItem('nihongo_adaptation_mode')` / `localStorage.setItem('nihongo_adaptation_mode', mode)`.
* Exported via `useSettings()` hook.

### 4.2 Settings View (`SettingsView.tsx`)
* Adds a dedicated **AI Adaptation Mode** selector card in `/settings`:
  * **Auto (Recommended):** AI learns from your speech & notebook mistakes, dynamically adjusting speed and vocabulary during conversations.
  * **Rigid Benchmark:** AI strictly locks vocabulary and grammar to the selected JLPT level without simplifying (ideal for exam cramming).

### 4.3 Live Partner Studio View (`LivePartnerView.tsx`)
* Displays an interactive **Adaptation Mode Chip** in the studio header and slide-out drawer:
  * Shows `🧠 Adaptive Mode: AUTO (${profile?.estimatedLevel || defaultLevel})` or `🔒 Rigid Mode: STRICT ${defaultLevel}`.
  * Clicking the chip toggles `setAdaptationMode(adaptationMode === 'auto' ? 'rigid' : 'auto')` instantly.
* When starting a live session (`startSession()`):
  1. If `adaptationMode === 'auto'`, calls `await scenarioService/profileService.getProficiencyProfile(defaultLevel)` (pre-fetched or on-demand).
  2. Invokes `client.connect(selectedPersona, defaultLevel, apiKey, scenario, profile, adaptationMode)`.

---

## 5. Error Handling, Fallbacks & Edge Cases

1. **Zero-History / Brand New User:**
   * When `repository.getSessions()` or `repository.getNotebookItems()` return empty arrays, `ProficiencyProfileService` returns a clean default baseline (`estimatedLevel: defaultLevel, recentStruggles: [], totalPracticeMinutes: 0`). The AI starts at the user's selected baseline and adapts purely based on real-time turn-by-turn speech.
2. **Offline / Corrupted Storage Fallback:**
   * If `getProficiencyProfile()` encounters an `IndexedDB` read exception, it logs a warning and falls back to `undefined` profile with `adaptationMode === 'auto'`, ensuring the WebSocket connection never fails due to local storage glitches.
3. **Mid-Session Mode Toggle:**
   * If the user toggles `adaptationMode` while a live conversation is actively connected, the change is saved in `SettingsContext` and takes effect on the *next* conversation (or triggers a clean notification advising that the new mode will apply on reconnect), avoiding WebSocket disconnection or session reset during active speech.

---

## 6. Verification & TDD Unit Testing Strategy

1. **`ProficiencyProfileService.test.ts` (New Suite):**
   * Verifies `getProficiencyProfile()` extracts `estimatedLevel` from the latest session report.
   * Verifies unmastered notebook items (`mastered: false`) are extracted as `recentStruggles` (capped at 5 items).
   * Verifies clean baseline fallback when no sessions or notes exist.
2. **`PersonaService.test.ts` (Updated Suite):**
   * Verifies `buildSystemInstruction()` injects `DYNAMIC ADAPTIVE PROFICIENCY PROFILE` and `REAL-TIME ADAPTATION RULES` when `adaptationMode === 'auto'`.
   * Verifies `buildSystemInstruction()` injects `Adaptation Mode: RIGID BENCHMARK` when `adaptationMode === 'rigid'`.
3. **`SettingsContext.test.tsx` (Updated Suite):**
   * Verifies `adaptationMode` defaults to `'auto'` and persists across `localStorage` updates.
4. **`LiveAudioClient.test.ts` & `LivePartnerView.test.tsx` (Updated Suites):**
   * Verifies `connect(...)` passes `profile` and `adaptationMode` to `buildSystemInstruction`.
   * Verifies the Studio UI renders the adaptation mode chip, toggles between Auto/Rigid, and forwards the profile when `startSession` is clicked.
5. **Full System Verification:**
   * `100% test pass rate` across all 16 test suites (`npm test`).
   * Clean production build (`npm run build`) with zero TypeScript errors.
