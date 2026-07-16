# Beginner-Friendly Conversation Enhancements Design

## Overview
This specification details four core usability and pedagogical enhancements for the Japanese Speaking Partner (`nihongo-speaking-partner`) application, focused specifically on lowering the entry barrier for beginner (JLPT N5/N4) learners:
1. **Cadence of Speech (AI Speaking Speed)**: Automatic level-tailored speaking pacing with a manual override setting.
2. **Smart Turn-Locking for Hints**: Stabilizing speaking suggestions so they do not refresh prematurely during user hesitation or brief AI interjections.
3. **Bite-Sized Stepping & Tiered Hints (`Easy` vs `Natural`)**: Decomposing complex mission objectives into single-step turns with strict JLPT vocabulary/grammar bounds and tiered complexity badges.
4. **AI Speaks First (Conversation Initiation)**: Eliminating the initial silence by configuring the AI to speak first upon WebSocket connection, with an initiation toggle.

---

## Architecture & State Changes

### 1. Settings State Extensions (`types/index.ts` & `SettingsContext.tsx`)
We introduce two new user settings persisted to `localStorage` and managed via `SettingsContext`:

```typescript
export type SpeakingSpeed = 'auto' | 'very_slow' | 'slow' | 'normal';
export type Initiator = 'ai_first' | 'user_first';

export interface SettingsContextType {
  // Existing settings...
  speakingSpeed: SpeakingSpeed;
  setSpeakingSpeed: (speed: SpeakingSpeed) => void;
  initiator: Initiator;
  setInitiator: (initiator: Initiator) => void;
}
```

- **`SpeakingSpeed`**: Defaults to `'auto'` (`localStorage.getItem('nihongo_speaking_speed') || 'auto'`).
- **`Initiator`**: Defaults to `'ai_first'` (`localStorage.getItem('nihongo_initiator') || 'ai_first'`).

---

## Detailed Feature Specifications

### Section 1: Cadence of Speech (Speaking Speed Control)
#### 1.1 Prompt Pacing Directives (`PersonaService.buildSystemInstruction`)
The `buildSystemInstruction` method accepts `speakingSpeed: SpeakingSpeed` and dynamically injects precise pacing constraints into the Gemini Live API `systemInstruction`:

- If `speakingSpeed === 'very_slow'` OR (`speakingSpeed === 'auto'` && `targetLevel` in `['N5', 'N4']`):
  > **SPEAKING PACE & CADENCE**: You MUST speak VERY SLOWLY and clearly with distinct, gentle pauses between words and clauses (approx. 0.7x to 0.75x normal native speaking pace). Enunciate every syllable clearly so a beginner ear can catch each sound. Do not rush or slur words.
- If `speakingSpeed === 'slow'` OR (`speakingSpeed === 'auto'` && `targetLevel === 'N3'`):
  > **SPEAKING PACE & CADENCE**: Speak at a moderate, steady, and clear pace with distinct pauses (approx. 0.85x to 0.9x normal native pace).
- If `speakingSpeed === 'normal'` OR (`speakingSpeed === 'auto'` && `targetLevel` in `['N2', 'N1']`):
  > **SPEAKING PACE & CADENCE**: Speak at a natural, authentic native conversational speed.

#### 1.2 UI Control (`LivePartnerView.tsx`)
A selector pill is added to the top settings bar beside `Adaptive Mode` and `Hints Mode`:
- Button displays: `⏱️ Pace: AUTO (JLPT N4)` or `⏱️ Pace: VERY SLOW`.
- Clicking cycles through `auto` -> `very_slow` -> `slow` -> `normal`.

---

### Section 2: Smart Turn-Locking for Hints
#### 2.1 Problem Statement
When `suggestionsMode === 'auto'`, any AI `turnComplete` event immediately triggers `generateSpeakingSuggestions(updatedTranscript, ...)`. If a user hesitates while reading or speaking a hint, the Bidi socket may trigger an AI barge-in/filler turn (`はい`, `ええ？`). When that brief AI turn completes, the hints refresh and wipe out what the user was mid-way through saying.

#### 2.2 Smart Turn-Locking Logic (`LivePartnerView.tsx`)
Instead of unconditionally generating suggestions on every AI `turnComplete`, we introduce a validation function `shouldTriggerHintsRefresh(turn, updatedTranscript, lastSuggestedTurnId)`:

1. **No Interruption Refresh**: If `turn.interrupted === true`, abort refresh.
2. **No Brief/Filler Turn Refresh**: If the completed AI turn text is very short/filler (e.g., `< 5` Japanese characters like `はい。`, `ええ？`, `そうですね。`) AND `suggestions.length > 0`, abort refresh.
3. **No Mid-User-Speech Refresh**: If the user has spoken or an input transcript chunk arrived within the last 1500ms, abort refresh.
4. **Valid Turn Check**: Only trigger `generateSpeakingSuggestions` when the AI completes a substantial turn following a meaningful user turn, or when `suggestions` is currently empty.

---

### Section 3: Bite-Sized Stepping, Strict Level Bounds & Tiered Hints
#### 3.1 Type Updates (`types/index.ts`)
```typescript
export interface SpeakingSuggestion {
  japanese: string;
  furigana: string;
  english: string;
  tip: string;
  tier?: 'easy' | 'natural';
}
```

#### 3.2 Prompt Engineering (`EvaluationService.generateSpeakingSuggestions`)
The prompt sent to `gemini-3.1-flash-lite-preview` is enhanced with three core requirements:

1. **Bite-Sized Stepping (Mission Decomposition)**:
   > **CRITICAL FOR BEGINNERS (N5/N4)**: Do NOT attempt to fulfill multiple roleplay mission requirements or multi-clause thoughts in a single suggestion. Break the conversation down into BITE-SIZED, single-step turns. Each suggested phrase MUST accomplish exactly ONE small conversational step (e.g., Turn 1: get attention / state intent `すみません、予約したいのですが。`; Turn 2: state day/time `土曜日の夜７時です。`; Turn 3: state party size `５人です。`).
2. **Strict Level Bounding**:
   > **STRICT LEVEL BOUNDS**: Strictly constrain all vocabulary, kanji, and grammar patterns to `${targetLevel}`. For N5, every suggestion must be a single clause under 7 words. For N4, under 10 words.
3. **Tiered Output Requirement**:
   > **TIERED SUGGESTIONS**: Return exactly 2 to 3 response options. At least one option MUST have `"tier": "easy"` (the shortest, simplest possible single-clause sentence to keep the conversation moving). At least one option MUST have `"tier": "natural"` (a slightly more complete or authentic native phrasing for when the learner feels confident).

#### 3.3 UI Rendering (`LivePartnerView.tsx`)
Each suggestion card in the hints panel renders a tier badge:
- If `tier === 'easy'`: Render badge `🌱 Bite-Sized (Easy)` with `bg-emerald-950 text-emerald-400 border-emerald-500/30`.
- If `tier === 'natural'`: Render badge `💬 Natural` with `bg-indigo-950 text-indigo-400 border-indigo-500/30`.

---

### Section 4: AI Speaks First Conversation Initiation
#### 4.1 Problem Statement
Upon WebSocket setup completion (`setupComplete`), the AI waits for microphone VAD input. This leaves beginners staring at a silent microphone unsure how or what to say to begin.

#### 4.2 System Prompt & WebSocket Trigger (`LiveAudioClient.ts` & `PersonaService.ts`)
1. **Prompt Directive (`PersonaService.buildSystemInstruction`)**:
   When `initiator === 'ai_first'`, append to `systemInstruction`:
   > **CONVERSATION INITIATION**: You MUST speak first immediately upon session connection. Greet the user warmly in your persona role and open the scene or roleplay situation. Do NOT wait for the user to speak first.
2. **WebSocket Initial Turn Trigger (`LiveAudioClient.ts`)**:
   In `connect(...)`, accept `initiator: Initiator = 'ai_first'`.
   Inside `ws.onmessage`, when `data.setupComplete === true` is received AND `initiator === 'ai_first'`, immediately send an initial turn trigger over the socket:
   ```json
   {
     "clientContent": {
       "turns": [
         {
           "role": "user",
           "parts": [{ "text": "（接続が完了しました。あなたの役柄とシチュエーションに合わせて、あなたから先に話しかけて会話を開始してください！）" }]
         }
       ],
       "turnComplete": true
     }
   }
   ```
   This triggers the Gemini Bidi Live API model to instantly start speaking its opening greeting/roleplay line as soon as the WebSocket connection opens.

#### 4.3 UI Toggle (`LivePartnerView.tsx`)
A selector pill is added to the top settings bar beside `Pace` and `Hints`:
- Button displays: `🗣️ Opens: AI First` or `🗣️ Opens: You First`.
- Clicking toggles between `ai_first` and `user_first`.

---

## Error Handling & Edge Cases
- **WebSocket Reconnections / Mode Changes**: When toggling `SpeakingSpeed` or `Initiator` mid-session, changes apply upon the next connection (consistent with `AdaptationMode` behavior), disabled/greyed while connected with a helpful tooltip.
- **Fallback Suggestions**: If `generateSpeakingSuggestions` fails or times out, initial kickstart suggestions (`getKickstartSuggestions`) also include `tier: 'easy'` and `tier: 'natural'` tags for consistency.
- **Microphone VAD Race Condition**: If the user immediately speaks within the first 200ms of `setupComplete` while `initiator === 'ai_first'`, the Gemini Live API naturally handles the barge-in/interruption via `serverContent.interrupted`.

---

## Verification Plan
1. **Automated Tests**:
   - `SettingsContext.test.tsx`: Verify `speakingSpeed` and `initiator` defaults and persistence.
   - `PersonaService.test.ts`: Verify `buildSystemInstruction` injects pacing instructions based on `speakingSpeed` (`auto` at N5 vs N1 vs manual override) and `initiator` (`ai_first` vs `user_first`).
   - `EvaluationService.test.ts`: Verify `generateSpeakingSuggestions` requests tiered (`easy` vs `natural`) bite-sized hints.
   - `LivePartnerView.test.tsx`: Verify UI buttons for speed and initiator, badge rendering on hints, and smart turn-locking logic.
2. **Manual / Live Verification**:
   - Run `npm run test` and confirm all tests pass.
   - Run `npm run build` and ensure zero TypeScript/bundler errors.
