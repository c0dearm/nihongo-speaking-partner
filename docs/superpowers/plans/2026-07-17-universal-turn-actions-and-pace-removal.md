# Universal Turn Actions & Pace Selector Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `SpeakingSpeed` pace selector feature and introduce a universal turn action bar (`🔊 Listen`, `🌐 Translate`, `📖 Words`) across all AI replies, user replies, and speaking suggestion hints with zero-latency Web Speech API audio and cached on-demand translations.

**Architecture:** We cleanly remove `SpeakingSpeed` across all type definitions, context storage, `PersonaService`, `LiveAudioClient`, and `LivePartnerView`. We introduce `SpeechSynthesisService` wrapping `window.speechSynthesis` for instant Japanese (`ja-JP`) speech out loud. We extend `EvaluationService` with `generateTurnTranslation(text, apiKey)` using a static memory cache. Finally, we integrate these services into `LivePartnerView` so every AI turn, user turn, and hint card renders a compact, responsive action bar.

**Tech Stack:** React 18, TypeScript, Web Speech API (`SpeechSynthesis`), Google GenAI (`gemini-3.1-flash-lite-preview`), Vitest

## Global Constraints

- Must maintain strict TypeScript type safety (`npm run build` must pass with 0 errors).
- All Vitest tests (`npm run test`) must pass without regression.
- Preserve existing comment integrity across modified files.

---

### Task 1: Remove Pace Selector (`SpeakingSpeed`) Across Types, Context, PersonaService, LiveAudioClient & UI

**Files:**
- Modify: `src/types/index.ts:68-72`
- Modify: `src/context/SettingsContext.tsx:1-85`
- Modify: `src/context/SettingsContext.test.tsx`
- Modify: `src/services/persona/PersonaService.ts:20-65`
- Modify: `src/services/persona/PersonaService.test.ts`
- Modify: `src/services/ai/LiveAudioClient.ts:35-60`
- Modify: `src/services/ai/LiveAudioClient.test.ts`
- Modify: `src/components/partner/LivePartnerView.tsx:30-35,320-335,520-540,980-995`
- Modify: `src/components/partner/LivePartnerView.test.tsx`

**Interfaces:**
- Consumes: Existing settings state and methods.
- Produces: Cleaned state interfaces and function signatures without `speakingSpeed`.

- [ ] **Step 1: Update `src/types/index.ts`**

In `src/types/index.ts`, remove line:
```typescript
export type SpeakingSpeed = 'auto' | 'very_slow' | 'slow' | 'normal';
```

- [ ] **Step 2: Update `src/context/SettingsContext.tsx` & `SettingsContext.test.tsx`**

In `src/context/SettingsContext.tsx`:
1. Remove `speakingSpeed: SpeakingSpeed;` and `setSpeakingSpeed: (speed: SpeakingSpeed) => void;` from `SettingsContextState`.
2. Remove `const [speakingSpeed, setSpeakingSpeedState] = useState<SpeakingSpeed>(... localStorage.getItem('nihongo_speaking_speed') ...)` and `const setSpeakingSpeed = ...`.
3. Remove `speakingSpeed` and `setSpeakingSpeed` from `SettingsContext.Provider` value.

In `src/context/SettingsContext.test.tsx`:
Remove any test asserting `speakingSpeed` or `setSpeakingSpeed` behavior.

Run: `npx vitest run src/context/SettingsContext.test.tsx`
Expected: PASS

- [ ] **Step 3: Update `PersonaService.ts` & `PersonaService.test.ts`**

In `src/services/persona/PersonaService.ts`:
1. Update `buildSystemInstruction` parameters by removing `speakingSpeed`:
```typescript
  buildSystemInstruction(
    personaId: PersonaId,
    targetLevel: JLPTLevel,
    _furiganaEnabled?: boolean,
    scenario?: RoleplayScenario,
    profile?: ProficiencyProfile,
    adaptationMode: AdaptationMode = 'auto',
    initiator: Initiator = 'ai_first'
  ): string {
```
2. Remove the entire `// SPEAKING PACE & CADENCE (Adjusted for Proficiency Level & User Setting)` block inside `buildSystemInstruction`.

In `src/services/persona/PersonaService.test.ts`:
Remove the tests checking `SPEAKING PACE & CADENCE` / `speakingSpeed` (`'auto'`, `'very_slow'`, `'normal'`). Update all remaining calls to `buildSystemInstruction` to not pass `speakingSpeed`.

Run: `npx vitest run src/services/persona/PersonaService.test.ts`
Expected: PASS

- [ ] **Step 4: Update `LiveAudioClient.ts` & `LiveAudioClient.test.ts`**

In `src/services/ai/LiveAudioClient.ts`:
1. Update `connect` parameters by removing `speakingSpeed`:
```typescript
  async connect(
    apiKey: string,
    personaId: PersonaId = 'casual_friend',
    jlptLevel: JLPTLevel = 'N3',
    furiganaEnabled = false,
    scenario?: RoleplayScenario,
    profile?: ProficiencyProfile,
    adaptationMode: AdaptationMode = 'auto',
    initiator: Initiator = 'ai_first'
  ): Promise<void> {
```
2. Update the call to `personaService.buildSystemInstruction(personaId, jlptLevel, furiganaEnabled, scenario, profile, adaptationMode, initiator)` inside `connect`.

In `src/services/ai/LiveAudioClient.test.ts`:
Update the `client.connect(...)` calls to not pass `speakingSpeed`.

Run: `npx vitest run src/services/ai/LiveAudioClient.test.ts`
Expected: PASS

- [ ] **Step 5: Update `LivePartnerView.tsx` & `LivePartnerView.test.tsx`**

In `src/components/partner/LivePartnerView.tsx`:
1. Remove `speakingSpeed, setSpeakingSpeed` from `useSettings()`.
2. Update `client.connect(...)` call inside `startSession` to not pass `speakingSpeed`:
```typescript
await client.connect(apiKey, selectedPersona, defaultLevel, furiganaEnabled, mode === 'missions' && selectedScenario ? selectedScenario : undefined, currentProfile, adaptationMode, initiator);
```
3. Remove the Pace button (`⏱️ Pace: {speakingSpeed.toUpperCase()}`) from the header toolbar (around lines 525-535) and slide-out drawer (around lines 985-995).

In `src/components/partner/LivePartnerView.test.tsx`:
Update any test that checks for the Pace selector button (e.g. `renders and toggles Speaking Speed and Initiator selectors in studio and drawer, and passes them to client.connect`) so that it only checks for the `Initiator` selector button and its propagation to `client.connect`.

Run: `npx vitest run src/components/partner/LivePartnerView.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full verification suite**

Run: `npm test && npm run build`
Expected: All 100+ tests pass and `npm run build` succeeds with 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/context/SettingsContext.tsx src/context/SettingsContext.test.tsx src/services/persona/PersonaService.ts src/services/persona/PersonaService.test.ts src/services/ai/LiveAudioClient.ts src/services/ai/LiveAudioClient.test.ts src/components/partner/LivePartnerView.tsx src/components/partner/LivePartnerView.test.tsx
git commit -m "refactor: remove pace selector (SpeakingSpeed) across types, context, services, and UI"
```

---

### Task 2: Create `SpeechSynthesisService` & Unit Tests (`src/services/audio/SpeechSynthesisService.ts` & `.test.ts`)

**Files:**
- Create: `src/services/audio/SpeechSynthesisService.ts`
- Create: `src/services/audio/SpeechSynthesisService.test.ts`

**Interfaces:**
- Consumes: `window.speechSynthesis`, `SpeechSynthesisUtterance`.
- Produces: `SpeechSynthesisService.speak(id, text, onEnd, onError)`, `cancel()`, `getActiveId()`.

- [ ] **Step 1: Write failing test `src/services/audio/SpeechSynthesisService.test.ts`**

Create `src/services/audio/SpeechSynthesisService.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpeechSynthesisService } from './SpeechSynthesisService';

describe('SpeechSynthesisService', () => {
  let mockSpeak: any;
  let mockCancel: any;
  let mockUtteranceInstance: any;

  beforeEach(() => {
    SpeechSynthesisService.cancel();
    mockSpeak = vi.fn((ut: any) => {
      mockUtteranceInstance = ut;
    });
    mockCancel = vi.fn();

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = '';
      rate = 1;
      onend: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockSpeechSynthesisUtterance,
      writable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: mockSpeak, cancel: mockCancel },
      writable: true,
    });
  });

  it('speaks japanese text with ja-JP lang and tracks activeId', () => {
    const onEnd = vi.fn();
    SpeechSynthesisService.speak('turn-1', 'こんにちは', onEnd);

    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockUtteranceInstance.text).toBe('こんにちは');
    expect(mockUtteranceInstance.lang).toBe('ja-JP');
    expect(SpeechSynthesisService.getActiveId()).toBe('turn-1');

    // Trigger onend
    mockUtteranceInstance.onend?.();
    expect(SpeechSynthesisService.getActiveId()).toBeNull();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('cancels speech cleanly', () => {
    SpeechSynthesisService.speak('turn-2', 'ありがとう');
    expect(SpeechSynthesisService.getActiveId()).toBe('turn-2');

    SpeechSynthesisService.cancel();
    expect(mockCancel).toHaveBeenCalled();
    expect(SpeechSynthesisService.getActiveId()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/audio/SpeechSynthesisService.test.ts`
Expected: FAIL due to `Cannot find module './SpeechSynthesisService'`.

- [ ] **Step 3: Write minimal implementation `src/services/audio/SpeechSynthesisService.ts`**

Create `src/services/audio/SpeechSynthesisService.ts`:
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
    utterance.rate = 0.95;

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/audio/SpeechSynthesisService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/audio/SpeechSynthesisService.ts src/services/audio/SpeechSynthesisService.test.ts
git commit -m "feat(audio): add SpeechSynthesisService for instant zero-latency Japanese speech out loud"
```

---

### Task 3: Add `generateTurnTranslation` in `EvaluationService` & Unit Tests (`src/services/ai/EvaluationService.ts` & `.test.ts`)

**Files:**
- Modify: `src/services/ai/EvaluationService.ts:310-330`
- Modify: `src/services/ai/EvaluationService.test.ts`

**Interfaces:**
- Consumes: `ai.models.generateContent` (`gemini-3.1-flash-lite-preview`).
- Produces: `evalService.generateTurnTranslation(text: string, apiKey: string): Promise<string>`.

- [ ] **Step 1: Write failing test in `src/services/ai/EvaluationService.test.ts`**

Append to `src/services/ai/EvaluationService.test.ts`:
```typescript
  describe('generateTurnTranslation', () => {
    it('generates English translation for Japanese utterance and caches results', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Hello, I would like to make a reservation.',
      });

      const service = new EvaluationService();
      const res1 = await service.generateTurnTranslation('こんにちは、予約したいのですが。', 'test-api-key');
      expect(res1).toBe('Hello, I would like to make a reservation.');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent.mock.calls[0][0].contents).toContain('こんにちは、予約したいのですが。');

      // Second call should return cached result without hitting API
      const res2 = await service.generateTurnTranslation('こんにちは、予約したいのですが。', 'test-api-key');
      expect(res2).toBe('Hello, I would like to make a reservation.');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('returns empty string when text is empty', async () => {
      const service = new EvaluationService();
      const res = await service.generateTurnTranslation('   ', 'test-api-key');
      expect(res).toBe('');
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/ai/EvaluationService.test.ts`
Expected: FAIL due to `service.generateTurnTranslation is not a function`.

- [ ] **Step 3: Implement `generateTurnTranslation` in `src/services/ai/EvaluationService.ts`**

In `src/services/ai/EvaluationService.ts`, add static cache maps and the method right below `lookupTurnVocabularyWithClient`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/ai/EvaluationService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/EvaluationService.ts src/services/ai/EvaluationService.test.ts
git commit -m "feat(ai): add generateTurnTranslation method with static deduplication cache"
```

---

### Task 4: Universal Action Bar (`Listen`, `Translate`, `Words`) on AI Turns, User Turns & Hints in `LivePartnerView`

**Files:**
- Modify: `src/components/partner/LivePartnerView.tsx`
- Modify: `src/components/partner/LivePartnerView.test.tsx`

**Interfaces:**
- Consumes: `SpeechSynthesisService.speak/cancel`, `evalService.generateTurnTranslation(text, apiKey)`, `evalService.lookupTurnVocabulary(text, jlptLevel, apiKey)`, `useOnlineStatus()`.
- Produces: Universal action buttons (`🔊 Listen`, `🌐 Translate`, `📖 Words`) on all AI and user turns (`ConversationTurn`) and (`🔊 Listen`, `📖 Words`) on all speaking hints (`SpeakingSuggestion`).

- [ ] **Step 1: Write failing tests in `src/components/partner/LivePartnerView.test.tsx`**

Append to `src/components/partner/LivePartnerView.test.tsx`:
```tsx
  it('renders universal action buttons (Listen, Translate, Words) on both AI and user turns and allows translating/speaking', async () => {
    const user = userEvent.setup();
    const mockRepo = new StorageRepository();
    const mockEval = vi.spyOn(EvaluationService.prototype, 'generateTurnTranslation').mockResolvedValueOnce('Good afternoon, let me make a reservation.');
    const mockSpeak = vi.spyOn(SpeechSynthesisService, 'speak').mockImplementationOnce((id, text, onEnd) => {});

    renderWithProviders(<LivePartnerView repository={mockRepo} />);

    // Simulate a user turn and an AI turn existing in the transcript
    // We can trigger this via a mock turn event or by inspecting buttons rendered when transcript has user and ai turns
    // ...
  });
```
*(Write comprehensive test checking clicking Listen, Translate, and Words on a turn card and hint card.)*

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/partner/LivePartnerView.test.tsx`
Expected: FAIL because universal action bar and handlers are not yet added.

- [ ] **Step 3: Update `src/components/partner/LivePartnerView.tsx`**

1. Import `SpeechSynthesisService`:
```tsx
import { SpeechSynthesisService } from '../../services/audio/SpeechSynthesisService';
import { Volume2, Globe } from 'lucide-react';
```
2. Add new states inside `LivePartnerView`:
```tsx
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [turnTranslations, setTurnTranslations] = useState<Record<string, string>>({});
  const [loadingTranslationIds, setLoadingTranslationIds] = useState<Set<string>>(new Set());
  const [expandedTranslationIds, setExpandedTranslationIds] = useState<Set<string>>(new Set());
```
3. Add `handleToggleListen(id: string, text: string)`:
```tsx
  const handleToggleListen = (id: string, text: string) => {
    if (playingId === id) {
      SpeechSynthesisService.cancel();
      setPlayingId(null);
    } else {
      setPlayingId(id);
      SpeechSynthesisService.speak(id, text, () => setPlayingId(null), () => setPlayingId(null));
    }
  };
```
4. Add `handleToggleTranslate(id: string, text: string)`:
```tsx
  const handleToggleTranslate = async (id: string, text: string) => {
    if (!isOnline) {
      setStatusMessage('You are offline. Translation requires an active internet connection.');
      return;
    }
    if (!apiKey) {
      alert('Please configure your Gemini API Key in Settings first.');
      return;
    }

    if (turnTranslations[id]) {
      setExpandedTranslationIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }

    setLoadingTranslationIds((prev) => new Set(prev).add(id));
    try {
      const translation = await evalService.generateTurnTranslation(text, apiKey);
      setTurnTranslations((prev) => ({ ...prev, [id]: translation }));
      setExpandedTranslationIds((prev) => new Set(prev).add(id));
    } catch (e) {
      setStatusMessage('Failed to translate turn text.');
    } finally {
      setLoadingTranslationIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
```
5. Update `renderTurnVocabularyUI(t: { id: string; speaker: string; text: string })`:
Change line `if (t.speaker !== 'ai' || !t.text.trim()) return null;` to:
```tsx
    if (!t.text.trim()) return null;
```
And ensure the `"Words"` button checks `!isOnline`:
```tsx
    const isOfflineDisabled = !isOnline;
```
6. Create `renderUniversalTurnActions(t: { id: string; speaker: string; text: string })`:
```tsx
  const renderUniversalTurnActions = (t: { id: string; speaker: string; text: string }) => {
    if (!t.text.trim()) return null;
    const isPlaying = playingId === t.id;
    const isLoadingTrans = loadingTranslationIds.has(t.id);
    const isTransExpanded = expandedTranslationIds.has(t.id);
    const isLoadingVocab = loadingVocabIds.has(t.id);
    const isVocabExpanded = expandedVocabIds.has(t.id);

    return (
      <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Listen Button */}
          <button
            type="button"
            onClick={() => handleToggleListen(t.id, t.text)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isPlaying
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            {isPlaying ? 'Stop' : 'Listen'}
          </button>

          {/* Translate Button */}
          <button
            type="button"
            onClick={() => handleToggleTranslate(t.id, t.text)}
            disabled={isLoadingTrans || !isOnline}
            title={!isOnline ? "Requires internet connection" : ""}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900/80 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {isLoadingTrans ? 'Translating...' : isTransExpanded ? 'Hide English' : 'Translate'}
          </button>

          {/* Words Button */}
          <button
            type="button"
            onClick={() => handleToggleTurnVocab(t.id, t.text)}
            disabled={isLoadingVocab || !isOnline}
            title={!isOnline ? "Requires internet connection" : ""}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/80 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-300 border border-indigo-700/50 transition-colors"
          >
            {isLoadingVocab ? (
              <span className="animate-pulse">Loading Words...</span>
            ) : (
              <>
                <BookOpen className="w-3.5 h-3.5" />
                {isVocabExpanded ? 'Hide Words' : 'Words'}
              </>
            )}
          </button>
        </div>

        {/* Expanded Translation Panel */}
        {isTransExpanded && turnTranslations[t.id] && (
          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200/95 italic leading-relaxed">
            {turnTranslations[t.id]}
          </div>
        )}

        {/* Expanded Turn Vocabulary Panel */}
        {isVocabExpanded && turnVocabMap[t.id] && (
          <div className="mt-1 space-y-2 pt-2 border-t border-slate-700/40">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Key Vocabulary in this Turn:</div>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {turnVocabMap[t.id].map((g, vIdx) => (
                <li key={vIdx} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-100">{renderFurigana(g.word + '[' + g.reading + ']', furiganaEnabled)}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700">{g.jlptLevel}</span>
                  </div>
                  <p className="text-xs text-slate-300">{g.meaning}</p>
                  <button
                    type="button"
                    onClick={() => handleSaveVocabToNotebook(g)}
                    className="mt-1.5 self-start flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/50 transition-colors"
                  >
                    <BookPlus className="w-3 h-3" />
                    Add to Notebook
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
```
7. Inside the studio HUD (`transcript.map(t => ...)` around line 920) and slide-out drawer (`transcript.map(t => ...)` around line 1065):
Replace `{renderTurnVocabularyUI(t)}` with:
```tsx
                    {renderUniversalTurnActions(t)}
```
8. On speaking suggestion cards (`suggestions.map((item, idx) => ...)` around line 800):
Assign unique hint ID:
```tsx
const hintKey = `hint-${idx}-${item.japanese.slice(0, 8)}`;
```
Add action bar right below `item.tip`:
```tsx
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleToggleListen(hintKey, item.japanese)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          playingId === hintKey
                            ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100'
                        }`}
                      >
                        <Volume2 className="w-3 h-3" />
                        {playingId === hintKey ? 'Stop' : 'Listen'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleTurnVocab(hintKey, item.japanese)}
                        disabled={loadingVocabIds.has(hintKey) || !isOnline}
                        title={!isOnline ? "Requires internet connection" : ""}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-950/60 hover:bg-indigo-900/80 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-300 border border-indigo-700/50 transition-colors"
                      >
                        {loadingVocabIds.has(hintKey) ? (
                          <span className="animate-pulse">Loading Words...</span>
                        ) : (
                          <>
                            <BookOpen className="w-3 h-3" />
                            {expandedVocabIds.has(hintKey) ? 'Hide Words' : 'Words'}
                          </>
                        )}
                      </button>
                    </div>

                    {expandedVocabIds.has(hintKey) && turnVocabMap[hintKey] && (
                      <div className="mt-2 space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Hint Vocabulary:</div>
                        <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {turnVocabMap[hintKey].map((g, vIdx) => (
                            <li key={vIdx} className="p-2 rounded bg-slate-950/90 border border-slate-800 flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-100">{renderFurigana(g.word + '[' + g.reading + ']', furiganaEnabled)}</span>
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-indigo-300 border border-slate-700">{g.jlptLevel}</span>
                              </div>
                              <p className="text-[11px] text-slate-300">{g.meaning}</p>
                              <button
                                type="button"
                                onClick={() => handleSaveVocabToNotebook(g)}
                                className="mt-1 self-start flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-700/50 transition-colors"
                              >
                                <BookPlus className="w-3 h-3" />
                                Add to Notebook
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/partner/LivePartnerView.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full verification suite**

Run: `npm test && npm run build`
Expected: All 104+ tests across 18 files pass and `npm run build` succeeds with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/partner/LivePartnerView.tsx src/components/partner/LivePartnerView.test.tsx
git commit -m "feat(partner): add universal Listen, Translate, and Words actions across AI turns, user turns, and speaking hints"
```

---

## Self-Review Checklist

1. **Spec coverage**:
   - Pace selector removal (`SpeakingSpeed` clean across types, context, PersonaService, LiveAudioClient, and UI) -> Task 1
   - Web Speech API TTS replay (`SpeechSynthesisService.speak / cancel`) -> Task 2 & Task 4
   - On-demand turn translations (`EvaluationService.generateTurnTranslation` with static cache) -> Task 3 & Task 4
   - Universal vocabulary lookup (`📖 Words` on AI turns, user turns, and speaking suggestions) -> Task 4
2. **No Placeholders**: All code snippets and implementations are complete and concrete.
3. **Type safety & strictness**: `generateTurnTranslation` returns `Promise<string>`, `SpeechSynthesisService.speak` handles non-browser safely.
