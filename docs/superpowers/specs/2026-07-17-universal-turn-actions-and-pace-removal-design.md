# Universal Turn Actions & Pace Selector Removal Design Specification

## Overview
This specification defines the architectural and UI changes to:
1. Remove the pace selector feature (`SpeakingSpeed`) completely from the application.
2. Enable instant, zero-latency Web Speech API (`SpeechSynthesis`) audio replay (`🔊 Listen`) across all AI replies, user replies, and speaking suggestion hints.
3. Provide on-demand, cached English translations (`🌐 Translate` / `🌐 English`) for all AI and user replies in the transcript.
4. Expand vocabulary extraction (`📖 Words` via `lookupTurnVocabulary`) so it works universally across AI replies, user replies, and speaking suggestion hints, including saving items directly to the Vocabulary Notebook.

---

## Section 1: Pace Selector Removal (`SpeakingSpeed` Cleanup)

### 1. Type & Context Cleanup (`src/types/index.ts` & `src/context/SettingsContext.tsx`)
- Remove `export type SpeakingSpeed = 'auto' | 'very_slow' | 'slow' | 'normal';` from `src/types/index.ts`.
- Remove `speakingSpeed: SpeakingSpeed;` and `setSpeakingSpeed: (speed: SpeakingSpeed) => void;` from `SettingsContextState` and `SettingsContext.tsx`.
- Remove the `localStorage.getItem('nihongo_speaking_speed')` initialization and setter effect from `SettingsProvider`.

### 2. Persona & Client Cleanup (`src/services/persona/PersonaService.ts` & `src/services/ai/LiveAudioClient.ts`)
- In `src/services/persona/PersonaService.ts`:
  - Remove `speakingSpeed: SpeakingSpeed = 'auto'` from `buildSystemInstruction` method signature.
  - Remove the `SPEAKING PACE & CADENCE` prompt generation logic.
- In `src/services/ai/LiveAudioClient.ts`:
  - Remove `speakingSpeed: SpeakingSpeed = 'auto'` from `connect` method signature, and pass only the remaining arguments to `buildSystemInstruction`.

### 3. UI Cleanup (`src/components/partner/LivePartnerView.tsx`)
- Remove the `⏱️ Pace: ...` button from the Live Studio top toolbar (`LivePartnerView.tsx`) and from the slide-out transcript drawer.

---

## Section 2: Instant Audio Replay (`SpeechSynthesisService`)

### 1. Service Definition (`src/services/audio/SpeechSynthesisService.ts`)
Create a dedicated Web Speech API service wrapping `window.speechSynthesis`:

```typescript
export class SpeechSynthesisService {
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  private static activeId: string | null = null;

  static speak(
    id: string,
    text: string,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onError) onError(new Error('SpeechSynthesis not supported in this browser.'));
      return;
    }

    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.95; // Slightly natural conversational pace

    utterance.onend = () => {
      if (this.activeId === id) {
        this.activeId = null;
        this.activeUtterance = null;
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (e) => {
      if (this.activeId === id) {
        this.activeId = null;
        this.activeUtterance = null;
        if (onError) onError(e);
      }
    };

    this.activeId = id;
    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  static cancel(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.activeId = null;
    this.activeUtterance = null;
  }

  static getActiveId(): string | null {
    return this.activeId;
  }
}
```

### 2. UI Integration
- In `LivePartnerView.tsx`, track `playingId: string | null` in state.
- When `[🔊 Listen]` is clicked on any AI turn, user turn, or hint:
  - If `playingId === itemId`, call `SpeechSynthesisService.cancel()` and set `playingId(null)`.
  - Otherwise, call `SpeechSynthesisService.speak(itemId, text, () => setPlayingId(null), () => setPlayingId(null))` and set `playingId(itemId)`.
- When `playingId === itemId`, the button displays `[⏹️ Stop]` with a pulsing indicator.

---

## Section 3: On-Demand Turn Translations (`generateTurnTranslation`)

### 1. Service Method (`src/services/ai/EvaluationService.ts`)
Add a cached turn translation generator to `EvaluationService`:

```typescript
  private static translationCache = new Map<string, string>();
  private static inFlightTranslations = new Map<string, Promise<string>>();

  async generateTurnTranslation(text: string, apiKey: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    if (EvaluationService.translationCache.has(trimmed)) {
      return EvaluationService.translationCache.get(trimmed)!;
    }

    if (EvaluationService.inFlightTranslations.has(trimmed)) {
      return EvaluationService.inFlightTranslations.get(trimmed)!;
    }

    const ai = this.getClient(apiKey);
    const prompt = `Provide a concise, natural English translation for the following Japanese conversational utterance. Output ONLY the English translation text without quotes or introductory commentary.
Japanese: "${trimmed}"`;

    const promise = (async () => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: prompt,
        });
        const result = response.text ? response.text.trim() : 'Translation unavailable.';
        EvaluationService.translationCache.set(trimmed, result);
        return result;
      } catch (e) {
        console.error('Failed to generate turn translation:', e);
        throw e;
      } finally {
        EvaluationService.inFlightTranslations.delete(trimmed);
      }
    })();

    EvaluationService.inFlightTranslations.set(trimmed, promise);
    return promise;
  }
```

### 2. UI Integration (`LivePartnerView.tsx`)
- State: `turnTranslations: Record<string, string>` and `loadingTranslationIds: Set<string>`, plus `expandedTranslationIds: Set<string>`.
- In the compact action bar for AI turns and user turns (`ConversationTurn`):
  - Add button `[🌐 English]` (or `[Hide English]` when expanded).
  - When clicked:
    - If `!isOnline`, display status error or alert: `"You are offline. Translation requires an active internet connection."`
    - If `turnTranslations[t.id]` exists, toggle `expandedTranslationIds.has(t.id)`.
    - If not yet fetched, add `t.id` to `loadingTranslationIds`, call `evalService.generateTurnTranslation(t.text, apiKey)`, store result in `turnTranslations`, add `t.id` to `expandedTranslationIds`, and remove from `loadingTranslationIds`.
  - When `expandedTranslationIds.has(t.id)` is true, render `<p className="mt-1.5 text-xs text-indigo-200/90 italic bg-indigo-950/30 px-2.5 py-1.5 rounded-md border border-indigo-500/20">{turnTranslations[t.id]}</p>`.
  - *(Note: Speaking suggestions (`SpeakingSuggestion`) already render `item.english` directly on their cards.)*

---

## Section 4: Universal Vocabulary Lookup (`📖 Words`)

### 1. Expansion to User Turns (`renderTurnVocabularyUI`)
In `LivePartnerView.tsx`, inside `renderTurnVocabularyUI(t: { id: string; speaker: string; text: string })`:
- Remove `if (t.speaker !== 'ai' || !t.text.trim()) return null;` and replace with:
  ```tsx
  if (!t.text.trim()) return null;
  ```
- This immediately allows clicking `[📖 Words]` on **both AI turns and user turns**, extracting 3-5 vocabulary words and enabling the `[Add to Notebook]` button!

### 2. Expansion to Speaking Suggestions (Hints)
Create a helper or expand `renderTurnVocabularyUI` so it can also accept a hint item (`{ id: string; text: string }`):
- For each hint card (`item` in `suggestions`), assign a stable UI lookup key: `const hintKey = 'hint-' + idx + '-' + item.japanese.slice(0, 8);`.
- In the hint card action bar (`[🔊 Listen] [📖 Words]`), clicking `[📖 Words]` invokes `handleToggleTurnVocab(hintKey, item.japanese)`.
- Inside the hint card layout, render `renderTurnVocabularyUI({ id: hintKey, speaker: 'hint', text: item.japanese })` right below `item.english` and `item.tip`.
- Clicking `[Add to Notebook]` on any extracted hint word saves it to `StorageRepository` (`category: 'vocabulary'`) exactly like AI and user turn vocabulary!

---

## UI Action Bar Layout Summary

### AI Replies & User Replies (`ConversationTurn` in Studio HUD & Drawer)
```tsx
<div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/40 flex-wrap">
  {/* Listen Button (Works Offline) */}
  <button onClick={() => handleToggleListen(t.id, t.text)} className="...">
    <Volume2 className="w-3.5 h-3.5" />
    {playingId === t.id ? 'Stop' : 'Listen'}
  </button>

  {/* Translate Button (Guarded by isOnline) */}
  <button onClick={() => handleToggleTranslate(t.id, t.text)} disabled={isLoadingTranslation || !isOnline} className="...">
    <Globe className="w-3.5 h-3.5" />
    {isLoadingTranslation ? 'Translating...' : isTranslatedExpanded ? 'Hide English' : 'English'}
  </button>

  {/* Words Button (Guarded by isOnline) */}
  <button onClick={() => handleToggleTurnVocab(t.id, t.text)} disabled={isLoadingVocab || !isOnline} className="...">
    <BookOpen className="w-3.5 h-3.5" />
    {isLoadingVocab ? 'Loading Words...' : isVocabExpanded ? 'Hide Words' : 'Words'}
  </button>
</div>
{/* Render Expanded Translation & Vocabulary Panels below */}
```

### Speaking Suggestions (Hints Panel)
```tsx
<div className="flex items-center justify-between gap-2 border-t border-slate-800/60 pt-2 mt-2">
  <div className="flex items-center gap-2">
    <button onClick={() => handleToggleListen(hintKey, item.japanese)} className="...">
      <Volume2 className="w-3.5 h-3.5" />
      {playingId === hintKey ? 'Stop' : 'Listen'}
    </button>
    <button onClick={() => handleToggleTurnVocab(hintKey, item.japanese)} disabled={isLoadingVocab || !isOnline} className="...">
      <BookOpen className="w-3.5 h-3.5" />
      {isLoadingVocab ? 'Loading Words...' : isVocabExpanded ? 'Hide Words' : 'Words'}
    </button>
  </div>
</div>
{/* Render Expanded Vocabulary Panel for Hint below */}
```

---

## Verification & Testing Plan
1. **Unit & Service Tests**:
   - `src/services/audio/SpeechSynthesisService.test.ts`: Verify `speak` initializes `SpeechSynthesisUtterance`, sets `ja-JP`, and calls `window.speechSynthesis.speak`, and `cancel` calls `window.speechSynthesis.cancel`.
   - `src/services/ai/EvaluationService.test.ts`: Verify `generateTurnTranslation` calls `generateContent`, caches duplicate requests, and returns clean English strings.
   - `src/services/persona/PersonaService.test.ts` & `src/context/SettingsContext.test.tsx`: Verify all `SpeakingSpeed` parameters, state, and storage tests are cleanly removed or updated.
2. **Component Tests (`LivePartnerView.test.tsx`)**:
   - Verify that clicking `Listen` on a turn or hint invokes `SpeechSynthesisService.speak`.
   - Verify that clicking `English` on an AI or user turn fetches and displays the English translation.
   - Verify that clicking `Words` on a user turn or speaking hint fetches and displays vocabulary with `Add to Notebook`.
   - Verify that pace selectors are no longer rendered in the studio header or slide-out drawer.
3. **Full Regression Check**:
   - Run `npm test && npm run build` to confirm all 100+ tests pass with 0 TypeScript/build errors.
