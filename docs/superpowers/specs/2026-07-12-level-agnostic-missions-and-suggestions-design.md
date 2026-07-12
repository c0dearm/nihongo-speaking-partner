# Level-Agnostic Roleplay Missions & Dynamic Speaking Suggestions Design Specification

**Date:** 2026-07-12  
**Status:** Approved  
**Topic:** Level-Agnostic Roleplay Missions, Drill Deprecation, and Turn-by-Turn Dynamic Speaking Suggestions  

---

## 1. Overview & Purpose

This specification consolidates the Nihongo Speaking Partner around two core live conversation modalities: **Free Open-Ended Chat** and **Target-Oriented Roleplay Missions**. By deprecating standalone single-sentence JLPT Drills and making Roleplay Missions level-agnostic with real-time AI **Speaking Suggestions**, the application provides a straightforward, highly cohesive, and contextual speaking methodology:
1. **Drill Deprecation & Navigation Streamlining:** Remove the `/drills` navigation tab and replace legacy drill score metrics on the Study Dashboard (`/dashboard`) with **Roleplay Missions Completed** and **Mission Success Rate (`Achieved 🎯`)**.
2. **Level-Agnostic Roleplay Missions:** Decouple `RoleplayScenario` from fixed JLPT levels (`N5..N1`). Scenarios adapt dynamically to the user's active **Adaptation Mode** (`Auto` adaptive level vs `Rigid` benchmark level).
3. **Turn-by-Turn Dynamic Speaking Suggestions:** Introduce a multimodal/text suggestion engine (`EvaluationService.generateSpeakingSuggestions`) that analyzes the active mission goal and recent conversation turns to provide 2–3 natural, level-appropriate Japanese response options (with furigana, English translation, and strategic tips). Users can toggle suggestions between **Automatic (`auto`)**, **On-Demand (`manual`)**, and **Off (`off`)**.

---

## 2. Architecture & Data Model

### 2.1 Core Types (`src/types/index.ts`)
```typescript
export type SuggestionsMode = 'auto' | 'manual' | 'off';

export interface SpeakingSuggestion {
  japanese: string;      // Natural Japanese response string (kanji/kana)
  furigana: string;      // Full furigana reading annotation (e.g. 予約[よやく]したいのですが)
  english: string;       // English translation of the phrase
  tip: string;           // Brief explanation of why this phrase helps achieve the secret goal
}

export interface RoleplayScenario {
  id: string;
  title: string;
  category: 'dining' | 'travel' | 'daily_life' | 'business' | 'emergency';
  goalDescription: string;
  userRole: string;
  aiRole: string;
  isCustom?: boolean;
  // Note: jlptLevel is removed/optional for clean migration compatibility
  jlptLevel?: JLPTLevel;
}
```

### 2.2 Curated Scenarios & Service (`src/data/scenarios/curatedScenarios.ts` & `RoleplayScenarioService.ts`)
* Remove rigid `jlptLevel` assignments from `CURATED_SCENARIOS`.
* Update `RoleplayScenarioService.getScenariosByCategory(category?: string)` to organize and return scenarios grouped cleanly by topic (`dining`, `travel`, `daily_life`, `business`, `emergency`) rather than filtered by proficiency level.

---

## 3. Dynamic Speaking Suggestions Engine (`EvaluationService.ts`)

### 3.1 `EvaluationService.generateSpeakingSuggestions`
```typescript
async generateSpeakingSuggestions(
  transcript: ConversationTurn[],
  scenario: RoleplayScenario,
  targetLevel: JLPTLevel,
  apiKey: string
): Promise<SpeakingSuggestion[]>
```

#### Generation Logic & Prompting:
* Uses `@google/genai` with model `gemini-3.5-flash` and strict JSON `responseSchema` (`Type.ARRAY` of `SpeakingSuggestion` objects).
* Prompt context injects:
  1. The user's role (`scenario.userRole`) and secret objective (`scenario.goalDescription`).
  2. The target proficiency level (`targetLevel`).
  3. The last 4–6 turns of the conversation `transcript` (or the initial setup if turn 0).
* Requires the AI to return exactly 2 to 3 distinct, natural response options ranging from polite/direct to conversational, accompanied by accurate bracketed or ruby furigana and a short tip explaining how the phrase advances the mission goal.

---

## 4. State Management & UI Integration

### 4.1 Global Settings (`src/context/SettingsContext.tsx`)
* State: `suggestionsMode: SuggestionsMode` (defaults to `'auto'`).
* Persistence: Saved in browser storage via `localStorage.getItem('nihongo_suggestions_mode')` / `localStorage.setItem('nihongo_suggestions_mode', mode)`.
* Exposed via `useSettings()` hook alongside `adaptationMode`.

### 4.2 Top Navigation & Drill Deprecation (`src/components/layout/Header.tsx`)
* Remove the `<NavLink to="/drills">` item from the navigation bar.
* Retain cleanly: **Studio (`/`)**, **Dashboard (`/dashboard`)**, **Notebook (`/notebook`)**, and **Settings (`/settings`)**.

### 4.3 Study Dashboard Transformation (`src/components/dashboard/DashboardView.tsx`)
* Replace the "Completed Drills" tile with **Roleplay Missions Completed** (total historical `SessionRecord` items where `scenarioId` or `feedbackReport.goalVerdict` is present).
* Replace the "Average Drill Score" tile with **Mission Success Rate** (percentage of mission sessions where `feedbackReport.goalVerdict?.status === 'ACHIEVED'` or `'PARTIALLY_ACHIEVED'`).

### 4.4 Settings View (`src/components/settings/SettingsView.tsx`)
* Add a dedicated **Speaking Suggestions Mode** card:
  * **Automatic (After every AI turn):** Instantly generates 2–3 response ideas whenever the AI finishes speaking during a mission.
  * **On-Demand (Click when stuck):** Shows a "💡 Get Suggestions" button in the studio to generate hints only when manually requested.
  * **Off:** Hides the suggestions panel completely for unassisted immersion.

### 4.5 Live Studio Suggestions Panel (`src/components/partner/LivePartnerView.tsx`)
* Adds a **Suggestions Mode Chip** in the studio header and slide-out drawer: `💡 Hints: AUTO` / `💡 Hints: MANUAL` / `💡 Hints: OFF`. Clicking toggles through the modes (`auto` -> `manual` -> `off` -> `auto`).
* In `missions` mode while connected (`isConnected === true`):
  * **When `suggestionsMode === 'auto'`:** When `onTurnEvent` fires `turnComplete: true` for `speaker === 'ai'`, triggers `evalService.generateSpeakingSuggestions(...)` and displays the resulting pills inside a collapsible **💡 What You Could Say Next** panel above the microphone controls.
  * **When `suggestionsMode === 'manual'`:** Renders a button: **💡 Stuck? Click for Speaking Suggestions**. Clicking triggers `generateSpeakingSuggestions(...)`.
  * **When `suggestionsMode === 'off'`:** Panel is hidden.
* **Interactive Pills:** Each suggestion card displays the Japanese text (rendered with `renderFurigana`), English translation, and strategic tip.

---

## 5. Error Handling, Fallbacks & Edge Cases

1. **API Timeout or Network Glitch During Suggestion Fetch:**
   * If `generateSpeakingSuggestions(...)` throws or takes longer than $6\text{ seconds}$, the studio catches the error silently, clears the loading indicator, and displays a subtle fallback prompt (*"Could not load suggestions right now. Speak naturally when ready!"*). This guarantees that background suggestion fetches never interrupt or disconnect the live WebSocket audio stream.
2. **First Turn / Mission Initialization:**
   * When a mission starts before the user or AI has spoken turn 0, if `suggestionsMode === 'auto'`, the studio immediately fetches initial starter phrase suggestions based purely on `scenario.goalDescription` and `scenario.userRole` so the user has immediate guidance on how to initiate the call/interaction.
3. **Legacy Drill Progress Storage Compatibility:**
   * While the UI tab and drill studio are removed, the underlying `drills_progress` and `custom_drills` object stores in `StorageRepository` remain intact during `DB_VERSION` transitions to ensure zero data corruption or schema errors for existing browser databases.

---

## 6. Verification & TDD Unit Testing Strategy

1. **`EvaluationService.test.ts` (Updated Suite):**
   * Verifies `generateSpeakingSuggestions()` parses structured JSON suggestion arrays from `@google/genai`.
   * Verifies proper fallback / empty array return when API calls throw.
2. **`RoleplayScenarioService.test.ts` (Updated Suite):**
   * Verifies `getAllScenarios()` and `getScenariosByCategory()` return scenarios without requiring a `jlptLevel` filter.
3. **`DashboardView.test.tsx` (Updated Suite):**
   * Verifies calculation and rendering of "Missions Completed" and "Mission Success Rate" tiles from session reports containing `goalVerdict`.
4. **`Header.test.tsx` & `SettingsView.test.tsx` (Updated Suites):**
   * Verifies `/drills` navigation tab is cleanly absent.
   * Verifies `suggestionsMode` defaults to `'auto'`, persists in `localStorage`, and toggles through Auto/Manual/Off in Settings.
5. **`LivePartnerView.test.tsx` (Updated Suite):**
   * Verifies suggestions mode chip renders in header and drawer.
   * Verifies that when in mission mode with `suggestionsMode === 'auto'`, AI `turnComplete` triggers `generateSpeakingSuggestions` and displays the suggestion cards.
   * Verifies manual mode button (`💡 Stuck? Click for Speaking Suggestions`) triggers generation on demand.
6. **Full System Verification:**
   * `100% test pass rate` across all test suites (`npm test`).
   * Clean production build (`npm run build`) with zero TypeScript or bundler errors.
