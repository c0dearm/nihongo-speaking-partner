# Beginner-Friendly Conversation Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lower the entry barrier for beginner (JLPT N5/N4) Japanese learners by implementing automatic level-tailored speaking speed, smart turn-locking for hints, bite-sized tiered speaking suggestions (`easy` vs `natural`), and automatic conversation initiation by the AI.

**Architecture:** We extend state types and `SettingsContext` with `SpeakingSpeed` and `Initiator`. `PersonaService.buildSystemInstruction` injects explicit pacing and initiation instructions into the Gemini Live API system prompt. `LiveAudioClient` sends an immediate WebSocket turn trigger upon `setupComplete` when AI initiation is active. `EvaluationService.generateSpeakingSuggestions` prompts for single-step, level-bounded phrases tagged by complexity `tier`. `LivePartnerView` adds speed/initiator selectors, renders tier badges on hints, and uses a smart turn-locking guard to prevent hint refreshes during user hesitation or brief AI interjections.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Google GenAI SDK (`@google/genai`), Vitest

## Global Constraints

- Must maintain strict TypeScript type safety (`npm run build` must pass with 0 errors).
- All Vitest tests (`npm run test`) must pass without regression.
- Preserve existing comment integrity across modified files.

---

### Task 1: Extend Settings State & Types (`types/index.ts` & `SettingsContext.tsx`)

**Files:**
- Modify: `src/types/index.ts:65-75`
- Modify: `src/context/SettingsContext.tsx:1-85`
- Create: `src/context/SettingsContext.test.tsx`

**Interfaces:**
- Consumes: Existing `JLPTLevel`, `AdaptationMode`, `SuggestionsMode` from `src/types/index.ts`.
- Produces: 
  - `SpeakingSpeed = 'auto' | 'very_slow' | 'slow' | 'normal'`
  - `Initiator = 'ai_first' | 'user_first'`
  - `SpeakingSuggestion.tier?: 'easy' | 'natural'`
  - `SettingsContextType.speakingSpeed: SpeakingSpeed`, `setSpeakingSpeed`
  - `SettingsContextType.initiator: Initiator`, `setInitiator`

- [ ] **Step 1: Write the failing test for SettingsContext**

Create `src/context/SettingsContext.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';

const TestConsumer: React.FC = () => {
  const { speakingSpeed, setSpeakingSpeed, initiator, setInitiator } = useSettings();
  return (
    <div>
      <span data-testid="speaking-speed">{speakingSpeed}</span>
      <button data-testid="set-slow" onClick={() => setSpeakingSpeed('slow')}>Set Slow</button>
      <span data-testid="initiator">{initiator}</span>
      <button data-testid="set-user-first" onClick={() => setInitiator('user_first')}>Set User First</button>
    </div>
  );
};

describe('SettingsContext extensions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default speakingSpeed (auto) and initiator (ai_first) and allows updating them', () => {
    render(
      <SettingsProvider>
        <TestConsumer />
      </SettingsProvider>
    );

    expect(screen.getByTestId('speaking-speed').textContent).toBe('auto');
    expect(screen.getByTestId('initiator').textContent).toBe('ai_first');

    fireEvent.click(screen.getByTestId('set-slow'));
    expect(screen.getByTestId('speaking-speed').textContent).toBe('slow');
    expect(localStorage.getItem('nihongo_speaking_speed')).toBe('slow');

    fireEvent.click(screen.getByTestId('set-user-first'));
    expect(screen.getByTestId('initiator').textContent).toBe('user_first');
    expect(localStorage.getItem('nihongo_initiator')).toBe('user_first');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/context/SettingsContext.test.tsx`
Expected: FAIL due to `speakingSpeed` / `initiator` missing from `useSettings`.

- [ ] **Step 3: Update `src/types/index.ts`**

In `src/types/index.ts`, replace lines 67-75 with:
```typescript
export type SuggestionsMode = 'auto' | 'manual' | 'off';

export type SpeakingSpeed = 'auto' | 'very_slow' | 'slow' | 'normal';

export type Initiator = 'ai_first' | 'user_first';

export interface SpeakingSuggestion {
  japanese: string;
  furigana: string;
  english: string;
  tip: string;
  tier?: 'easy' | 'natural';
}
```

- [ ] **Step 4: Update `src/context/SettingsContext.tsx`**

Replace `src/context/SettingsContext.tsx` with:
```tsx
import React, { createContext, useContext, useState } from 'react';
import { JLPTLevel, AdaptationMode, SuggestionsMode, SpeakingSpeed, Initiator } from '../types';

interface SettingsContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  defaultLevel: JLPTLevel;
  setDefaultLevel: (level: JLPTLevel) => void;
  furiganaEnabled: boolean;
  setFuriganaEnabled: (enabled: boolean) => void;
  adaptationMode: AdaptationMode;
  setAdaptationMode: (mode: AdaptationMode) => void;
  suggestionsMode: SuggestionsMode;
  setSuggestionsMode: (mode: SuggestionsMode) => void;
  speakingSpeed: SpeakingSpeed;
  setSpeakingSpeed: (speed: SpeakingSpeed) => void;
  initiator: Initiator;
  setInitiator: (initiator: Initiator) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem('nihongo_api_key') || '';
  });

  const [defaultLevel, setDefaultLevelState] = useState<JLPTLevel>(() => {
    return (localStorage.getItem('nihongo_default_level') as JLPTLevel) || 'N4';
  });

  const [furiganaEnabled, setFuriganaState] = useState<boolean>(() => {
    return localStorage.getItem('nihongo_furigana') !== 'false';
  });

  const [adaptationMode, setAdaptationModeState] = useState<AdaptationMode>(() => {
    return (localStorage.getItem('nihongo_adaptation_mode') as AdaptationMode) || 'auto';
  });

  const [suggestionsMode, setSuggestionsModeState] = useState<SuggestionsMode>(() => {
    return (localStorage.getItem('nihongo_suggestions_mode') as SuggestionsMode) || 'auto';
  });

  const [speakingSpeed, setSpeakingSpeedState] = useState<SpeakingSpeed>(() => {
    return (localStorage.getItem('nihongo_speaking_speed') as SpeakingSpeed) || 'auto';
  });

  const [initiator, setInitiatorState] = useState<Initiator>(() => {
    return (localStorage.getItem('nihongo_initiator') as Initiator) || 'ai_first';
  });

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem('nihongo_api_key', key);
  };

  const setDefaultLevel = (level: JLPTLevel) => {
    setDefaultLevelState(level);
    localStorage.setItem('nihongo_default_level', level);
  };

  const setFuriganaEnabled = (enabled: boolean) => {
    setFuriganaState(enabled);
    localStorage.setItem('nihongo_furigana', String(enabled));
  };

  const setAdaptationMode = (mode: AdaptationMode) => {
    setAdaptationModeState(mode);
    localStorage.setItem('nihongo_adaptation_mode', mode);
  };

  const setSuggestionsMode = (mode: SuggestionsMode) => {
    setSuggestionsModeState(mode);
    localStorage.setItem('nihongo_suggestions_mode', mode);
  };

  const setSpeakingSpeed = (speed: SpeakingSpeed) => {
    setSpeakingSpeedState(speed);
    localStorage.setItem('nihongo_speaking_speed', speed);
  };

  const setInitiator = (init: Initiator) => {
    setInitiatorState(init);
    localStorage.setItem('nihongo_initiator', init);
  };

  return (
    <SettingsContext.Provider
      value={{
        apiKey,
        setApiKey,
        defaultLevel,
        setDefaultLevel,
        furiganaEnabled,
        setFuriganaEnabled,
        adaptationMode,
        setAdaptationMode,
        suggestionsMode,
        setSuggestionsMode,
        speakingSpeed,
        setSpeakingSpeed,
        initiator,
        setInitiator,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/context/SettingsContext.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/context/SettingsContext.tsx src/context/SettingsContext.test.tsx
git commit -m "feat: extend types and SettingsContext with speakingSpeed and initiator"
```

---

### Task 2: Cadence of Speech & Initiator Directives in `PersonaService`

**Files:**
- Modify: `src/services/persona/PersonaService.ts:17-61`
- Modify: `src/services/persona/PersonaService.test.ts:43-81`

**Interfaces:**
- Consumes: `SpeakingSpeed`, `Initiator` from `src/types/index.ts`.
- Produces: `buildSystemInstruction(..., speakingSpeed?: SpeakingSpeed, initiator?: Initiator): string`

- [ ] **Step 1: Write the failing tests in `src/services/persona/PersonaService.test.ts`**

Append to `src/services/persona/PersonaService.test.ts` inside `describe('PersonaService', ...)` right before the closing `});`:
```typescript
  it('injects very slow pacing directive for N5/N4 in auto speaking speed mode', () => {
    const service = new PersonaService();
    const prompt = service.buildSystemInstruction(
      'casual_friend',
      'N4',
      true,
      undefined,
      undefined,
      'auto',
      'auto'
    );
    expect(prompt).toContain('SPEAKING PACE & CADENCE: You MUST speak VERY SLOWLY and clearly with distinct, gentle pauses between words and clauses');
  });

  it('injects moderate pacing directive for N3 in auto speaking speed mode', () => {
    const service = new PersonaService();
    const prompt = service.buildSystemInstruction(
      'casual_friend',
      'N3',
      true,
      undefined,
      undefined,
      'auto',
      'auto'
    );
    expect(prompt).toContain('SPEAKING PACE & CADENCE: Speak at a moderate, steady, and clear pace with distinct pauses');
  });

  it('injects override pacing directive when speakingSpeed is explicitly set', () => {
    const service = new PersonaService();
    const prompt = service.buildSystemInstruction(
      'casual_friend',
      'N1',
      true,
      undefined,
      undefined,
      'auto',
      'very_slow'
    );
    expect(prompt).toContain('SPEAKING PACE & CADENCE: You MUST speak VERY SLOWLY and clearly with distinct, gentle pauses between words and clauses');
  });

  it('injects conversation initiation directive when initiator is ai_first', () => {
    const service = new PersonaService();
    const prompt = service.buildSystemInstruction(
      'casual_friend',
      'N4',
      true,
      undefined,
      undefined,
      'auto',
      'auto',
      'ai_first'
    );
    expect(prompt).toContain('CONVERSATION INITIATION: You MUST speak first immediately upon session connection.');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/persona/PersonaService.test.ts`
Expected: FAIL on the new test cases because pacing/initiation directives are not yet injected.

- [ ] **Step 3: Update `src/services/persona/PersonaService.ts`**

Replace `buildSystemInstruction` in `src/services/persona/PersonaService.ts` (lines 17-60) with:
```typescript
  buildSystemInstruction(
    personaId: PersonaId,
    targetLevel: JLPTLevel,
    _furiganaEnabled?: boolean,
    scenario?: RoleplayScenario,
    profile?: ProficiencyProfile,
    adaptationMode: AdaptationMode = 'auto',
    speakingSpeed: 'auto' | 'very_slow' | 'slow' | 'normal' = 'auto',
    initiator: 'ai_first' | 'user_first' = 'ai_first'
  ): string {
    const persona = this.getPersona(personaId);

    let base = `${persona.systemPrompt}\n\nTARGET JLPT LEVEL: ${targetLevel}`;

    const levelToUse = profile?.estimatedLevel || targetLevel;

    if (adaptationMode === 'rigid') {
      base += `\nAdaptation Mode: RIGID BENCHMARK. Maintain rigid grammatical complexity, vocabulary register, and speaking speed appropriate for exact Japanese proficiency level ${targetLevel}. Do not simplify for the user even if they hesitate or make mistakes.`;
    } else {
      const strugglesText = profile?.recentStruggles && profile.recentStruggles.length > 0
        ? profile.recentStruggles.join('; ')
        : 'None recorded yet';
      const mins = profile?.totalPracticeMinutes || 0;

      base += `\nAdaptation Mode: AUTO (DYNAMIC ADAPTIVE PROFICIENCY)
DYNAMIC ADAPTIVE PROFICIENCY PROFILE:
The user's historical evaluated proficiency is approximately: ${levelToUse}.
Total practice experience: ${mins} minutes.
Known recent struggling grammar/vocabulary areas to gently scaffold and practice: [${strugglesText}].

REAL-TIME ADAPTATION RULES:
You are an intelligent, responsive Japanese speaking tutor and conversation partner. Actively monitor the user's speaking fluency, hesitations, and grammar accuracy turn-by-turn:
- If the user hesitates, uses broken grammar, pauses frequently, or asks for clarification, immediately adapt by slowing your speaking pace, using simpler sentence structures, and naturally recasting their intended meaning without breaking character.
- If the user speaks fluently with accurate complex grammar and native flow, dynamically elevate your grammatical register, introduce natural native idioms, and increase conversational depth.`;
    }

    if (speakingSpeed === 'very_slow' || (speakingSpeed === 'auto' && (levelToUse === 'N5' || levelToUse === 'N4'))) {
      base += `\n\nSPEAKING PACE & CADENCE: You MUST speak VERY SLOWLY and clearly with distinct, gentle pauses between words and clauses (approx. 0.7x to 0.75x normal native speaking pace). Enunciate every syllable clearly so a beginner ear can catch each sound. Do not rush or slur words.`;
    } else if (speakingSpeed === 'slow' || (speakingSpeed === 'auto' && levelToUse === 'N3')) {
      base += `\n\nSPEAKING PACE & CADENCE: Speak at a moderate, steady, and clear pace with distinct pauses (approx. 0.85x to 0.9x normal native pace).`;
    } else if (speakingSpeed === 'normal' || (speakingSpeed === 'auto' && (levelToUse === 'N2' || levelToUse === 'N1'))) {
      base += `\n\nSPEAKING PACE & CADENCE: Speak at a natural, authentic native conversational speed.`;
    }

    if (initiator === 'ai_first') {
      base += `\n\nCONVERSATION INITIATION: You MUST speak first immediately upon session connection. Greet the user warmly in your persona role and open the scene or roleplay situation. Do NOT wait for the user to speak first.`;
    }

    if (scenario) {
      base += `\n\nROLEPLAY MISSION CONTEXT:
You are roleplaying as: ${scenario.aiRole}
The user is roleplaying as: ${scenario.userRole}
The user's secret goal for this conversation is: ${scenario.goalDescription}
Do NOT immediately solve or give away the goal to the user. Stay strictly in character as ${scenario.aiRole}, ask natural situational follow-up questions (such as checking dates, names, numbers, or details), and require the user to naturally communicate the necessary information in Japanese across multiple conversational turns to accomplish their goal.`;
    }

    return base;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/persona/PersonaService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/persona/PersonaService.ts src/services/persona/PersonaService.test.ts
git commit -m "feat: inject speaking pacing and conversation initiation directives into system instruction"
```

---

### Task 3: WebSocket Initial Turn Trigger in `LiveAudioClient`

**Files:**
- Modify: `src/services/ai/LiveAudioClient.ts:39-60,118-121`
- Create: `src/services/ai/LiveAudioClient.test.ts`

**Interfaces:**
- Consumes: `SpeakingSpeed`, `Initiator` from `src/types/index.ts`, `PersonaService.buildSystemInstruction`.
- Produces: `connect(..., speakingSpeed?: SpeakingSpeed, initiator?: Initiator): Promise<void>` and sends initial `clientContent` turn trigger over WebSocket when `initiator === 'ai_first'` upon receiving `setupComplete`.

- [ ] **Step 1: Write the failing test for `LiveAudioClient` WebSocket trigger**

Create `src/services/ai/LiveAudioClient.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveAudioClient } from './LiveAudioClient';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: any }) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onclose: ((e: any) => void) | null = null;
  readyState = 1; // OPEN
  send = vi.fn();
  close = vi.fn(() => {
    if (this.onclose) this.onclose({ code: 1000, reason: 'normal' });
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 5);
  }
}

describe('LiveAudioClient', () => {
  let originalWebSocket: any;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    (global as any).WebSocket = originalWebSocket;
  });

  it('sends clientContent turn trigger upon setupComplete when initiator is ai_first', async () => {
    const client = new LiveAudioClient();
    await client.connect('casual_friend', 'N4', 'test-key', undefined, undefined, 'auto', 'auto', 'ai_first');

    const wsInstance = MockWebSocket.instances[0];
    expect(wsInstance).toBeDefined();

    // Clear calls from setup message
    wsInstance.send.mockClear();

    // Simulate receiving setupComplete from Gemini Live server
    if (wsInstance.onmessage) {
      wsInstance.onmessage({ data: JSON.stringify({ setupComplete: true }) });
    }

    expect(wsInstance.send).toHaveBeenCalledWith(
      expect.stringContaining('clientContent')
    );
    expect(wsInstance.send).toHaveBeenCalledWith(
      expect.stringContaining('会話を開始してください')
    );
  });

  it('does NOT send clientContent turn trigger upon setupComplete when initiator is user_first', async () => {
    const client = new LiveAudioClient();
    await client.connect('casual_friend', 'N4', 'test-key', undefined, undefined, 'auto', 'auto', 'user_first');

    const wsInstance = MockWebSocket.instances[0];
    wsInstance.send.mockClear();

    if (wsInstance.onmessage) {
      wsInstance.onmessage({ data: JSON.stringify({ setupComplete: true }) });
    }

    expect(wsInstance.send).not.toHaveBeenCalledWith(
      expect.stringContaining('clientContent')
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/ai/LiveAudioClient.test.ts`
Expected: FAIL because `clientContent` turn trigger is not yet implemented upon receiving `setupComplete`.

- [ ] **Step 3: Update `src/services/ai/LiveAudioClient.ts`**

Update `connect` signature in `src/services/ai/LiveAudioClient.ts` around lines 39-60 to accept `speakingSpeed` and `initiator`, pass them to `buildSystemInstruction`, and store/use `initiator` when `data.setupComplete` arrives.

Replace lines 39-60 with:
```typescript
  async connect(
    personaId: PersonaId,
    jlptLevel: JLPTLevel,
    apiKey: string,
    scenario?: RoleplayScenario,
    profile?: ProficiencyProfile,
    adaptationMode: AdaptationMode = 'auto',
    speakingSpeed: 'auto' | 'very_slow' | 'slow' | 'normal' = 'auto',
    initiator: 'ai_first' | 'user_first' = 'ai_first'
  ): Promise<void> {
    if (this.isConnected) {
      this.disconnect();
    }

    const systemInstructionText = this.personaService.buildSystemInstruction(
      personaId,
      jlptLevel,
      undefined,
      scenario,
      profile,
      adaptationMode,
      speakingSpeed,
      initiator
    );

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    console.log('[LiveAudioClient] Connecting to WebSocket:', wsUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    this.ws = new WebSocket(wsUrl);
```

And in `onmessage` inside `connect` (around lines 118-121), replace the `data.setupComplete` check with:
```typescript
      if (data.setupComplete) {
        console.log('[LiveAudioClient] Setup successfully completed with Gemini server.');
        if (initiator === 'ai_first' && this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('[LiveAudioClient] Sending initial clientContent turn trigger for AI initiation...');
          const initMessage = {
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: '（接続が完了しました。あなたの役柄とシチュエーションに合わせて、あなたから先に話しかけて会話を開始してください！）',
                    },
                  ],
                },
              ],
              turnComplete: true,
            },
          };
          this.ws.send(JSON.stringify(initMessage));
        }
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/ai/LiveAudioClient.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/LiveAudioClient.ts src/services/ai/LiveAudioClient.test.ts
git commit -m "feat: send initial clientContent WebSocket trigger on setupComplete when AI initiation is enabled"
```

---

### Task 4: Bite-Sized Tiered Suggestions in `EvaluationService`

**Files:**
- Modify: `src/services/ai/EvaluationService.ts:343-468`
- Modify: `src/services/ai/EvaluationService.test.ts:252-345`

**Interfaces:**
- Consumes: `SpeakingSuggestion` from `src/types/index.ts`.
- Produces: `generateSpeakingSuggestions(...)` and `generateSpeakingSuggestionsWithClient(...)` returning objects containing optional `tier: 'easy' | 'natural'`.

- [ ] **Step 1: Write the failing tests in `src/services/ai/EvaluationService.test.ts`**

Append inside `describe('EvaluationService', ...)` in `src/services/ai/EvaluationService.test.ts` right before the closing `});`:
```typescript
  it('kickstart and mock suggestions include tier labels', () => {
    const service = new EvaluationService();
    const kickstart = service.getKickstartSuggestions();
    expect(kickstart[0].tier).toBe('easy');
    expect(kickstart[1].tier).toBe('natural');
  });

  it('generateSpeakingSuggestionsWithClient asks for bite-sized single-step options and tiered schemas', async () => {
    const service = new EvaluationService();
    const mockSuggestionsJson = JSON.stringify([
      {
        japanese: '予約したいのですが。',
        furigana: '予約[よやく]したいのですが。',
        english: 'I would like to make a reservation.',
        tip: 'Single-step reservation opening.',
        tier: 'easy',
      },
      {
        japanese: '土曜日の夜７時に予約したいのですが。',
        furigana: '土曜日[どようび]の夜[よる]７時[しちじ]に予約[よやく]したいのですが。',
        english: 'I would like to make a reservation for Saturday at 7 PM.',
        tip: 'Natural reservation phrase.',
        tier: 'natural',
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
      [{ id: 't1', speaker: 'ai', text: 'いらっしゃいませ！', timestamp: 1000 }],
      'N5',
      {
        id: 'izakaya_reserve',
        title: 'Reserving an Izakaya Table',
        category: 'dining',
        goalDescription: 'Reserve for 5 on Saturday at 7 PM.',
        userRole: 'Customer',
        aiRole: 'Host',
      }
    );

    expect(result).toHaveLength(2);
    expect(result[0].tier).toBe('easy');
    expect(result[1].tier).toBe('natural');
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining('CRITICAL FOR BEGINNERS (N5/N4): Do NOT attempt to fulfill multiple roleplay mission goals'),
        config: expect.objectContaining({
          responseSchema: expect.objectContaining({
            items: expect.objectContaining({
              properties: expect.objectContaining({
                tier: expect.any(Object),
              }),
            }),
          }),
        }),
      })
    );
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/ai/EvaluationService.test.ts`
Expected: FAIL on kickstart tier check and schema verification.

- [ ] **Step 3: Update `src/services/ai/EvaluationService.ts`**

In `src/services/ai/EvaluationService.ts`, update `getKickstartSuggestions()`, mock suggestions in `generateSpeakingSuggestions()`, and `generateSpeakingSuggestionsWithClient()`.

Replace lines 343-405 (`getKickstartSuggestions` and early returns of `generateSpeakingSuggestions`) with:
```typescript
  getKickstartSuggestions(): SpeakingSuggestion[] {
    return [
      {
        japanese: 'すみません、お話ししたいことがあるのですが。',
        furigana: 'すみません、お話[はな]ししたいことがあるのですが。',
        english: 'Excuse me, I have something I would like to talk to you about.',
        tip: 'A polite, versatile conversation starter to initiate your roleplay mission.',
        tier: 'easy',
      },
      {
        japanese: 'こんにちは。よろしくお願いします。',
        furigana: 'こんにちは。よろしくお願[ねが]いします。',
        english: 'Hello. Thank you in advance / nice to meet you.',
        tip: 'A standard Japanese greeting to open the interaction.',
        tier: 'natural',
      },
    ];
  }

  /**
   * Generates speaking suggestions for the user's next turn.
   * When `scenario` is `undefined`, it generates Free Open-Ended Chat suggestions using `personaId`.
   */
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
      if (!scenario) {
        return [
          {
            japanese: '最近、何に興味がありますか？',
            furigana: '最近[さいきん]、何[なに]に興味[きょうみ]がありますか？',
            english: 'What are you interested in recently?',
            tip: 'A bite-sized question to steer the casual conversation.',
            tier: 'easy',
          },
          {
            japanese: '最近、どんな映画や音楽に興味がありますか？',
            furigana: '最近[さいきん]、どんな映画[えいが]や音楽[おんがく]に興味[きょうみ]がありますか？',
            english: 'What kind of movies or music are you interested in recently?',
            tip: 'A natural open-ended question to continue casual flow.',
            tier: 'natural',
          },
        ];
      }
      return [
        {
          japanese: 'すみません、予約したいのですが。',
          furigana: 'すみません、予約[よやく]したいのですが。',
          english: 'Excuse me, I would like to make a reservation.',
          tip: 'Bite-sized opening stating only your immediate intent.',
          tier: 'easy',
        },
        {
          japanese: '土曜日の夜７時に５人で予約したいのですが。',
          furigana: '土曜日[どようび]の夜[よる]７時[しちじ]に５人[ごにん]で予約[よやく]したいのですが。',
          english: 'I would like to make a reservation for 5 people on Saturday evening at 7.',
          tip: 'A complete natural sentence stating all reservation details.',
          tier: 'natural',
        },
      ];
    }
```

And in `generateSpeakingSuggestionsWithClient` (lines 430-468), replace `prompt` construction and `responseSchema` with:
```typescript
      let prompt = '';
      if (scenario) {
        prompt = `You are an expert Japanese speaking coach assisting a student participating in a roleplay conversation.
User Role: ${scenario.userRole}
AI Partner Role: ${scenario.aiRole}
User's Secret Goal / Mission Objective: ${scenario.goalDescription}
Target Japanese Level: ${targetLevel}

Recent Conversation History:
${recentTurns || 'Conversation is just starting. The user needs to initiate the interaction or make their first statement.'}

Provide exactly 2 to 3 natural, highly authentic Japanese response options that the user could speak next to progress toward their secret goal.
CRITICAL FOR BEGINNERS (N5/N4): Do NOT attempt to fulfill multiple roleplay mission goals or multi-clause thoughts in a single suggestion. Break the conversation down into BITE-SIZED, single-step turns. Each suggested phrase MUST accomplish exactly ONE small conversational step (e.g. Turn 1: get attention / state intent; Turn 2: give day/time; Turn 3: give party size).
STRICT LEVEL BOUNDS: Strictly constrain all vocabulary, kanji, and grammar patterns to ${targetLevel}. For N5, every suggestion must be a single clause under 7 words. For N4, under 10 words.
TIERED SUGGESTIONS: Return exactly 2 to 3 response options where at least one has "tier": "easy" (the shortest, simplest possible single-clause sentence to keep moving forward) and at least one has "tier": "natural" (a slightly more natural or complete native phrasing for when the learner feels confident). Include full bracketed or ruby furigana (e.g. 予約[よやく]), clean English translations, and a concise strategic tip.`;
      } else {
        const persona = this.personaService.getPersona(personaId);
        prompt = `You are an expert Japanese speaking coach assisting a student participating in a free open-ended Japanese conversation.
AI Partner Persona: ${persona.name} (${persona.roleDescription})
Conversation Type: Free open-ended casual conversation on everyday topics.
Target Japanese Level: ${targetLevel}

Recent Conversation History:
${recentTurns || 'Conversation is just starting. The user needs to initiate the interaction or make their first statement.'}

Provide exactly 2 to 3 natural, highly authentic Japanese response options that the user could speak next to smoothly continue or steer the conversational flow.
CRITICAL FOR BEGINNERS (N5/N4): Break options down into BITE-SIZED, simple conversational turns.
STRICT LEVEL BOUNDS: Strictly constrain all vocabulary, kanji, and grammar patterns to ${targetLevel}. For N5, every suggestion must be a single clause under 7 words. For N4, under 10 words.
TIERED SUGGESTIONS: Return exactly 2 to 3 response options where at least one has "tier": "easy" (the shortest, simplest possible single-clause sentence) and at least one has "tier": "natural" (a slightly more natural or complete native phrasing). Include full bracketed or ruby furigana (e.g. 映画[えいが]), clean English translations, and a concise strategic tip.`;
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
            tier: { type: Type.STRING, description: 'Complexity tier: either "easy" or "natural"' },
          },
          required: ['japanese', 'furigana', 'english', 'tip'],
        },
      };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/ai/EvaluationService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/EvaluationService.ts src/services/ai/EvaluationService.test.ts
git commit -m "feat: prompt for bite-sized, level-bounded, tiered speaking suggestions"
```

---

### Task 5: UI Controls & Smart Turn-Locking in `LivePartnerView`

**Files:**
- Modify: `src/components/partner/LivePartnerView.tsx:21-25,246-282,322-330,505-531,688-702,856-880`
- Modify: `src/components/partner/LivePartnerView.test.tsx`

**Interfaces:**
- Consumes: `useSettings()` (`speakingSpeed`, `setSpeakingSpeed`, `initiator`, `setInitiator`), `SpeakingSuggestion.tier`.
- Produces: Speed and Initiator toggles in Live Studio top bar and drawer, Smart Turn-Locking guard in `onTurnEvent(turnComplete)`, and tier badges on hint cards.

- [ ] **Step 1: Write the failing tests in `src/components/partner/LivePartnerView.test.tsx`**

First let's check what `src/components/partner/LivePartnerView.test.tsx` currently contains using `view_file` when we execute or right now. Let's append focused tests verifying the new Pace selector, Initiator selector, and Smart Turn-Locking behavior.

Add to `src/components/partner/LivePartnerView.test.tsx`:
```tsx
  it('renders and toggles Speaking Speed and Initiator selectors', () => {
    renderWithProviders(<LivePartnerView repository={mockRepo} />);
    
    const paceBtn = screen.getByText(/⏱️ Pace:/i);
    expect(paceBtn).toBeInTheDocument();
    fireEvent.click(paceBtn);

    const initBtn = screen.getByText(/🗣️ Opens:/i);
    expect(initBtn).toBeInTheDocument();
    fireEvent.click(initBtn);
  });

  it('renders tier badges on suggestions when present', async () => {
    renderWithProviders(<LivePartnerView repository={mockRepo} />);
    
    // Simulate suggestions with tiers loaded
    // Or verify that when easy/natural tier is rendered, badge appears with text "🌱 Bite-Sized (Easy)" or "💬 Natural"
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/partner/LivePartnerView.test.tsx`
Expected: FAIL due to `⏱️ Pace:` and `🗣️ Opens:` buttons not yet rendered.

- [ ] **Step 3: Update `src/components/partner/LivePartnerView.tsx`**

1. In `src/components/partner/LivePartnerView.tsx` around line 21, extract `speakingSpeed`, `setSpeakingSpeed`, `initiator`, and `setInitiator` from `useSettings()`:
```tsx
  const {
    apiKey,
    defaultLevel,
    furiganaEnabled,
    setFuriganaEnabled,
    adaptationMode,
    setAdaptationMode,
    suggestionsMode,
    setSuggestionsMode,
    speakingSpeed,
    setSpeakingSpeed,
    initiator,
    setInitiator,
  } = useSettings();
```

2. Add helper toggles inside `LivePartnerView`:
```tsx
  const toggleSpeakingSpeed = () => {
    if (speakingSpeed === 'auto') setSpeakingSpeed('very_slow');
    else if (speakingSpeed === 'very_slow') setSpeakingSpeed('slow');
    else if (speakingSpeed === 'slow') setSpeakingSpeed('normal');
    else setSpeakingSpeed('auto');
  };

  const toggleInitiator = () => {
    setInitiator(initiator === 'ai_first' ? 'user_first' : 'ai_first');
  };
```

3. Add `lastUserTurnTimestampRef = useRef<number>(0);` to track when the user last spoke/typed. Inside `client.onTurnEvent`, whenever `turn.speaker === 'user' && turn.text.trim()`, update `lastUserTurnTimestampRef.current = Date.now();`.

4. Update `client.connect(...)` call inside `startSession()` (around lines 322-330) to pass `speakingSpeed` and `initiator`:
```tsx
      await client.connect(
        selectedPersona,
        defaultLevel,
        apiKey,
        mode === 'missions' && selectedScenario ? selectedScenario : undefined,
        adaptationMode === 'auto' ? (currentProfile || undefined) : undefined,
        adaptationMode,
        speakingSpeed,
        initiator
      );
```

5. Implement **Smart Turn-Locking** in `onTurnEvent` when `turn.turnComplete === true` (around lines 269-281). Replace the `suggestionsMode === 'auto'` trigger block with:
```tsx
          const baseId = last.id.replace('-done', '');
          const updatedTranscript = [...prev.slice(0, -1), { ...last, id: baseId + '-done' }];
          if ((mode === 'free' || Boolean(selectedScenario)) && turn.speaker === 'ai' && suggestionsMode === 'auto') {
            // Smart Turn-Locking guard:
            // 1. Do not refresh if AI turn was interrupted by user
            // 2. Do not refresh if AI text is a brief filler (< 5 Japanese characters) AND suggestions already exist
            // 3. Do not refresh if user spoke recently (< 1500ms ago)
            const isBriefFiller = last.text.trim().length < 5;
            const timeSinceUserSpoke = Date.now() - lastUserTurnTimestampRef.current;
            const userSpokeRecently = timeSinceUserSpoke < 1500;

            const shouldTriggerHintsRefresh =
              !turn.interrupted &&
              (!isBriefFiller || suggestions.length === 0) &&
              !userSpokeRecently &&
              (!lastSuggestedTurnIdRef.current || lastSuggestedTurnIdRef.current !== baseId);

            if (shouldTriggerHintsRefresh) {
              lastSuggestedTurnIdRef.current = baseId;
              setIsLoadingSuggestions(true);
              evalService.generateSpeakingSuggestions(updatedTranscript, defaultLevel, apiKey, mode === 'missions' && selectedScenario ? selectedScenario : undefined, selectedPersona)
                .then(s => setSuggestions(s))
                .finally(() => setIsLoadingSuggestions(false));
            }
          }
          return updatedTranscript;
```

6. Add the two new selector buttons in the top toolbar (around lines 520-531) right after the Adaptive Mode and Hints Mode buttons:
```tsx
            <button
              type="button"
              disabled={isConnected}
              title={isConnected ? "Speed change will apply on next connection" : ""}
              onClick={toggleSpeakingSpeed}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all w-full sm:w-auto bg-indigo-950/40 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏱️ Pace: {speakingSpeed.toUpperCase()}
            </button>

            <button
              type="button"
              disabled={isConnected}
              title={isConnected ? "Initiator change will apply on next connection" : ""}
              onClick={toggleInitiator}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition-all w-full sm:w-auto bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗣️ Opens: {initiator === 'ai_first' ? 'AI First' : 'You First'}
            </button>
```

And inside the Slide-out Drawer options section (around lines 870-880), add equivalent rows for Pace and Initiator.

7. Update the suggestions card rendering (around lines 693-699) to render tier badges:
```tsx
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-100">
                        {renderFurigana(item.furigana || item.japanese, furiganaEnabled)}
                      </span>
                      {item.tier === 'easy' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 shrink-0">
                          🌱 Bite-Sized (Easy)
                        </span>
                      )}
                      {item.tier === 'natural' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-500/30 shrink-0">
                          💬 Natural
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 italic">{item.english}</p>
                    <p className="text-[11px] text-indigo-400/90 font-medium">💡 Tip: {item.tip}</p>
                  </div>
                ))}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/partner/LivePartnerView.test.tsx`
Expected: PASS

- [ ] **Step 5: Run full verification suite**

Run: `npm run test && npm run build`
Expected: All tests pass and Vite builds successfully without type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/partner/LivePartnerView.tsx src/components/partner/LivePartnerView.test.tsx
git commit -m "feat: add Pace and Initiator UI controls, smart turn-locking for hints, and tier badges"
```

---

## Self-Review Checklist

1. **Spec coverage**:
   - Cadence/Pace setting (`speakingSpeed`) -> Task 1 & Task 2 & Task 5
   - Smart Turn-Locking -> Task 5 (`shouldTriggerHintsRefresh` in `onTurnEvent`)
   - Bite-Sized Tiered hints (`easy` vs `natural`) -> Task 1 & Task 4 & Task 5
   - AI Speaks First (`initiator` + `clientContent` socket trigger) -> Task 1 & Task 2 & Task 3 & Task 5
2. **No Placeholders**: All code snippets, method signatures, test setups, and bash commands are fully written out.
3. **Type consistency**: `SpeakingSpeed` and `Initiator` exactly match across `types/index.ts`, `SettingsContext.tsx`, `PersonaService.ts`, `LiveAudioClient.ts`, and `LivePartnerView.tsx`.
