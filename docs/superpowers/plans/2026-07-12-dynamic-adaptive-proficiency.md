# Dynamic Adaptive Proficiency Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dynamic adaptive proficiency engine that learns from historical user sessions/mistakes via `ProficiencyProfileService`, injects personalized profiles and real-time adaptation directives into the Gemini Live API via `PersonaService` / `LiveAudioClient`, and provides an Auto/Rigid adaptation mode toggle in the Studio and Settings UI.

**Architecture:** A local-first `ProficiencyProfileService` queries `StorageRepository` (`IndexedDB`) to deterministically synthesize a `ProficiencyProfile` in $<5\text{ms}$. When `adaptationMode === 'auto'`, `PersonaService` injects the profile and real-time turn-by-turn adaptation directives into the Gemini Live WebSocket system instructions. When `adaptationMode === 'rigid'`, it locks vocabulary and speaking speed strictly to the benchmark JLPT level.

**Tech Stack:** TypeScript (`strict: true`), React 18, `@google/genai` (Gemini Live API WebSockets), `idb` (`StorageRepository`), Vitest + React Testing Library.

## Global Constraints

- Must be completely local-first in the browser (`IndexedDB` / `localStorage`) with zero external database dependencies.
- All code must be strictly typed TypeScript (`strict: true`) with complete unit test coverage (`vitest`).
- No placeholders (`TODO`, `TBD`, `implement later`); complete code required in all steps.
- Maintain $100\%$ pass rate across the full test suite (`npm test`) and zero errors on production build (`npm run build`).

---

### Task 1: ProficiencyProfile Type & ProficiencyProfileService

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/ai/ProficiencyProfileService.ts`
- Create: `src/services/ai/ProficiencyProfileService.test.ts`

**Interfaces:**
- Consumes: `StorageRepository` (`getSessions()`, `getNotebookItems()`, `getUserStats()`), `JLPTLevel`, `SessionRecord`, `NotebookItemRecord`
- Produces: `AdaptationMode`, `ProficiencyProfile`, `ProficiencyProfileService` (`getProficiencyProfile(defaultLevel: JLPTLevel): Promise<ProficiencyProfile>`)

- [ ] **Step 1: Update `src/types/index.ts` with `AdaptationMode` and `ProficiencyProfile`**

Add the new types to `src/types/index.ts`:

```typescript
export type AdaptationMode = 'auto' | 'rigid';

export interface ProficiencyProfile {
  estimatedLevel: JLPTLevel;
  recentStruggles: string[];
  recentStrengths: string[];
  totalPracticeMinutes: number;
}
```

- [ ] **Step 2: Write the failing test for `ProficiencyProfileService`**

Create `src/services/ai/ProficiencyProfileService.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ProficiencyProfileService } from './ProficiencyProfileService';
import { StorageRepository } from '../storage/StorageRepository';

describe('ProficiencyProfileService', () => {
  let repository: StorageRepository;
  let service: ProficiencyProfileService;

  beforeEach(() => {
    repository = new StorageRepository('test_profile_db_' + Math.random());
    service = new ProficiencyProfileService(repository);
  });

  it('returns baseline profile when no sessions or unmastered items exist', async () => {
    const profile = await service.getProficiencyProfile('N4');
    expect(profile).toEqual({
      estimatedLevel: 'N4',
      recentStruggles: [],
      recentStrengths: [],
      totalPracticeMinutes: 0,
    });
  });

  it('synthesizes proficiency profile from recent session reports and unmastered notebook items', async () => {
    await repository.updateUserStats({
      dailyStreak: 3,
      lastPracticeDate: '2026-07-12',
      totalMinutesPracticed: 45,
      dailyGoalMinutes: 15,
    });

    await repository.saveSession({
      id: 'sess-1',
      timestamp: Date.now() - 10000,
      durationSeconds: 300,
      personaId: 'casual_friend',
      jlptLevel: 'N4',
      transcript: [],
      feedbackReport: {
        summary: 'Good N3 level vocabulary used.',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N3',
      },
    });

    await repository.saveNotebookItem({
      id: 'note-1',
      createdAt: Date.now(),
      category: 'grammar',
      jlptLevel: 'N3',
      originalText: '本をよむ時',
      correctedText: '本を読む時に',
      explanation: 'Remember the particle ni for time clauses.',
      mastered: false,
    });

    const profile = await service.getProficiencyProfile('N4');
    expect(profile.estimatedLevel).toBe('N3');
    expect(profile.totalPracticeMinutes).toBe(45);
    expect(profile.recentStruggles).toContain('本をよむ時 (Remember the particle ni for time clauses.)');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test src/services/ai/ProficiencyProfileService.test.ts`  
Expected output: FAIL (`Cannot find module './ProficiencyProfileService'`)

- [ ] **Step 4: Write minimal implementation of `ProficiencyProfileService`**

Create `src/services/ai/ProficiencyProfileService.ts`:

```typescript
import { StorageRepository } from '../storage/StorageRepository';
import { JLPTLevel, ProficiencyProfile } from '../../types';

export class ProficiencyProfileService {
  constructor(private repository: StorageRepository) {}

  async getProficiencyProfile(defaultLevel: JLPTLevel): Promise<ProficiencyProfile> {
    try {
      const [sessions, notebookItems, stats] = await Promise.all([
        this.repository.getSessions(),
        this.repository.getNotebookItems(),
        this.repository.getUserStats(),
      ]);

      let estimatedLevel: JLPTLevel = defaultLevel;
      for (const session of sessions) {
        if (session.feedbackReport?.estimatedLevel && ['N5', 'N4', 'N3', 'N2', 'N1'].includes(session.feedbackReport.estimatedLevel)) {
          estimatedLevel = session.feedbackReport.estimatedLevel as JLPTLevel;
          break;
        }
      }

      const unmastered = notebookItems.filter((item) => !item.mastered);
      const recentStruggles = unmastered
        .slice(0, 5)
        .map((item) => `${item.originalText} (${item.explanation})`);

      return {
        estimatedLevel,
        recentStruggles,
        recentStrengths: [],
        totalPracticeMinutes: stats.totalMinutesPracticed || 0,
      };
    } catch (err) {
      console.error('[ProficiencyProfileService] Failed to synthesize profile, falling back to baseline:', err);
      return {
        estimatedLevel: defaultLevel,
        recentStruggles: [],
        recentStrengths: [],
        totalPracticeMinutes: 0,
      };
    }
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test src/services/ai/ProficiencyProfileService.test.ts`  
Expected output: PASS (`2 passed`)

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/services/ai/ProficiencyProfileService.ts src/services/ai/ProficiencyProfileService.test.ts
git commit -m "feat(ai): implement ProficiencyProfileService for local dynamic proficiency synthesis"
```

---

### Task 2: System Instruction Injection & Real-Time Adaptation

**Files:**
- Modify: `src/services/persona/PersonaService.ts`
- Modify: `src/services/persona/PersonaService.test.ts`
- Modify: `src/services/ai/LiveAudioClient.ts`

**Interfaces:**
- Consumes: `AdaptationMode`, `ProficiencyProfile`, `RoleplayScenario`
- Produces: `buildSystemInstruction(..., profile?: ProficiencyProfile, adaptationMode?: AdaptationMode): string`, `client.connect(..., scenario?: RoleplayScenario, profile?: ProficiencyProfile, adaptationMode?: AdaptationMode): Promise<void>`

- [ ] **Step 1: Write the failing tests in `PersonaService.test.ts`**

Append to `src/services/persona/PersonaService.test.ts`:

```typescript
  it('injects dynamic proficiency profile and real-time adaptation rules when adaptationMode is auto', () => {
    const service = new PersonaService();
    const prompt = service.buildSystemInstruction(
      'casual_friend',
      'N4',
      true,
      undefined,
      {
        estimatedLevel: 'N3',
        recentStruggles: ['verb conjugations (use te-form correctly)'],
        recentStrengths: [],
        totalPracticeMinutes: 120,
      },
      'auto'
    );

    expect(prompt).toContain('DYNAMIC ADAPTIVE PROFICIENCY PROFILE');
    expect(prompt).toContain('working proficiency is approximately: N3');
    expect(prompt).toContain('verb conjugations (use te-form correctly)');
    expect(prompt).toContain('REAL-TIME ADAPTATION RULES');
  });

  it('injects rigid benchmark instructions when adaptationMode is rigid', () => {
    const service = new PersonaService();
    const prompt = service.buildSystemInstruction(
      'casual_friend',
      'N4',
      true,
      undefined,
      undefined,
      'rigid'
    );

    expect(prompt).toContain('Adaptation Mode: RIGID BENCHMARK');
    expect(prompt).not.toContain('DYNAMIC ADAPTIVE PROFICIENCY PROFILE');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/services/persona/PersonaService.test.ts`  
Expected output: FAIL (`Expected prompt to contain "DYNAMIC ADAPTIVE PROFICIENCY PROFILE"`)

- [ ] **Step 3: Update `PersonaService.ts` and `LiveAudioClient.ts`**

Modify `src/services/persona/PersonaService.ts`:

```typescript
import { PERSONAS } from '../../data/personas';
import { JLPTLevel, Persona, PersonaId, RoleplayScenario, ProficiencyProfile, AdaptationMode } from '../../types';

export class PersonaService {
  getAllPersonas(): Persona[] {
    return PERSONAS;
  }

  getPersona(id: PersonaId): Persona {
    const persona = PERSONAS.find((p) => p.id === id);
    if (!persona) {
      return PERSONAS[0];
    }
    return persona;
  }

  buildSystemInstruction(
    personaId: PersonaId,
    targetLevel: JLPTLevel,
    _furiganaEnabled?: boolean,
    scenario?: RoleplayScenario,
    profile?: ProficiencyProfile,
    adaptationMode: AdaptationMode = 'auto'
  ): string {
    const persona = this.getPersona(personaId);

    let base = `${persona.systemPrompt}\n\nTARGET JLPT LEVEL: ${targetLevel}`;

    if (adaptationMode === 'rigid') {
      base += `\nAdaptation Mode: RIGID BENCHMARK. Maintain rigid grammatical complexity, vocabulary register, and speaking speed appropriate for exact Japanese proficiency level ${targetLevel}. Do not simplify for the user even if they hesitate or make mistakes.`;
    } else {
      const levelToUse = profile?.estimatedLevel || targetLevel;
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

    if (scenario) {
      base += `\n\nROLEPLAY MISSION CONTEXT:
You are roleplaying as: ${scenario.aiRole}
The user is roleplaying as: ${scenario.userRole}
The user's secret goal for this conversation is: ${scenario.goalDescription}
Do NOT immediately solve or give away the goal to the user. Stay strictly in character as ${scenario.aiRole}, ask natural situational follow-up questions (such as checking dates, names, numbers, or details), and require the user to naturally communicate the necessary information in Japanese across multiple conversational turns to accomplish their goal.`;
    }

    return base;
  }
}
```

Modify `src/services/ai/LiveAudioClient.ts` around `connect`:

```typescript
import { AudioCapture } from '../audio/AudioCapture';
import { AudioPlayer } from '../audio/AudioPlayer';
import { PersonaService } from '../persona/PersonaService';
import { JLPTLevel, PersonaId, RoleplayScenario, ProficiencyProfile, AdaptationMode } from '../../types';

export interface TurnEvent {
  speaker: 'user' | 'ai';
  text: string;
  interrupted?: boolean;
  turnComplete?: boolean;
}

export class LiveAudioClient {
  private ws: WebSocket | null = null;
  private capture: AudioCapture;
  private player: AudioPlayer;
  private personaService: PersonaService;
  private onTurnEventCallback?: (event: TurnEvent) => void;
  private isConnected = false;

  constructor() {
    this.capture = new AudioCapture();
    this.player = new AudioPlayer();
    this.personaService = new PersonaService();
  }

  onTurnEvent(cb: (event: TurnEvent) => void): void {
    this.onTurnEventCallback = cb;
  }

  getVolumes(): { inputRms: number; outputRms: number } {
    return {
      inputRms: this.capture.getVolumeRms(),
      outputRms: this.player.getVolumeRms(),
    };
  }

  async connect(
    personaId: PersonaId,
    jlptLevel: JLPTLevel,
    apiKey: string,
    scenario?: RoleplayScenario,
    profile?: ProficiencyProfile,
    adaptationMode: AdaptationMode = 'auto'
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
      adaptationMode
    );

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    console.log('[LiveAudioClient] Connecting to WebSocket:', wsUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    this.ws = new WebSocket(wsUrl);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/services/persona/PersonaService.test.ts`  
Expected output: PASS (`7 passed`)

- [ ] **Step 5: Commit**

```bash
git add src/services/persona/PersonaService.ts src/services/persona/PersonaService.test.ts src/services/ai/LiveAudioClient.ts
git commit -m "feat(persona): support dynamic proficiency profiles and real-time adaptation mode instructions"
```

---

### Task 3: Settings Context & Settings View Integration

**Files:**
- Modify: `src/context/SettingsContext.tsx`
- Modify: `src/components/settings/SettingsView.tsx`
- Modify: `src/components/settings/SettingsView.test.tsx`

**Interfaces:**
- Consumes: `AdaptationMode`
- Produces: `useSettings()` with `adaptationMode: AdaptationMode`, `setAdaptationMode: (mode: AdaptationMode) => void`

- [ ] **Step 1: Write failing test in `SettingsView.test.tsx`**

Append to `src/components/settings/SettingsView.test.tsx`:

```typescript
  it('allows toggling AI Adaptation Mode between Auto and Rigid Benchmark', async () => {
    render(
      <SettingsProvider>
        <SettingsView repository={repository} />
      </SettingsProvider>
    );

    expect(screen.getByText(/AI Adaptation Mode/i)).toBeInTheDocument();
    const autoRadio = screen.getByLabelText(/Adaptive Learning \(Auto\)/i) as HTMLInputElement;
    const rigidRadio = screen.getByLabelText(/Rigid Benchmark/i) as HTMLInputElement;

    expect(autoRadio.checked).toBe(true);
    fireEvent.click(rigidRadio);
    expect(rigidRadio.checked).toBe(true);
    expect(localStorage.getItem('nihongo_adaptation_mode')).toBe('rigid');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/components/settings/SettingsView.test.tsx`  
Expected output: FAIL (`Unable to find an element with the text: /AI Adaptation Mode/i`)

- [ ] **Step 3: Update `SettingsContext.tsx` and `SettingsView.tsx`**

Modify `src/context/SettingsContext.tsx`:

```typescript
import React, { createContext, useContext, useState } from 'react';
import { JLPTLevel, AdaptationMode } from '../types';

interface SettingsContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  defaultLevel: JLPTLevel;
  setDefaultLevel: (level: JLPTLevel) => void;
  furiganaEnabled: boolean;
  setFuriganaEnabled: (enabled: boolean) => void;
  adaptationMode: AdaptationMode;
  setAdaptationMode: (mode: AdaptationMode) => void;
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
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
```

Update `src/components/settings/SettingsView.tsx` to include the AI Adaptation Mode section:

```tsx
import React, { useState } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { useSettings } from '../../context/SettingsContext';
import { JLPTLevel, AdaptationMode } from '../../types';
import { Key, GraduationCap, Download, Upload, Trash2, Check, AlertTriangle, Eye, Brain } from 'lucide-react';

interface SettingsViewProps {
  repository: StorageRepository;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ repository }) => {
  const {
    apiKey,
    setApiKey,
    defaultLevel,
    setDefaultLevel,
    furiganaEnabled,
    setFuriganaEnabled,
    adaptationMode,
    setAdaptationMode,
  } = useSettings();

  const [inputKey, setInputKey] = useState(apiKey);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(inputKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExport = async () => {
    try {
      const data = await repository.exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nihongo_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export study data.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await repository.importData(payload);
      alert('Study data successfully imported!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to import data. Please ensure the JSON backup file is valid.');
    } finally {
      setImporting(false);
    }
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure? This will permanently delete all your conversation logs, notebook items, custom drills, and streak history.'
    );
    if (!confirmed) return;
    try {
      await repository.clearAllData();
      alert('All study data cleared.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to clear data.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Preferences & Storage</h2>
        <p className="text-sm text-slate-400">
          Manage your AI configuration, study defaults, and 100% local browser storage.
        </p>
      </div>

      {/* Gemini API Key */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-500/30">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Gemini API Key</h3>
            <p className="text-xs text-slate-400">
              Required for ultra-low-latency Gemini Live API WebSockets and evaluation reports. Stored securely in your browser's local storage.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveKey} className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all shrink-0"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Saved!
              </>
            ) : (
              'Save API Key'
            )}
          </button>
        </form>
      </div>

      {/* Study Defaults */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-500/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Study Defaults & Display</h3>
            <p className="text-xs text-slate-400">
              Configure your baseline Japanese proficiency level and reading annotations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div>
            <label htmlFor="jlpt-level-select" className="block text-xs font-semibold text-slate-300 mb-2">
              Default Target JLPT Level
            </label>
            <select
              id="jlpt-level-select"
              value={defaultLevel}
              onChange={(e) => setDefaultLevel(e.target.value as JLPTLevel)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="N5">JLPT N5 (Beginner)</option>
              <option value="N4">JLPT N4 (Upper Beginner)</option>
              <option value="N3">JLPT N3 (Intermediate)</option>
              <option value="N2">JLPT N2 (Upper Intermediate)</option>
              <option value="N1">JLPT N1 (Advanced)</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-sm font-medium text-slate-200 block">Furigana Reading Aids</span>
                <span className="text-xs text-slate-500">Show kana above kanji</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFuriganaEnabled(!furiganaEnabled)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                furiganaEnabled
                  ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {furiganaEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* AI Adaptation Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-500/30">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">AI Adaptation Mode</h3>
            <p className="text-xs text-slate-400">
              Control whether the AI dynamically adapts to your personal speech and mistake history, or maintains a rigid benchmark.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              adaptationMode === 'auto'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="adaptation-mode"
              value="auto"
              checked={adaptationMode === 'auto'}
              onChange={() => setAdaptationMode('auto')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">Adaptive Learning (Auto)</span>
              <span className="text-xs text-slate-400 block mt-1">
                Recommended. AI learns from your session history and unmastered mistakes, dynamically scaling speed and vocabulary live during calls.
              </span>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              adaptationMode === 'rigid'
                ? 'bg-indigo-950/40 border-indigo-500'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              type="radio"
              name="adaptation-mode"
              value="rigid"
              checked={adaptationMode === 'rigid'}
              onChange={() => setAdaptationMode('rigid')}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <span className="text-sm font-semibold text-slate-100 block">Rigid Benchmark</span>
              <span className="text-xs text-slate-400 block mt-1">
                Strict exam practice. Locks the AI exactly to your selected JLPT level without simplifying vocabulary or speaking pace.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Local Storage & Data Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-slate-100">Local Data Management</h3>
          <p className="text-xs text-slate-400">
            Export all your session logs, notebook items, custom drills, and streak records to a JSON file for backup, or import data from another device.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-all"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            Export Study Data
          </button>

          <label className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 cursor-pointer transition-all">
            <Upload className="w-4 h-4 text-indigo-400" />
            {importing ? 'Importing...' : 'Import Study Data'}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-xs">Danger zone: irreversible data clearing</span>
          </div>
          <button
            type="button"
            onClick={handleClearData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset All Local Data
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/components/settings/SettingsView.test.tsx`  
Expected output: PASS (`6 passed`)

- [ ] **Step 5: Commit**

```bash
git add src/context/SettingsContext.tsx src/components/settings/SettingsView.tsx src/components/settings/SettingsView.test.tsx
git commit -m "feat(settings): add AI Adaptation Mode (auto vs rigid) toggle to SettingsContext and SettingsView"
```

---

### Task 4: Live Partner Studio UI Integration & Verification

**Files:**
- Modify: `src/components/partner/LivePartnerView.tsx`
- Modify: `src/components/partner/LivePartnerView.test.tsx`

**Interfaces:**
- Consumes: `ProficiencyProfileService`, `useSettings()` (`adaptationMode`, `setAdaptationMode`), `client.connect(...)`
- Produces: Studio header chip toggling `setAdaptationMode`, dynamic profile synthesis on `startSession()` when `adaptationMode === 'auto'`

- [ ] **Step 1: Write failing test in `LivePartnerView.test.tsx`**

Append to `src/components/partner/LivePartnerView.test.tsx`:

```typescript
  it('displays adaptation mode chip in studio and passes profile to LiveAudioClient when in auto mode', async () => {
    const saveNotebookSpy = vi.spyOn(repo, 'saveNotebookItem');
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );

    expect(screen.getByText(/Adaptive Mode: AUTO/i)).toBeInTheDocument();

    const startBtn = screen.getByText(/Start Live Conversation/i);
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Object), // or undefined
        expect.objectContaining({
          estimatedLevel: expect.any(String),
          recentStruggles: expect.any(Array),
        }),
        'auto'
      );
    });

    fireEvent.click(screen.getByText(/Adaptive Mode: AUTO/i));
    expect(screen.getByText(/Rigid Mode: STRICT/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/components/partner/LivePartnerView.test.tsx`  
Expected output: FAIL (`Unable to find an element with the text: /Adaptive Mode: AUTO/i`)

- [ ] **Step 3: Update `LivePartnerView.tsx`**

In `src/components/partner/LivePartnerView.tsx`:
1. Import `ProficiencyProfileService` and `ProficiencyProfile`.
2. Instantiate `const profileService = new ProficiencyProfileService(repository);`.
3. Add state `const [profile, setProfile] = useState<ProficiencyProfile | null>(null);`.
4. In `useEffect` (or right inside `startSession`), fetch `await profileService.getProficiencyProfile(defaultLevel)` when `adaptationMode === 'auto'`.
5. Pass `profile || undefined` and `adaptationMode` to `client.connect(selectedPersona, defaultLevel, apiKey, mode === 'missions' && selectedScenario ? selectedScenario : undefined, profile || undefined, adaptationMode)`.
6. Add the interactive mode chip in the header right next to the mode switcher:

```tsx
        <button
          type="button"
          disabled={isConnected}
          onClick={() => setAdaptationMode(adaptationMode === 'auto' ? 'rigid' : 'auto')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            adaptationMode === 'auto'
              ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/80'
              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          {adaptationMode === 'auto' ? `🧠 Adaptive Mode: AUTO (${profile?.estimatedLevel || defaultLevel})` : `🔒 Rigid Mode: STRICT ${defaultLevel}`}
        </button>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/components/partner/LivePartnerView.test.tsx`  
Expected output: PASS (`6 passed`)

- [ ] **Step 5: Run full test suite and production build**

Run: `npm test && npm run build`  
Expected output: $100\%$ pass rate across all 16 test suites and zero errors on production build.

- [ ] **Step 6: Commit**

```bash
git add src/components/partner/LivePartnerView.tsx src/components/partner/LivePartnerView.test.tsx
git commit -m "feat(partner): integrate dynamic proficiency profile and adaptation mode toggle into LivePartnerView"
```
