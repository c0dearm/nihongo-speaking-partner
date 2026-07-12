# Level-Agnostic Roleplay Missions & Dynamic Speaking Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deprecate legacy single-sentence JLPT Drills (`/drills`), make Roleplay Missions level-agnostic (`RoleplayScenario`), implement a turn-by-turn dynamic AI speaking suggestions engine (`EvaluationService.generateSpeakingSuggestions`), transform the Study Dashboard metrics (`/dashboard`), and integrate interactive suggestion pills + mode toggle (`auto` / `manual` / `off`) into the Live Partner Studio (`LivePartnerView`).

**Architecture:** We remove `/drills` from `Header` and delete legacy drill view/service files. `RoleplayScenario` drops its mandatory `jlptLevel`, adapting dynamically to the user's `adaptationMode`. `EvaluationService` gains a low-latency `gemini-3.5-flash` structured output generator (`generateSpeakingSuggestions`) that turns active mission context and recent transcript turns into 2–3 `SpeakingSuggestion` pills. `LivePartnerView` renders the suggestions mode chip and displays suggestion pills upon AI turn completion or manual click.

**Tech Stack:** TypeScript (`strict: true`), React 18, `@google/genai` (Gemini 3.5 Flash for structured suggestions), `idb` (`StorageRepository`), Vitest + React Testing Library.

## Global Constraints

- Must be completely local-first in the browser (`IndexedDB` / `localStorage`) with zero external database dependencies.
- All code must be strictly typed TypeScript (`strict: true`) with complete unit test coverage (`vitest`).
- No placeholders (`TODO`, `TBD`, `implement later`); complete code required in all steps.
- Maintain $100\%$ pass rate across the full test suite (`npm test`) and zero errors on production build (`npm run build`).

---

### Task 1: Core Types & Level-Agnostic Roleplay Scenarios

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/data/scenarios/curatedScenarios.ts`
- Modify: `src/services/scenarios/RoleplayScenarioService.ts`
- Modify: `src/services/scenarios/RoleplayScenarioService.test.ts`
- Modify: `src/services/persona/PersonaService.test.ts`
- Modify: `src/components/partner/CreateCustomScenarioModal.tsx`
- Modify: `src/components/partner/CreateCustomScenarioModal.test.tsx`

**Interfaces:**
- Consumes: `RoleplayScenario`
- Produces: `SuggestionsMode` (`'auto' | 'manual' | 'off'`), `SpeakingSuggestion`, `RoleplayScenario` (with optional `jlptLevel?: JLPTLevel`), level-agnostic `CURATED_SCENARIOS`, `RoleplayScenarioService.getScenariosByCategory(category?: string): RoleplayScenario[]`

- [ ] **Step 1: Update `src/types/index.ts`**

In `src/types/index.ts`, make `RoleplayScenario.jlptLevel` optional and add `SuggestionsMode` + `SpeakingSuggestion`:

```typescript
export type SuggestionsMode = 'auto' | 'manual' | 'off';

export interface SpeakingSuggestion {
  japanese: string;
  furigana: string;
  english: string;
  tip: string;
}
```

Locate `export interface RoleplayScenario {` and change `jlptLevel: JLPTLevel;` to:
```typescript
  jlptLevel?: JLPTLevel;
```

- [ ] **Step 2: Write failing test in `RoleplayScenarioService.test.ts`**

Replace `src/services/scenarios/RoleplayScenarioService.test.ts` with:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RoleplayScenarioService } from './RoleplayScenarioService';
import { StorageRepository } from '../storage/StorageRepository';

describe('RoleplayScenarioService', () => {
  let repository: StorageRepository;
  let service: RoleplayScenarioService;

  beforeEach(() => {
    repository = new StorageRepository('test_scenarios_db_' + Math.random());
    service = new RoleplayScenarioService(repository);
  });

  it('returns all scenarios or filters by category cleanly without requiring jlptLevel', async () => {
    const all = await service.getAllScenarios();
    expect(all.length).toBeGreaterThanOrEqual(5);

    const dining = await service.getScenariosByCategory('dining');
    expect(dining.length).toBeGreaterThanOrEqual(2);
    expect(dining.every(s => s.category === 'dining')).toBe(true);
  });

  it('saves and retrieves level-agnostic custom scenarios', async () => {
    const created = await service.createCustomScenario(
      'Buying a train ticket to Kyoto',
      'travel',
      'Purchase a Shinkansen reserved seat ticket to Kyoto departing at 10am.',
      'Traveler at ticket counter',
      'JR Station Clerk'
    );

    expect(created.title).toBe('Buying a train ticket to Kyoto');
    expect(created.jlptLevel).toBeUndefined();
    expect(created.isCustom).toBe(true);

    const all = await service.getAllScenarios();
    expect(all.some(s => s.id === created.id)).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test src/services/scenarios/RoleplayScenarioService.test.ts`  
Expected output: FAIL (`Property 'getScenariosByCategory' does not exist on type 'RoleplayScenarioService'`)

- [ ] **Step 4: Update `curatedScenarios.ts`, `RoleplayScenarioService.ts`, and `CreateCustomScenarioModal.tsx`**

Update `src/data/scenarios/curatedScenarios.ts`:

```typescript
import { RoleplayScenario } from '../../types';

export const CURATED_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'diner_order',
    title: 'Ordering Lunch at a Diner',
    category: 'dining',
    goalDescription: 'Order a lunch set meal without onions, and ask for a glass of water and the check at the end.',
    userRole: 'Hungry customer',
    aiRole: 'Friendly diner waiter/waitress',
    isCustom: false,
  },
  {
    id: 'izakaya_reserve',
    title: 'Reserving an Izakaya Table',
    category: 'dining',
    goalDescription: 'Call an izakaya to reserve a table for 5 people for Saturday at 7pm under the name Tanaka, and confirm whether smoking is permitted.',
    userRole: 'Customer calling the izakaya',
    aiRole: 'Busy izakaya host/hostess taking reservations on the phone',
    isCustom: false,
  },
  {
    id: 'hotel_checkin',
    title: 'Hotel Check-in & Special Request',
    category: 'travel',
    goalDescription: 'Check into your hotel reservation, request a room on a high floor with a quiet view if possible, and ask what time breakfast is served.',
    userRole: 'Hotel guest checking in',
    aiRole: 'Polite front desk receptionist at a Tokyo hotel',
    isCustom: false,
  },
  {
    id: 'lost_property',
    title: 'Lost Property at the Train Station',
    category: 'daily_life',
    goalDescription: 'Explain to the station officer that you left a black leather umbrella on the Yamanote line train that arrived 15 minutes ago, and ask where you can pick it up.',
    userRole: 'Commuter who lost their item on the train',
    aiRole: 'Helpful station master at the Lost & Found window',
    isCustom: false,
  },
  {
    id: 'client_reschedule',
    title: 'Rescheduling a High-Stakes Client Pitch',
    category: 'business',
    goalDescription: 'Call your business client to apologize and explain that due to an unexpected train delay and family emergency, you need to reschedule tomorrow morning\'s presentation to next Thursday afternoon.',
    userRole: 'Account manager asking for a schedule change',
    aiRole: 'Strict but professional business client',
    isCustom: false,
  },
];
```

Update `src/services/scenarios/RoleplayScenarioService.ts`:

```typescript
import { StorageRepository } from '../storage/StorageRepository';
import { RoleplayScenario } from '../../types';
import { CURATED_SCENARIOS } from '../../data/scenarios/curatedScenarios';

export class RoleplayScenarioService {
  constructor(private repository: StorageRepository) {}

  async getAllScenarios(): Promise<RoleplayScenario[]> {
    const custom = await this.repository.getCustomScenarios();
    return [...CURATED_SCENARIOS, ...custom];
  }

  async getScenariosByCategory(category?: string): Promise<RoleplayScenario[]> {
    const all = await this.getAllScenarios();
    if (!category || category === 'all') {
      return all;
    }
    return all.filter((s) => s.category === category);
  }

  async createCustomScenario(
    title: string,
    category: 'dining' | 'travel' | 'daily_life' | 'business' | 'emergency',
    goalDescription: string,
    userRole: string,
    aiRole: string
  ): Promise<RoleplayScenario> {
    const newScenario: RoleplayScenario = {
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      category,
      goalDescription: goalDescription.trim(),
      userRole: userRole.trim(),
      aiRole: aiRole.trim(),
      isCustom: true,
    };

    await this.repository.saveCustomScenario(newScenario);
    return newScenario;
  }
}
```

Update `src/components/partner/CreateCustomScenarioModal.tsx` to remove the JLPT Level dropdown:

```tsx
import React, { useState } from 'react';
import { RoleplayScenarioService } from '../../services/scenarios/RoleplayScenarioService';
import { RoleplayScenario } from '../../types';
import { X, Target, PlusCircle } from 'lucide-react';

interface CreateCustomScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioService: RoleplayScenarioService;
  onScenarioCreated: (scenario: RoleplayScenario) => void;
}

export const CreateCustomScenarioModal: React.FC<CreateCustomScenarioModalProps> = ({
  isOpen,
  onClose,
  scenarioService,
  onScenarioCreated,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'dining' | 'travel' | 'daily_life' | 'business' | 'emergency'>('daily_life');
  const [goalDescription, setGoalDescription] = useState('');
  const [userRole, setUserRole] = useState('');
  const [aiRole, setAiRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !goalDescription.trim() || !userRole.trim() || !aiRole.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await scenarioService.createCustomScenario(
        title,
        category,
        goalDescription,
        userRole,
        aiRole
      );
      onScenarioCreated(created);
      setTitle('');
      setGoalDescription('');
      setUserRole('');
      setAiRole('');
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create custom mission scenario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5 text-indigo-400">
            <Target className="w-5 h-5" />
            <h3 className="text-lg font-bold text-slate-100">Create Custom Roleplay Mission</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mission Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Asking for directions to the post office"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="daily_life">Daily Life</option>
              <option value="dining">Dining & Food</option>
              <option value="travel">Travel & Transit</option>
              <option value="business">Business & Work</option>
              <option value="emergency">Emergency & Help</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Role (Student) *
            </label>
            <input
              type="text"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              placeholder="e.g., Lost tourist walking around Shibuya"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              AI Partner Role *
            </label>
            <input
              type="text"
              value={aiRole}
              onChange={(e) => setAiRole(e.target.value)}
              placeholder="e.g., Friendly local police officer at a Koban"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Secret Goal / Mission Objective *
            </label>
            <textarea
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              rows={3}
              placeholder="e.g., Ask where the nearest post office is, find out if it is open on weekends, and ask how many minutes walking distance it takes from here."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Mission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

Update `src/components/partner/CreateCustomScenarioModal.test.tsx` to match the new level-agnostic form:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateCustomScenarioModal } from './CreateCustomScenarioModal';
import { RoleplayScenarioService } from '../../services/scenarios/RoleplayScenarioService';
import { StorageRepository } from '../../services/storage/StorageRepository';

describe('CreateCustomScenarioModal', () => {
  it('submits level-agnostic custom mission form and calls onScenarioCreated', async () => {
    const repo = new StorageRepository('test_modal_db_' + Math.random());
    const scenarioService = new RoleplayScenarioService(repo);
    const mockCreated = vi.fn();
    const mockClose = vi.fn();

    render(
      <CreateCustomScenarioModal
        isOpen={true}
        onClose={mockClose}
        scenarioService={scenarioService}
        onScenarioCreated={mockCreated}
      />
    );

    fireEvent.change(screen.getByLabelText(/Mission Title \*/i), { target: { value: 'Test Custom Mission' } });
    fireEvent.change(screen.getByLabelText(/Your Role \(Student\) \*/i), { target: { value: 'Test User Role' } });
    fireEvent.change(screen.getByLabelText(/AI Partner Role \*/i), { target: { value: 'Test AI Role' } });
    fireEvent.change(screen.getByLabelText(/Secret Goal \/ Mission Objective \*/i), { target: { value: 'Achieve test goal across multiple turns' } });

    fireEvent.click(screen.getByText(/Create Mission/i));

    await waitFor(() => {
      expect(mockCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Custom Mission',
          isCustom: true,
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
```

Check `src/services/persona/PersonaService.test.ts` and ensure any tests checking `scenario.jlptLevel` pass cleanly since `jlptLevel` is now optional.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test src/services/scenarios/RoleplayScenarioService.test.ts src/components/partner/CreateCustomScenarioModal.test.tsx src/services/persona/PersonaService.test.ts`  
Expected output: PASS across all 3 suites

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/data/scenarios/curatedScenarios.ts src/services/scenarios/RoleplayScenarioService.ts src/services/scenarios/RoleplayScenarioService.test.ts src/components/partner/CreateCustomScenarioModal.tsx src/components/partner/CreateCustomScenarioModal.test.tsx src/services/persona/PersonaService.test.ts
git commit -m "refactor(scenarios): make roleplay scenarios level-agnostic and add suggestions types"
```

---

### Task 2: Dynamic Speaking Suggestions Engine (`EvaluationService.ts`)

**Files:**
- Modify: `src/services/ai/EvaluationService.ts`
- Modify: `src/services/ai/EvaluationService.test.ts`

**Interfaces:**
- Consumes: `ConversationTurn`, `RoleplayScenario`, `JLPTLevel`, `SpeakingSuggestion`
- Produces: `generateSpeakingSuggestions(transcript: ConversationTurn[], scenario: RoleplayScenario, targetLevel: JLPTLevel, apiKey: string): Promise<SpeakingSuggestion[]>`

- [ ] **Step 1: Write failing test in `EvaluationService.test.ts`**

Append to `src/services/ai/EvaluationService.test.ts`:

```typescript
  it('generates turn-by-turn speaking suggestions for a roleplay mission using gemini-3.5-flash', async () => {
    const service = new EvaluationService();
    const suggestions = await service.generateSpeakingSuggestions(
      [
        { speaker: 'ai', text: 'いらっしゃいませ！何名様でしょうか？', timestamp: Date.now() - 5000 },
      ],
      {
        id: 'izakaya_reserve',
        title: 'Reserving an Izakaya Table',
        category: 'dining',
        goalDescription: 'Call an izakaya to reserve a table for 5 people for Saturday at 7pm under Tanaka.',
        userRole: 'Customer calling the izakaya',
        aiRole: 'Izakaya host taking reservations on the phone',
      },
      'N4',
      'test-api-key'
    );

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions[0]).toHaveProperty('japanese');
    expect(suggestions[0]).toHaveProperty('furigana');
    expect(suggestions[0]).toHaveProperty('english');
    expect(suggestions[0]).toHaveProperty('tip');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/services/ai/EvaluationService.test.ts`  
Expected output: FAIL (`Property 'generateSpeakingSuggestions' does not exist on type 'EvaluationService'`)

- [ ] **Step 3: Update `EvaluationService.ts`**

Modify `src/services/ai/EvaluationService.ts` to import `SpeakingSuggestion` and add `generateSpeakingSuggestions`:

```typescript
import { GoogleGenAI, Type } from '@google/genai';
import { SessionReport, JLPTLevel, ConversationTurn, RoleplayScenario, SpeakingSuggestion } from '../../types';

export class EvaluationService {
  // ... existing methods (generateSessionReport, generateSessionReportWithClient, etc.) ...

  async generateSpeakingSuggestions(
    transcript: ConversationTurn[],
    scenario: RoleplayScenario,
    targetLevel: JLPTLevel,
    apiKey: string
  ): Promise<SpeakingSuggestion[]> {
    if (!apiKey || apiKey === 'test-api-key') {
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
      const ai = new GoogleGenAI({ apiKey });
      const recentTurns = transcript.slice(-6).map(t => `${t.speaker === 'user' ? 'User (Student)' : 'AI Partner'}: ${t.text}`).join('\n');

      const prompt = `You are an expert Japanese speaking coach assisting a student participating in a roleplay conversation.
User Role: ${scenario.userRole}
AI Partner Role: ${scenario.aiRole}
User's Secret Goal / Mission Objective: ${scenario.goalDescription}
Target Japanese Level: ${targetLevel}

Recent Conversation History:
${recentTurns || 'Conversation is just starting. The user needs to initiate the interaction or make their first statement.'}

Provide exactly 2 to 3 natural, highly authentic Japanese response options that the user could speak next to progress toward their secret goal. The suggestions should match ${targetLevel} complexity. Include full bracketed or ruby furigana (e.g. 予約[よやく]), clean English translations, and a concise strategic tip.`;

      const responseSchema = {
        type: Type.ARRAY,
        description: 'List of 2 to 3 speaking suggestions for the user turn',
        items: {
          type: Type.OBJECT,
          properties: {
            japanese: { type: Type.STRING, description: 'Authentic Japanese response text in kanji/kana' },
            furigana: { type: Type.STRING, description: 'Japanese response with full bracketed furigana above kanji, e.g. 予約[よやく]したいのですが' },
            english: { type: Type.STRING, description: 'English translation of the suggested phrase' },
            tip: { type: Type.STRING, description: 'Strategic tip explaining how this phrase helps accomplish the mission goal' },
          },
          required: ['japanese', 'furigana', 'english', 'tip'],
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const jsonText = response.text;
      if (!jsonText) return [];
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('[EvaluationService] Failed to generate speaking suggestions:', err);
      return [];
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/services/ai/EvaluationService.test.ts`  
Expected output: PASS (`7 passed`)

- [ ] **Step 5: Commit**

```bash
git add src/services/ai/EvaluationService.ts src/services/ai/EvaluationService.test.ts
git commit -m "feat(ai): implement turn-by-turn speaking suggestions generator using gemini-3.5-flash"
```

---

### Task 3: Settings Context, Header Navigation, & Drill Deprecation

**Files:**
- Delete: `src/components/drills/DrillStudioView.tsx`
- Delete: `src/components/drills/DrillStudioView.test.tsx`
- Delete: `src/components/drills/CreateCustomDrillModal.tsx`
- Delete: `src/components/drills/CreateCustomDrillModal.test.tsx` (if exists)
- Delete: `src/services/drills/DrillService.ts`
- Delete: `src/services/drills/DrillService.test.ts`
- Modify: `src/context/SettingsContext.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/settings/SettingsView.tsx`
- Modify: `src/components/layout/Header.test.tsx`
- Modify: `src/components/settings/SettingsView.test.tsx`
- Modify: `src/App.tsx` and `src/App.test.tsx`

**Interfaces:**
- Consumes: `SuggestionsMode`
- Produces: `useSettings()` with `suggestionsMode: SuggestionsMode`, `setSuggestionsMode: (mode: SuggestionsMode) => void`, Header without `/drills`

- [ ] **Step 1: Delete legacy drill files and update `App.tsx`**

Run: `git rm -f src/components/drills/DrillStudioView.tsx src/components/drills/DrillStudioView.test.tsx src/components/drills/CreateCustomDrillModal.tsx src/components/drills/CreateCustomDrillModal.test.tsx src/services/drills/DrillService.ts src/services/drills/DrillService.test.ts 2>/dev/null || true`

In `src/App.tsx`, remove the `DrillStudioView` import and the `<Route path="/drills" element={<DrillStudioView repository={repository} />} />` route.

- [ ] **Step 2: Update `SettingsContext.tsx`**

In `src/context/SettingsContext.tsx`, import `SuggestionsMode` and add `suggestionsMode` / `setSuggestionsMode`:

```typescript
import React, { createContext, useContext, useState } from 'react';
import { JLPTLevel, AdaptationMode, SuggestionsMode } from '../types';

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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem('nihongo_api_key') || '');
  const [defaultLevel, setDefaultLevelState] = useState<JLPTLevel>(() => (localStorage.getItem('nihongo_default_level') as JLPTLevel) || 'N4');
  const [furiganaEnabled, setFuriganaState] = useState<boolean>(() => localStorage.getItem('nihongo_furigana') !== 'false');
  const [adaptationMode, setAdaptationModeState] = useState<AdaptationMode>(() => (localStorage.getItem('nihongo_adaptation_mode') as AdaptationMode) || 'auto');
  const [suggestionsMode, setSuggestionsModeState] = useState<SuggestionsMode>(() => (localStorage.getItem('nihongo_suggestions_mode') as SuggestionsMode) || 'auto');

  const setApiKey = (key: string) => { setApiKeyState(key); localStorage.setItem('nihongo_api_key', key); };
  const setDefaultLevel = (level: JLPTLevel) => { setDefaultLevelState(level); localStorage.setItem('nihongo_default_level', level); };
  const setFuriganaEnabled = (enabled: boolean) => { setFuriganaState(enabled); localStorage.setItem('nihongo_furigana', String(enabled)); };
  const setAdaptationMode = (mode: AdaptationMode) => { setAdaptationModeState(mode); localStorage.setItem('nihongo_adaptation_mode', mode); };
  const setSuggestionsMode = (mode: SuggestionsMode) => { setSuggestionsModeState(mode); localStorage.setItem('nihongo_suggestions_mode', mode); };

  return (
    <SettingsContext.Provider
      value={{
        apiKey, setApiKey,
        defaultLevel, setDefaultLevel,
        furiganaEnabled, setFuriganaEnabled,
        adaptationMode, setAdaptationMode,
        suggestionsMode, setSuggestionsMode,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
```

- [ ] **Step 3: Update `Header.tsx` and `SettingsView.tsx`**

In `src/components/layout/Header.tsx`, remove the `<NavLink to="/drills">` item cleanly so the navigation renders:
- Live Partner (`/`)
- Dashboard (`/dashboard`)
- Notebook (`/notebook`)
- Settings (`/settings`)

In `src/components/settings/SettingsView.tsx`, import `SuggestionsMode` and add the new **Speaking Suggestions Mode** card right below the AI Adaptation Mode card:

```tsx
      {/* Speaking Suggestions Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Speaking Suggestions Mode</h3>
            <p className="text-xs text-slate-400">
              Control when and how AI response hints appear during Target-Oriented Roleplay Missions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              suggestionsMode === 'auto'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="suggestions-mode"
              value="auto"
              checked={suggestionsMode === 'auto'}
              onChange={() => setSuggestionsMode('auto')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">Automatic (Recommended)</span>
              <span className="text-xs text-slate-400 block mt-1">
                AI automatically generates 2-3 response suggestions after every turn during missions.
              </span>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              suggestionsMode === 'manual'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="suggestions-mode"
              value="manual"
              checked={suggestionsMode === 'manual'}
              onChange={() => setSuggestionsMode('manual')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">On-Demand (Manual)</span>
              <span className="text-xs text-slate-400 block mt-1">
                Suggestions only generate when you manually click the "Get Suggestions" hint button.
              </span>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              suggestionsMode === 'off'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="suggestions-mode"
              value="off"
              checked={suggestionsMode === 'off'}
              onChange={() => setSuggestionsMode('off')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">Off (No Hints)</span>
              <span className="text-xs text-slate-400 block mt-1">
                Hides the suggestions panel completely for unassisted immersion and maximum challenge.
              </span>
            </div>
          </label>
        </div>
      </div>
```

- [ ] **Step 4: Update `Header.test.tsx`, `SettingsView.test.tsx`, and `App.test.tsx`**

In `src/components/layout/Header.test.tsx`, verify `/drills` is removed:
```typescript
  it('renders navigation links without legacy drills tab', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    expect(screen.getByText(/Live Partner/i)).toBeInTheDocument();
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Notebook/i)).toBeInTheDocument();
    expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    expect(screen.queryByText(/JLPT Drills/i)).not.toBeInTheDocument();
  });
```

In `src/components/settings/SettingsView.test.tsx`, add a test verifying toggling `suggestionsMode`:
```typescript
  it('allows toggling Speaking Suggestions Mode between Automatic, On-Demand, and Off', () => {
    render(
      <SettingsProvider>
        <SettingsView repository={repo} />
      </SettingsProvider>
    );

    expect(screen.getByText(/Speaking Suggestions Mode/i)).toBeInTheDocument();
    const autoRadio = screen.getByLabelText(/Automatic \(Recommended\)/i) as HTMLInputElement;
    const manualRadio = screen.getByLabelText(/On-Demand \(Manual\)/i) as HTMLInputElement;

    expect(autoRadio.checked).toBe(true);
    fireEvent.click(manualRadio);
    expect(manualRadio.checked).toBe(true);
    expect(localStorage.getItem('nihongo_suggestions_mode')).toBe('manual');
  });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test src/components/layout/Header.test.tsx src/components/settings/SettingsView.test.tsx src/App.test.tsx`  
Expected output: PASS across all 3 suites

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(nav): deprecate single-sentence JLPT drills and add Speaking Suggestions Mode to Settings"
```

---

### Task 4: Dashboard Metric Transformation

**Files:**
- Modify: `src/components/dashboard/DashboardView.tsx`
- Modify: `src/components/dashboard/DashboardView.test.tsx`

**Interfaces:**
- Consumes: `StorageRepository.getSessions()` (`session.feedbackReport?.goalVerdict`)
- Produces: Dashboard metrics tiles: **Roleplay Missions Completed** and **Mission Success Rate**

- [ ] **Step 1: Write failing test in `DashboardView.test.tsx`**

Replace `src/components/dashboard/DashboardView.test.tsx` with:

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardView } from './DashboardView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SettingsProvider } from '../../context/SettingsContext';

describe('DashboardView', () => {
  let repository: StorageRepository;

  beforeEach(() => {
    repository = new StorageRepository('test_dashboard_db_' + Math.random());
    vi.clearAllMocks();
  });

  it('renders streak tracker and calculates roleplay missions completed plus mission success rate', async () => {
    await repository.updateUserStats({
      dailyStreak: 4,
      lastPracticeDate: new Date().toISOString().slice(0, 10),
      totalMinutesPracticed: 65,
      dailyGoalMinutes: 20,
    });

    await repository.saveSession({
      id: 'sess-mission-1',
      timestamp: Date.now() - 20000,
      durationSeconds: 300,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [],
      feedbackReport: {
        summary: 'Good izakaya reservation call.',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N4',
        goalVerdict: { status: 'ACHIEVED', analysis: 'Successfully booked the table.' },
      },
    });

    await repository.saveSession({
      id: 'sess-mission-2',
      timestamp: Date.now() - 10000,
      durationSeconds: 240,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [],
      feedbackReport: {
        summary: 'Struggled with train ticket purchase.',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N4',
        goalVerdict: { status: 'MISSED', analysis: 'Did not specify departure time.' },
      },
    });

    render(
      <SettingsProvider>
        <DashboardView repository={repository} />
      </SettingsProvider>
    );

    expect(await screen.findByText(/4 days/i)).toBeInTheDocument();
    expect(screen.getByText(/Roleplay Missions/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 total missions
    expect(screen.getByText(/Mission Success Rate/i)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // 1/2 achieved = 50%
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/components/dashboard/DashboardView.test.tsx`  
Expected output: FAIL (`Unable to find an element with the text: /Roleplay Missions/i`)

- [ ] **Step 3: Update `DashboardView.tsx`**

In `src/components/dashboard/DashboardView.tsx`:
1. Calculate `missionSessions = sessions.filter(s => Boolean(s.feedbackReport?.goalVerdict))`
2. Calculate `successfulMissions = missionSessions.filter(s => s.feedbackReport?.goalVerdict?.status === 'ACHIEVED' || s.feedbackReport?.goalVerdict?.status === 'PARTIALLY_ACHIEVED').length`
3. Calculate `missionSuccessRate = missionSessions.length > 0 ? Math.round((successfulMissions / missionSessions.length) * 100) : 0`
4. Replace the two old drill scorecard cards (`Completed Drills` & `Average Score`) with:

```tsx
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-950/60 rounded-xl text-indigo-400 border border-indigo-500/30">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Roleplay Missions</p>
              <p className="text-2xl font-bold text-slate-100 mt-0.5">{missionSessions.length}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-950/60 rounded-xl text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mission Success Rate</p>
              <p className="text-2xl font-bold text-slate-100 mt-0.5">{missionSessions.length > 0 ? `${missionSuccessRate}%` : '—'}</p>
            </div>
          </div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/components/dashboard/DashboardView.test.tsx`  
Expected output: PASS (`1 passed`)

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardView.tsx src/components/dashboard/DashboardView.test.tsx
git commit -m "feat(dashboard): replace legacy drill score metric tiles with Roleplay Missions and Mission Success Rate"
```

---

### Task 5: Live Partner Studio Suggestions Panel & Mode Chip

**Files:**
- Modify: `src/components/partner/LivePartnerView.tsx`
- Modify: `src/components/partner/LivePartnerView.test.tsx`

**Interfaces:**
- Consumes: `useSettings()` (`suggestionsMode`, `setSuggestionsMode`), `EvaluationService.generateSpeakingSuggestions(...)`
- Produces: Interactive Suggestions Panel (`💡 What You Could Say Next`), suggestion pills with furigana/tips, header and drawer mode chip toggling

- [ ] **Step 1: Write failing test in `LivePartnerView.test.tsx`**

Append to `src/components/partner/LivePartnerView.test.tsx`:

```typescript
  it('renders suggestions mode chip and displays dynamic speaking suggestion pills during roleplay missions', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    // Switch to missions mode
    fireEvent.click(screen.getByText(/Goal-Oriented Roleplay Missions/i));
    expect(await screen.findByText(/Reserving an Izakaya Table/i)).toBeInTheDocument();

    // Verify suggestions mode chip in header
    expect(screen.getByText(/Hints: AUTO/i)).toBeInTheDocument();

    // Start live conversation
    fireEvent.click(screen.getByText(/Start Live Roleplay Mission/i));

    // Verify turn completion triggers suggestion display
    await waitFor(() => {
      expect(screen.getByText(/What You Could Say Next/i)).toBeInTheDocument();
      expect(screen.getByText(/Excuse me, I would like to make a reservation/i)).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/components/partner/LivePartnerView.test.tsx`  
Expected output: FAIL (`Unable to find an element with the text: /What You Could Say Next/i`)

- [ ] **Step 3: Update `LivePartnerView.tsx`**

In `src/components/partner/LivePartnerView.tsx`:
1. Import `SpeakingSuggestion`, `SuggestionsMode`, and add state:
   ```typescript
   const { apiKey, defaultLevel, furiganaEnabled, setFuriganaEnabled, adaptationMode, setAdaptationMode, suggestionsMode, setSuggestionsMode } = useSettings();
   const [suggestions, setSuggestions] = useState<SpeakingSuggestion[]>([]);
   const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
   ```
2. When starting a session (`startSession`), clear old suggestions (`setSuggestions([])`). If `mode === 'missions'` and `suggestionsMode === 'auto'`, immediately trigger an initial suggestion fetch for Turn 0 setup:
   ```typescript
   if (mode === 'missions' && selectedScenario && suggestionsMode === 'auto') {
     setIsLoadingSuggestions(true);
     evalService.generateSpeakingSuggestions([], selectedScenario, defaultLevel, apiKey)
       .then(s => setSuggestions(s))
       .finally(() => setIsLoadingSuggestions(false));
   }
   ```
3. Inside `client.onTurnEvent(...)`, when `event.turnComplete && event.speaker === 'ai'` fires while `mode === 'missions' && selectedScenario`:
   ```typescript
   if (suggestionsMode === 'auto') {
     setIsLoadingSuggestions(true);
     evalService.generateSpeakingSuggestions(updatedTranscript, selectedScenario, defaultLevel, apiKey)
       .then(s => setSuggestions(s))
       .finally(() => setIsLoadingSuggestions(false));
   }
   ```
4. Add `handleFetchManualSuggestions` helper for `manual` mode button clicks:
   ```typescript
   const handleFetchManualSuggestions = async () => {
     if (!selectedScenario) return;
     setIsLoadingSuggestions(true);
     try {
       const s = await evalService.generateSpeakingSuggestions(transcript, selectedScenario, defaultLevel, apiKey);
       setSuggestions(s);
     } finally {
       setIsLoadingSuggestions(false);
     }
   };
   ```
5. Add the **Suggestions Mode Chip** next to the Adaptation Mode chip in both the studio header and the slide-out drawer (`💡 Hints: ${suggestionsMode.toUpperCase()}`).
6. Render the interactive **💡 What You Could Say Next** panel right above the microphone recording button when in `missions` mode while connected (`isConnected`):

```tsx
      {/* Dynamic Speaking Suggestions Panel */}
      {isConnected && mode === 'missions' && selectedScenario && suggestionsMode !== 'off' && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-3 transition-all">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center gap-2 text-amber-400">
              <span className="text-base">💡</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">What You Could Say Next</span>
            </div>
            {isLoadingSuggestions && (
              <span className="text-xs text-indigo-400 animate-pulse font-medium">Generating response hints...</span>
            )}
          </div>

          {suggestionsMode === 'manual' && suggestions.length === 0 && !isLoadingSuggestions && (
            <div className="text-center py-2">
              <button
                type="button"
                onClick={handleFetchManualSuggestions}
                className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition-all shadow-sm"
              >
                💡 Stuck? Click to Generate Response Suggestions
              </button>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all space-y-1.5 text-left"
                >
                  <p className="text-sm font-medium text-slate-100">
                    {renderFurigana(item.furigana || item.japanese, furiganaEnabled)}
                  </p>
                  <p className="text-xs text-slate-400 italic">{item.english}</p>
                  <p className="text-[11px] text-indigo-400/90 font-medium">💡 Tip: {item.tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/components/partner/LivePartnerView.test.tsx`  
Expected output: PASS across all unit tests

- [ ] **Step 5: Run full test suite and production build**

Run: `npm test && npm run build`  
Expected output: $100\%$ pass rate across all test suites and zero errors on production build.

- [ ] **Step 6: Commit**

```bash
git add src/components/partner/LivePartnerView.tsx src/components/partner/LivePartnerView.test.tsx
git commit -m "feat(partner): integrate interactive turn-by-turn speaking suggestions panel and mode chips"
```
