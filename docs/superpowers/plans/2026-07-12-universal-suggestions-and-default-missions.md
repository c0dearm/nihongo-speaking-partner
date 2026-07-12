# Universal Speaking Suggestions & Primary Default Missions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make **Goal-Oriented Roleplay Missions** the primary default tab when opening the Studio (`LivePartnerView.tsx`), and enable **Speaking Suggestions (`EvaluationService.generateSpeakingSuggestions`)** universally across both Roleplay Missions and Free Open-Ended Chat.

**Architecture:** We update `EvaluationService.generateSpeakingSuggestions` and `generateSpeakingSuggestionsWithClient` to accept an optional `scenario?: RoleplayScenario` and `personaId: PersonaId = 'casual_friend'`. When `scenario` is absent (Free Chat), it constructs a prompt tailored to the active AI persona and general conversational flow. In `LivePartnerView.tsx`, we set the initial mode to `'missions'`, reorder the header tabs so Roleplay Missions comes first, and remove the `mode === 'missions' && selectedScenario` guard on the suggestions panel and turn triggers so suggestions work seamlessly across both modes.

**Tech Stack:** TypeScript (`strict: true`), React 18, `@google/genai` (Gemini 3.5 Flash for structured suggestions), Vitest + React Testing Library.

## Global Constraints

- Must be completely local-first in the browser (`IndexedDB` / `localStorage`) with zero external database dependencies.
- All code must be strictly typed TypeScript (`strict: true`) with complete unit test coverage (`vitest`).
- No placeholders (`TODO`, `TBD`, `implement later`); complete code required in all steps.
- Maintain $100\%$ pass rate across the full test suite (`npm test`) and zero errors on production build (`npm run build`).

---

### Task 1: Universal Speaking Suggestions Engine (`EvaluationService.ts`)

**Files:**
- Modify: `src/services/ai/EvaluationService.ts`
- Modify: `src/services/ai/EvaluationService.test.ts`

**Interfaces:**
- Consumes: `ConversationTurn`, `JLPTLevel`, `RoleplayScenario`, `PersonaId`, `PersonaService`
- Produces: `generateSpeakingSuggestions(transcript: ConversationTurn[], targetLevel: JLPTLevel, apiKey: string, scenario?: RoleplayScenario, personaId?: PersonaId): Promise<SpeakingSuggestion[]>`, `generateSpeakingSuggestionsWithClient(ai: GoogleGenAI, transcript: ConversationTurn[], targetLevel: JLPTLevel, scenario?: RoleplayScenario, personaId?: PersonaId): Promise<SpeakingSuggestion[]>`

- [ ] **Step 1: Write failing test in `EvaluationService.test.ts`**

Append to `src/services/ai/EvaluationService.test.ts`:

```typescript
  it('generateSpeakingSuggestionsWithClient constructs a free-chat prompt when scenario is undefined', async () => {
    const service = new EvaluationService();
    const mockSuggestionsJson = JSON.stringify([
      {
        japanese: '最近、どんな映画を見ましたか？',
        furigana: '最近[さいきん]、どんな映画[えいが]を見[み]ましたか？',
        english: 'What kind of movies have you seen recently?',
        tip: 'Ask a natural question to keep the casual chat going.',
      },
    ]);

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: () => mockSuggestionsJson,
    });

    const mockAiClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const result = await service.generateSpeakingSuggestionsWithClient(
      mockAiClient as any,
      [{ id: 't1', speaker: 'ai', text: 'こんにちは！元気ですか？', timestamp: 1000 }],
      'N4',
      undefined,
      'casual_friend'
    );

    expect(result).toHaveLength(1);
    expect(result[0].japanese).toBe('最近、どんな映画を見ましたか？');
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-flash',
        contents: expect.stringContaining('Conversation Type: Free open-ended casual conversation on everyday topics.'),
      })
    );
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/services/ai/EvaluationService.test.ts`  
Expected output: FAIL (`Expected prompt to contain "Conversation Type: Free open-ended casual conversation on everyday topics."` or signature mismatch)

- [ ] **Step 3: Update `EvaluationService.ts`**

Modify `src/services/ai/EvaluationService.ts` to import `PersonaId` and `PersonaService`, instantiate `private personaService = new PersonaService();`, and update the two suggestion methods:

```typescript
import { GoogleGenAI, Type } from '@google/genai';
import { SessionReport, JLPTLevel, ConversationTurn, RoleplayScenario, SpeakingSuggestion, PersonaId } from '../../types';
import { PersonaService } from '../persona/PersonaService';

export class EvaluationService {
  private personaService = new PersonaService();
  // ... existing fields ...

  getKickstartSuggestions(): SpeakingSuggestion[] {
    return [
      {
        japanese: 'すみません、お話ししたいことがあるのですが。',
        furigana: 'すみません、お話[はな]ししたいことがあるのですが。',
        english: 'Excuse me, I have something I would like to talk to you about.',
        tip: 'A polite, versatile conversation starter to initiate your roleplay mission or conversation.',
      },
      {
        japanese: 'こんにちは。よろしくお願いします。',
        furigana: 'こんにちは。よろしくお願[ねが]いします。',
        english: 'Hello. Thank you in advance / nice to meet you.',
        tip: 'A standard Japanese greeting to open the interaction.',
      },
    ];
  }

  async generateSpeakingSuggestions(
    transcript: ConversationTurn[],
    targetLevel: JLPTLevel,
    apiKey: string,
    scenario?: RoleplayScenario,
    personaId: PersonaId = 'casual_friend'
  ): Promise<SpeakingSuggestion[]> {
    if (!apiKey || apiKey === 'test-api-key') {
      if (transcript.length === 0) {
        return this.getKickstartSuggestions();
      }
      return [
        {
          japanese: 'すみません、土曜日の夜７時に５人で予約したいのですが。',
          furigana: 'すみません、土曜日[どようび]の夜[よる]７時[しちじ]に５人[ごにん]で予約[よやく]したいのですが。',
          english: 'Excuse me, I would like to make a reservation for 5 people on Saturday evening at 7.',
          tip: 'A polite, natural sentence using ~たいのですが to clearly state your reservation request.',
        },
        {
          japanese: '土曜日の午後７時は空いていますか？田中と申します。',
          furigana: '土曜日[どようび]の午後[ごご]７時[しちじ]は空[あ]いていますか？田中[たなか]と申[もう]します。',
          english: 'Do you have availability for Saturday at 7 PM? My name is Tanaka.',
          tip: 'Ask about table availability directly while politely stating your last name with ~と申します.',
        },
      ];
    }

    try {
      const ai = this.getClient(apiKey);
      return await this.generateSpeakingSuggestionsWithClient(ai, transcript, targetLevel, scenario, personaId);
    } catch (err) {
      console.error('[EvaluationService] Failed to generate speaking suggestions:', err);
      return transcript.length === 0 ? this.getKickstartSuggestions() : [];
    }
  }

  async generateSpeakingSuggestionsWithClient(
    ai: GoogleGenAI,
    transcript: ConversationTurn[],
    targetLevel: JLPTLevel,
    scenario?: RoleplayScenario,
    personaId: PersonaId = 'casual_friend'
  ): Promise<SpeakingSuggestion[]> {
    try {
      const recentTurns = transcript.slice(-6).map(t => `${t.speaker === 'user' ? 'User (Student)' : 'AI Partner'}: ${t.text}`).join('\n');

      let prompt = '';
      if (scenario) {
        prompt = `You are an expert Japanese speaking coach assisting a student participating in a roleplay conversation.
User Role: ${scenario.userRole}
AI Partner Role: ${scenario.aiRole}
User's Secret Goal / Mission Objective: ${scenario.goalDescription}
Target Japanese Level: ${targetLevel}

Recent Conversation History:
${recentTurns || 'Conversation is just starting. The user needs to initiate the interaction or make their first statement.'}

Provide exactly 2 to 3 natural, highly authentic Japanese response options that the user could speak next to progress toward their secret goal. The suggestions should match ${targetLevel} complexity. Include full bracketed or ruby furigana (e.g. 予約[よやく]), clean English translations, and a concise strategic tip.`;
      } else {
        const persona = this.personaService.getPersona(personaId);
        prompt = `You are an expert Japanese speaking coach assisting a student participating in a free open-ended Japanese conversation.
AI Partner Persona: ${persona.name} (${persona.roleDescription})
Conversation Type: Free open-ended casual conversation on everyday topics.
Target Japanese Level: ${targetLevel}

Recent Conversation History:
${recentTurns || 'Conversation is just starting. The user needs to initiate the interaction or make their first statement.'}

Provide exactly 2 to 3 natural, highly authentic Japanese response options that the user could speak next to smoothly continue or steer the conversational flow. The suggestions should match ${targetLevel} complexity. Include full bracketed or ruby furigana (e.g. 映画[えいが]), clean English translations, and a concise strategic tip.`;
      }

      const responseSchema = {
        type: Type.ARRAY,
        description: 'List of 2 to 3 speaking suggestions for the user turn',
        items: {
          type: Type.OBJECT,
          properties: {
            japanese: { type: Type.STRING, description: 'Authentic Japanese response text in kanji/kana' },
            furigana: { type: Type.STRING, description: 'Japanese response with full bracketed furigana above kanji, e.g. 予約[よやく]したいのですが' },
            english: { type: Type.STRING, description: 'English translation of the suggested phrase' },
            tip: { type: Type.STRING, description: 'Strategic tip explaining how this phrase helps accomplish the goal or conversation flow' },
          },
          required: ['japanese', 'furigana', 'english', 'tip'],
        },
      };

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Suggestions request timed out after 12000ms')), 12000)
        ),
      ]);

      const jsonText = typeof response.text === 'function' ? (response.text as () => string)() : response.text;
      if (!jsonText) return transcript.length === 0 ? this.getKickstartSuggestions() : [];
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : (transcript.length === 0 ? this.getKickstartSuggestions() : []);
    } catch (err) {
      console.error('[EvaluationService] Failed to generate speaking suggestions:', err);
      return transcript.length === 0 ? this.getKickstartSuggestions() : [];
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/services/ai/EvaluationService.test.ts`  
Expected output: PASS across all 11 tests

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/EvaluationService.ts src/services/ai/EvaluationService.test.ts
git commit -m "feat(ai): enable universal speaking suggestions across both roleplay missions and free open-ended chat"
```

---

### Task 2: Studio Default Mode & Universal Suggestions Panel (`LivePartnerView.tsx`)

**Files:**
- Modify: `src/components/partner/LivePartnerView.tsx`
- Modify: `src/components/partner/LivePartnerView.test.tsx`

**Interfaces:**
- Consumes: `EvaluationService.generateSpeakingSuggestions(transcript, defaultLevel, apiKey, scenario?, personaId?)`
- Produces: `LivePartnerView` with default state `'missions'`, reordered header buttons, and universal suggestion rendering across both `'missions'` and `'free'` modes

- [ ] **Step 1: Write failing tests in `LivePartnerView.test.tsx`**

Append to `src/components/partner/LivePartnerView.test.tsx` and update initial assertions if needed:

```typescript
  it('defaults to Goal-Oriented Roleplay Missions upon opening the studio', () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    // Should render mission selection deck by default
    expect(screen.getByText(/Reserving an Izakaya Table/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Goal-Oriented Roleplay Missions/i })).toHaveClass('bg-indigo-600');
  });

  it('renders speaking suggestions in Free Open-Ended Chat mode when turn completes', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    // Switch to Free Chat mode
    fireEvent.click(screen.getByRole('button', { name: /Free Open-Ended Chat/i }));
    fireEvent.click(screen.getByText(/Start Free Open-Ended Chat/i));

    await waitFor(() => {
      expect(turnCallback).toBeDefined();
    });

    act(() => {
      turnCallback?.({ id: 'free-turn-1', speaker: 'ai', text: 'こんにちは！何について話しましょうか？' });
      turnCallback?.({ id: 'free-turn-1', speaker: 'ai', text: 'こんにちは！何について話しましょうか？', turnComplete: true });
    });

    await waitFor(() => {
      expect(screen.getByText(/What You Could Say Next/i)).toBeInTheDocument();
      expect(screen.getByText(/Excuse me, I would like to make a reservation/i)).toBeInTheDocument(); // mock suggestion string
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/components/partner/LivePartnerView.test.tsx`  
Expected output: FAIL (`Unable to find an element with the text: /Reserving an Izakaya Table/i` or similar because default was `'free'`)

- [ ] **Step 3: Update `LivePartnerView.tsx`**

In `src/components/partner/LivePartnerView.tsx`:

1. Change initial state of `mode` to `'missions'`:
   ```typescript
   const [mode, setMode] = useState<'free' | 'missions'>('missions');
   ```

2. Reorder the tab buttons in the studio header (`Missions` first, `Free` second):
   ```tsx
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              disabled={isConnected}
              onClick={() => setMode('missions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'missions'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-4 h-4" />
              Goal-Oriented Roleplay Missions
            </button>
            <button
              type="button"
              disabled={isConnected}
              onClick={() => setMode('free')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'free'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Free Open-Ended Chat
            </button>
          </div>
   ```

3. Make suggestion fetching universal across both modes (`mode === 'free'` or `selectedScenario`) in `useEffect`, `startSession`, and `onTurnEvent`:
   * In `useEffect` for auto mode toggle when connected:
     ```typescript
     if (
       suggestionsMode === 'auto' &&
       prevMode !== 'auto' &&
       isConnected &&
       (mode === 'free' || Boolean(selectedScenario)) &&
       suggestions.length === 0 &&
       !isLoadingSuggestions
     ) {
       // ...
       evalService
         .generateSpeakingSuggestions(transcript, defaultLevel, apiKey, mode === 'missions' ? selectedScenario : undefined, selectedPersona)
         .then((s) => setSuggestions(s))
         .finally(() => setIsLoadingSuggestions(false));
     }
     ```
   * In `startSession`:
     ```typescript
     if ((mode === 'free' || Boolean(selectedScenario)) && suggestionsMode === 'auto') {
       setIsLoadingSuggestions(true);
       evalService.generateSpeakingSuggestions([], defaultLevel, apiKey, mode === 'missions' ? selectedScenario : undefined, selectedPersona)
         .then(s => setSuggestions(s))
         .finally(() => setIsLoadingSuggestions(false));
     }
     ```
   * In `onTurnEvent` upon `turnComplete && turn.speaker === 'ai'`:
     ```typescript
     if ((mode === 'free' || Boolean(selectedScenario)) && suggestionsMode === 'auto') {
       if (!lastSuggestedTurnIdRef.current || lastSuggestedTurnIdRef.current !== baseId) {
         lastSuggestedTurnIdRef.current = baseId;
         setIsLoadingSuggestions(true);
         evalService.generateSpeakingSuggestions(updatedTranscript, defaultLevel, apiKey, mode === 'missions' ? selectedScenario : undefined, selectedPersona)
           .then(s => setSuggestions(s))
           .finally(() => setIsLoadingSuggestions(false));
       }
     }
     ```
   * In `handleFetchManualSuggestions`:
     ```typescript
     const handleFetchManualSuggestions = async () => {
       if (mode === 'missions' && !selectedScenario) return;
       setIsLoadingSuggestions(true);
       try {
         const s = await evalService.generateSpeakingSuggestions(transcript, defaultLevel, apiKey, mode === 'missions' ? selectedScenario : undefined, selectedPersona);
         setSuggestions(s);
       } finally {
         setIsLoadingSuggestions(false);
       }
     };
     ```

4. Make the **Speaking Suggestions Panel** rendering universal when `isConnected && suggestionsMode !== 'off' && (mode === 'free' || Boolean(selectedScenario))`:
   ```tsx
        {/* Dynamic Speaking Suggestions Panel */}
        {isConnected && (mode === 'free' || Boolean(selectedScenario)) && suggestionsMode !== 'off' && (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-3 transition-all w-full max-w-2xl">
            {/* ... panel contents identical ... */}
          </div>
        )}
   ```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/components/partner/LivePartnerView.test.tsx`  
Expected output: PASS across all unit tests (update any legacy tests in `LivePartnerView.test.tsx` that assumed `'free'` was the initial default mode!)

- [ ] **Step 5: Run full test suite and production build**

Run: `npm test && npm run build`  
Expected output: $100\%$ pass rate across all 14 test suites and zero errors on production build.

- [ ] **Step 6: Commit**

```bash
git add src/components/partner/LivePartnerView.tsx src/components/partner/LivePartnerView.test.tsx
git commit -m "feat(partner): set Roleplay Missions as primary default tab and enable universal speaking suggestions"
```
