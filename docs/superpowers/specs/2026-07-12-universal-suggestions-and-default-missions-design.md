# Universal Speaking Suggestions & Primary Default Missions Design Specification

**Date:** 2026-07-12  
**Status:** Approved  
**Topic:** Universal Speaking Suggestions across Free Chat & Missions, with Roleplay Missions as the Primary Default Mode  

---

## 1. Overview & Purpose

This specification refines the user experience of the **Live Partner Studio (`LivePartnerView`)** and **Dynamic Speaking Suggestions Engine (`EvaluationService`)** by:
1. **Making Roleplay Missions the Primary Default Tab:** Setting the initial state of the studio to **Goal-Oriented Roleplay Missions (`missions`)** so users are immediately greeted by structured, goal-oriented speaking scenarios upon opening the application, while retaining **Free Open-Ended Chat (`free`)** right next to it as the secondary mode.
2. **Universal Speaking Suggestions across both Modes:** Expanding `EvaluationService.generateSpeakingSuggestions(...)` and the studio's **Speaking Suggestions Panel (`💡 What You Could Say Next`)** to operate universally across both Roleplay Missions and Free Open-Ended Chat. When in Free Chat, suggestions tailor themselves to continuing the natural flow of conversation with the active AI persona (`selectedPersona`) at the user's target JLPT level (`targetLevel`).

---

## 2. Architecture & Data Flow

### 2.1 Universal Suggestions Engine (`src/services/ai/EvaluationService.ts`)
Updated method signatures:
```typescript
async generateSpeakingSuggestions(
  transcript: ConversationTurn[],
  targetLevel: JLPTLevel,
  apiKey: string,
  scenario?: RoleplayScenario,
  personaId: PersonaId = 'casual_friend'
): Promise<SpeakingSuggestion[]>

async generateSpeakingSuggestionsWithClient(
  ai: GoogleGenAI,
  transcript: ConversationTurn[],
  targetLevel: JLPTLevel,
  scenario?: RoleplayScenario,
  personaId: PersonaId = 'casual_friend'
): Promise<SpeakingSuggestion[]>
```

#### Prompt Construction by Mode:
* **Roleplay Missions Mode (`scenario` provided):**
  Insects `User Role: ${scenario.userRole}`, `AI Partner Role: ${scenario.aiRole}`, and `Mission Objective: ${scenario.goalDescription}`. Instructs Gemini 3.5 Flash (`gemini-3.5-flash`) to generate 2 to 3 authentic Japanese response options that advance the user toward their secret mission goal at `targetLevel` complexity.
* **Free Open-Ended Chat Mode (`scenario` is `undefined`):**
  Insects `AI Partner Persona: ${persona.name} (${persona.roleDescription})` and `Conversation Type: Free open-ended casual conversation on everyday topics.` Instructs Gemini 3.5 Flash to generate 2 to 3 natural, authentic Japanese response options that smoothly continue or steer the conversational flow at `targetLevel` complexity.

#### Timeout & Fallback Resilience:
In both modes, the `@google/genai` request races against a **$12\text{-second}$ timeout (`12000ms`)**. If the request times out, throws a network exception, or returns an empty array when `transcript.length === 0` (Turn 0 setup), `EvaluationService` returns universal kickstart conversation openers (`お話ししたいことがあるのですが` / `こんにちは。よろしくお願いします`).

---

## 3. Studio UI Integration & Tab Reordering (`LivePartnerView.tsx`)

### 3.1 Mode State Initialization & Tab Order
* **Default Mode State:** `const [mode, setMode] = useState<'free' | 'missions'>('missions');`
* **Studio Header Tab Deck:** Reordered so that **Goal-Oriented Roleplay Missions** (`Target` icon) is the first button and **Free Open-Ended Chat** (`MessageCircle` icon) is the second button.
* **Button & Status Copy:**
  * When `mode === 'missions'`: Action button reads *"Start Live Roleplay Mission"*.
  * When `mode === 'free'`: Action button reads *"Start Free Open-Ended Chat"*.

### 3.2 Universal Suggestions Panel & Turn Triggers
* **Panel Visibility Guard:**
  Updated from `isConnected && mode === 'missions' && selectedScenario && suggestionsMode !== 'off'` to:
  ```tsx
  isConnected && suggestionsMode !== 'off' && (mode === 'free' || Boolean(selectedScenario))
  ```
* **Turn 0 Setup Fetch (`startSession`):**
  ```typescript
  if ((mode === 'free' || Boolean(selectedScenario)) && suggestionsMode === 'auto') {
    setIsLoadingSuggestions(true);
    evalService.generateSpeakingSuggestions([], defaultLevel, apiKey, mode === 'missions' ? selectedScenario : undefined, selectedPersona)
      .then(s => setSuggestions(s))
      .finally(() => setIsLoadingSuggestions(false));
  }
  ```
* **Turn Completion Fetch (`onTurnEvent`):**
  When `turnComplete: true` and `speaker === 'ai'`, if `suggestionsMode === 'auto' && (mode === 'free' || Boolean(selectedScenario))`:
  ```typescript
  if (!lastSuggestedTurnIdRef.current || lastSuggestedTurnIdRef.current !== baseId) {
    lastSuggestedTurnIdRef.current = baseId;
    setIsLoadingSuggestions(true);
    evalService.generateSpeakingSuggestions(updatedTranscript, defaultLevel, apiKey, mode === 'missions' ? selectedScenario : undefined, selectedPersona)
      .then(s => setSuggestions(s))
      .finally(() => setIsLoadingSuggestions(false));
  }
  ```
* **Manual On-Demand Fetch (`handleFetchManualSuggestions`):**
  When `suggestionsMode === 'manual'`, clicking the *"💡 Stuck? Click to Generate Response Suggestions"* button invokes `generateSpeakingSuggestions(transcript, defaultLevel, apiKey, mode === 'missions' ? selectedScenario : undefined, selectedPersona)`.

---

## 4. Verification & TDD Unit Testing Strategy

1. **`EvaluationService.test.ts` (Updated Suite):**
   * Verifies `generateSpeakingSuggestionsWithClient` constructs a free-chat prompt when `scenario` is `undefined`.
   * Verifies that existing roleplay mission tests and timeout fallbacks continue passing cleanly.
2. **`LivePartnerView.test.tsx` (Updated Suite):**
   * Verifies that `LivePartnerView` renders `Goal-Oriented Roleplay Missions` as the active default tab upon mount.
   * Verifies that when toggled to `Free Open-Ended Chat`, starting a live session with `suggestionsMode === 'auto'` triggers `generateSpeakingSuggestions` and displays the `💡 What You Could Say Next` suggestion pills upon AI turn completion.
3. **Full System Verification:**
   * `100% test pass rate` across all 14 test suites (`npm test`).
   * Clean production build (`npm run build`) with zero TypeScript or bundler errors.
