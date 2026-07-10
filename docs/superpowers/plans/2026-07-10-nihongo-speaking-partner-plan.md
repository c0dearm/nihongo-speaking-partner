# Nihongo Speaking Partner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern, local-first React 18 + TypeScript web application (`nihongo-speaking-partner`) that enables self-taught Japanese learners to practice daily spoken conversation via the Gemini Live API (`gemini-3.1-flash-live-preview`) and improve JLPT N5–N1 speaking accuracy through structured evaluations (`gemini-3.5-flash`).

**Architecture:** Single-Page Application (React 18 + Vite + Tailwind CSS + Lucide Icons) with modular services for Live WebSocket audio streaming (`LiveAudioClient`), structured multimodal evaluations (`EvaluationService`), curated JLPT N5–N1 speaking drills (`DrillService`), Japanese personas (`PersonaService`), and local-first browser IndexedDB persistence (`StorageRepository`).

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3, `@google/genai` SDK, Web Audio API (`AudioContext`, `AudioWorklet`), IndexedDB (`idb`), Vitest + React Testing Library.

## Global Constraints

- Must be completely local-first in the browser (`IndexedDB` / `localStorage`) with zero external database dependencies.
- Use `gemini-3.1-flash-live-preview` for real-time bidirectional WebSocket audio conversations.
- Use `gemini-3.5-flash` with structured JSON output (`responseSchema`) for drill evaluations and session feedback reports.
- All code must be strictly typed TypeScript (`strict: true`) with complete unit test coverage (`vitest`).
- Audio capture must output 16kHz 16-bit little-endian mono PCM (`audio/pcm;rate=16000`), and audio playback must handle 24kHz PCM smoothly.

---

### Task 1: Project Scaffolding, Build & Vitest Test Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/index.css`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`

**Interfaces:**
- Produces: Base React + Vite + Tailwind application framework with configured Vitest environment.

- [ ] **Step 1: Write `package.json` and basic project configuration files**

```json
{
  "name": "nihongo-speaking-partner",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@google/genai": "^0.1.2",
    "idb": "^8.0.0",
    "lucide-react": "^1.16.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^14.2.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6",
    "vitest": "^1.3.1"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, and `index.html`**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

Create `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          950: '#1e1b4b',
        }
      }
    },
  },
  plugins: [],
}
```

Create `postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Create `index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nihongo Speaking Partner | 日本語スピーキング</title>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Write initial `src/App.tsx` and smoke test `src/App.test.tsx`**

Create `src/App.tsx`:
```tsx
import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold tracking-tight text-indigo-400">
        日本語 Nihongo Speaking Partner
      </h1>
      <p className="mt-2 text-slate-400">Daily Japanese Speaking Studio</p>
    </div>
  );
}
```

Create `src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Smoke Test', () => {
  it('renders the application title', () => {
    render(<App />);
    expect(screen.getByText(/Nihongo Speaking Partner/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run dependencies install and execute test suite**

Run: `npm install && npm test`
Expected: PASS (`App Smoke Test > renders the application title`)

- [ ] **Step 5: Commit scaffolding**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js index.html src/
git commit -m "chore: scaffold React 18 + Vite + Tailwind + Vitest setup"
```

---

### Task 2: Domain Types & Local-First IndexedDB Repository (`StorageRepository`)

**Files:**
- Create: `src/types/index.ts`
- Create: `src/services/storage/StorageRepository.ts`
- Create: `src/services/storage/StorageRepository.test.ts`

**Interfaces:**
- Produces: `StorageRepository` class with `getSessions()`, `saveSession(session)`, `getNotebookItems()`, `saveNotebookItem(item)`, `deleteNotebookItem(id)`, `getUserStats()`, `updateUserStats(stats)`, `exportAllData()`, `importAllData(data)`.

- [ ] **Step 1: Define comprehensive domain types in `src/types/index.ts`**

Create `src/types/index.ts`:
```typescript
export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type PersonaId = 'casual_friend' | 'izakaya_staff' | 'jlpt_tutor' | 'workplace_formal';

export interface Persona {
  id: PersonaId;
  name: string;
  japaneseName: string;
  roleDescription: string;
  speechRegister: string;
  systemPrompt: string;
}

export interface ConversationTurn {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  furiganaText?: string;
  timestamp: number;
}

export interface GrammarCorrection {
  originalPart: string;
  correctedPart: string;
  explanation: string;
  jlptLevel: JLPTLevel;
}

export interface VocabularyItem {
  word: string;
  reading: string;
  meaning: string;
}

export interface SpeakingAssessment {
  overallScore: number;
  grammarScore: number;
  naturalnessScore: number;
  userTranscript: string;
  nativeRecast: {
    japanese: string;
    furigana: string;
    english: string;
  };
  grammarCorrections: GrammarCorrection[];
  keyVocabulary: VocabularyItem[];
}

export interface SessionReport {
  summary: string;
  topGrammarCorrections: GrammarCorrection[];
  naturalPhrasingTips: string[];
  estimatedLevel: JLPTLevel;
}

export interface SessionRecord {
  id: string;
  timestamp: number;
  durationSeconds: number;
  personaId: PersonaId;
  jlptLevel: JLPTLevel;
  transcript: ConversationTurn[];
  feedbackReport?: SessionReport;
}

export interface DrillPrompt {
  id: string;
  jlptLevel: JLPTLevel;
  category: 'scenario' | 'transformation' | 'shadowing';
  title: string;
  promptText: string;
  targetGrammar: string;
  exampleAnswer?: string;
  isCustom?: boolean;
}

export interface DrillProgressRecord {
  id: string;
  drillId: string;
  jlptLevel: JLPTLevel;
  completedAt: number;
  assessment: SpeakingAssessment;
}

export interface NotebookItemRecord {
  id: string;
  createdAt: number;
  category: 'grammar' | 'vocabulary' | 'pronunciation';
  jlptLevel: JLPTLevel;
  originalText: string;
  correctedText: string;
  furiganaText: string;
  explanation: string;
  mastered: boolean;
}

export interface UserStatsRecord {
  dailyStreak: number;
  lastPracticeDate: string; // YYYY-MM-DD
  totalMinutesPracticed: number;
  dailyGoalMinutes: number;
}

export interface ExportDataPayload {
  version: number;
  exportedAt: number;
  sessions: SessionRecord[];
  drillsProgress: DrillProgressRecord[];
  notebookItems: NotebookItemRecord[];
  customDrills: DrillPrompt[];
  userStats: UserStatsRecord;
}
```

- [ ] **Step 2: Write failing test `src/services/storage/StorageRepository.test.ts`**

Create `src/services/storage/StorageRepository.test.ts`:
```typescript
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageRepository } from './StorageRepository';
import { NotebookItemRecord, UserStatsRecord } from '../../types';

describe('StorageRepository', () => {
  let repo: StorageRepository;

  beforeEach(async () => {
    repo = new StorageRepository('test_nihongo_db_' + Math.random());
    await repo.init();
  });

  it('saves and retrieves notebook items', async () => {
    const item: NotebookItemRecord = {
      id: 'note-1',
      createdAt: 1720630000000,
      category: 'grammar',
      jlptLevel: 'N4',
      originalText: '遅れてごめんなさい',
      correctedText: '遅れて申し訳ありません',
      furiganaText: 'おくれてもうしわけありません',
      explanation: 'More polite phrasing for workplace situations',
      mastered: false,
    };

    await repo.saveNotebookItem(item);
    const items = await repo.getNotebookItems();

    expect(items).toHaveLength(1);
    expect(items[0].correctedText).toBe('遅れて申し訳ありません');
  });

  it('initializes and updates user stats', async () => {
    const stats = await repo.getUserStats();
    expect(stats.dailyStreak).toBe(0);
    expect(stats.dailyGoalMinutes).toBe(15);

    const updated: UserStatsRecord = {
      ...stats,
      dailyStreak: 3,
      totalMinutesPracticed: 45,
    };
    await repo.updateUserStats(updated);

    const fresh = await repo.getUserStats();
    expect(fresh.dailyStreak).toBe(3);
    expect(fresh.totalMinutesPracticed).toBe(45);
  });
});
```

- [ ] **Step 3: Implement `StorageRepository` in `src/services/storage/StorageRepository.ts`**

Create `src/services/storage/StorageRepository.ts`:
```typescript
import { openDB, IDBPDatabase } from 'idb';
import {
  SessionRecord,
  DrillProgressRecord,
  NotebookItemRecord,
  DrillPrompt,
  UserStatsRecord,
  ExportDataPayload,
} from '../../types';

const DB_VERSION = 1;

export class StorageRepository {
  private dbPromise: Promise<IDBPDatabase>;

  constructor(private dbName = 'nihongo_partner_db') {
    this.dbPromise = this.openDatabase();
  }

  private async openDatabase(): Promise<IDBPDatabase> {
    return openDB(this.dbName, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('drills_progress')) {
          db.createObjectStore('drills_progress', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notebook_items')) {
          db.createObjectStore('notebook_items', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('custom_drills')) {
          db.createObjectStore('custom_drills', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('user_stats')) {
          db.createObjectStore('user_stats');
        }
      },
    });
  }

  async init(): Promise<void> {
    await this.dbPromise;
  }

  // Sessions CRUD
  async saveSession(session: SessionRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('sessions', session);
  }

  async getSessions(): Promise<SessionRecord[]> {
    const db = await this.dbPromise;
    const items = await db.getAll('sessions');
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Drills Progress CRUD
  async saveDrillProgress(progress: DrillProgressRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('drills_progress', progress);
  }

  async getDrillProgressList(): Promise<DrillProgressRecord[]> {
    const db = await this.dbPromise;
    const items = await db.getAll('drills_progress');
    return items.sort((a, b) => b.completedAt - a.completedAt);
  }

  // Custom Drills CRUD
  async saveCustomDrill(drill: DrillPrompt): Promise<void> {
    const db = await this.dbPromise;
    await db.put('custom_drills', drill);
  }

  async getCustomDrills(): Promise<DrillPrompt[]> {
    const db = await this.dbPromise;
    return db.getAll('custom_drills');
  }

  // Notebook CRUD
  async saveNotebookItem(item: NotebookItemRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('notebook_items', item);
  }

  async getNotebookItems(): Promise<NotebookItemRecord[]> {
    const db = await this.dbPromise;
    const items = await db.getAll('notebook_items');
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteNotebookItem(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('notebook_items', id);
  }

  // User Stats
  async getUserStats(): Promise<UserStatsRecord> {
    const db = await this.dbPromise;
    const existing = await db.get('user_stats', 'current');
    if (existing) {
      return existing;
    }
    const defaultStats: UserStatsRecord = {
      dailyStreak: 0,
      lastPracticeDate: '',
      totalMinutesPracticed: 0,
      dailyGoalMinutes: 15,
    };
    await db.put('user_stats', defaultStats, 'current');
    return defaultStats;
  }

  async updateUserStats(stats: UserStatsRecord): Promise<void> {
    const db = await this.dbPromise;
    await db.put('user_stats', stats, 'current');
  }

  // Export / Import
  async exportAllData(): Promise<ExportDataPayload> {
    const [sessions, drillsProgress, notebookItems, customDrills, userStats] = await Promise.all([
      this.getSessions(),
      this.getDrillProgressList(),
      this.getNotebookItems(),
      this.getCustomDrills(),
      this.getUserStats(),
    ]);

    return {
      version: 1,
      exportedAt: Date.now(),
      sessions,
      drillsProgress,
      notebookItems,
      customDrills,
      userStats,
    };
  }

  async importAllData(data: ExportDataPayload): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(
      ['sessions', 'drills_progress', 'notebook_items', 'custom_drills', 'user_stats'],
      'readwrite'
    );

    await tx.objectStore('sessions').clear();
    for (const s of data.sessions) {
      await tx.objectStore('sessions').put(s);
    }

    await tx.objectStore('drills_progress').clear();
    for (const d of data.drillsProgress) {
      await tx.objectStore('drills_progress').put(d);
    }

    await tx.objectStore('notebook_items').clear();
    for (const n of data.notebookItems) {
      await tx.objectStore('notebook_items').put(n);
    }

    await tx.objectStore('custom_drills').clear();
    for (const c of data.customDrills) {
      await tx.objectStore('custom_drills').put(c);
    }

    await tx.objectStore('user_stats').put(data.userStats, 'current');
    await tx.done;
  }
}
```

- [ ] **Step 4: Install `fake-indexeddb` for Vitest and verify tests pass**

Run: `npm install -D fake-indexeddb && npm test src/services/storage/StorageRepository.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit `StorageRepository`**

```bash
git add src/types/index.ts src/services/storage/ package.json package-lock.json
git commit -m "feat: implement local-first IndexedDB StorageRepository"
```

---

### Task 3: JLPT Curated Drill Decks & Drill Service (`DrillService`)

**Files:**
- Create: `src/data/drills/curatedDrills.ts`
- Create: `src/services/drills/DrillService.ts`
- Create: `src/services/drills/DrillService.test.ts`

**Interfaces:**
- Consumes: `StorageRepository` (`getCustomDrills()`), `DrillPrompt` from `src/types`.
- Produces: `DrillService.getAllDrills(level?)`, `DrillService.getDrillById(id)`, `DrillService.createCustomDrill(prompt)`.

- [ ] **Step 1: Write `src/data/drills/curatedDrills.ts` with curated N5–N1 prompts**

Create `src/data/drills/curatedDrills.ts`:
```typescript
import { DrillPrompt } from '../../types';

export const CURATED_DRILLS: DrillPrompt[] = [
  // N5
  {
    id: 'n5-scenario-1',
    jlptLevel: 'N5',
    category: 'scenario',
    title: 'Self-Introduction (自己紹介)',
    promptText: 'Introduce yourself politely to a new classmate using 〜です and say where you are from.',
    targetGrammar: '〜は〜です / 〜から来ました',
    exampleAnswer: 'はじめまして。私はアレックスです。アメリカから来ました。よろしくおねがいします。',
  },
  {
    id: 'n5-transformation-1',
    jlptLevel: 'N5',
    category: 'transformation',
    title: 'Asking Permission (てもいいですか)',
    promptText: 'Ask your teacher politely if you may take a picture of the blackboard.',
    targetGrammar: '〜てもいいですか',
    exampleAnswer: 'こくばんのしゃしんをとってもいいですか。',
  },
  {
    id: 'n5-shadowing-1',
    jlptLevel: 'N5',
    category: 'shadowing',
    title: 'Daily Routine (毎日)',
    promptText: 'Listen and repeat clearly: 毎朝七時に起きて、コーヒーを飲みます。',
    targetGrammar: '〜て (Connecting actions)',
    exampleAnswer: 'まいあさしちじにおきて、コーヒーをのみます。',
  },

  // N4
  {
    id: 'n4-scenario-1',
    jlptLevel: 'N4',
    category: 'scenario',
    title: 'Apologizing for Delay (遅れてしまいました)',
    promptText: 'Explain to your coworker that your train stopped and you regret being 15 minutes late.',
    targetGrammar: '〜てしまいました / 〜ので',
    exampleAnswer: 'でんしゃがとまってしまったので、じゅうごふんおくれてしまいました。すみません。',
  },
  {
    id: 'n4-transformation-1',
    jlptLevel: 'N4',
    category: 'transformation',
    title: 'Giving Advice (〜ほうがいい)',
    promptText: 'Advise a friend who has a cold that they should drink warm tea and rest early.',
    targetGrammar: '〜たほうがいいです',
    exampleAnswer: 'あたたかいおちゃをのんで、はやくなおしたほうがいいですよ。',
  },
  {
    id: 'n4-shadowing-1',
    jlptLevel: 'N4',
    category: 'shadowing',
    title: 'Expressing Experience (〜たことがある)',
    promptText: 'Listen and repeat: 日本で温泉に入ったことがありますか。',
    targetGrammar: '〜たことがある',
    exampleAnswer: 'にほんでおんせんにいったことがありますか。',
  },

  // N3
  {
    id: 'n3-scenario-1',
    jlptLevel: 'N3',
    category: 'scenario',
    title: 'Polite Request at Work (〜ていただけませんか)',
    promptText: 'Ask a senior colleague politely if they could check your Japanese email draft.',
    targetGrammar: '〜ていただけませんか',
    exampleAnswer: 'お忙しいところ恐れ入りますが、このメールをチェックしていただけませんか。',
  },
  {
    id: 'n3-transformation-1',
    jlptLevel: 'N3',
    category: 'transformation',
    title: 'Expressing Cause/Reason (〜せいで)',
    promptText: 'Explain that because of the heavy rain, the outdoor festival was canceled.',
    targetGrammar: '〜せいで / 〜おかげで',
    exampleAnswer: '大雨のせいで、イベントが中止になってしまいました。',
  },
  {
    id: 'n3-shadowing-1',
    jlptLevel: 'N3',
    category: 'shadowing',
    title: 'Comparison & Contrast (〜に対して)',
    promptText: 'Listen and repeat: 兄が静かなのに対して、弟はとても活発です。',
    targetGrammar: '〜に対して',
    exampleAnswer: 'あにがしずかなのにたいして、おとうとはとてもかっぱつです。',
  },

  // N2
  {
    id: 'n2-scenario-1',
    jlptLevel: 'N2',
    category: 'scenario',
    title: 'Formal Complaint (〜にほかならない)',
    promptText: 'Persuade a team lead that customer satisfaction is nothing less than the top priority.',
    targetGrammar: '〜にほかならない',
    exampleAnswer: 'このプロジェクトの成功は、チーム全体の協力があったからにほかなりません。',
  },
  {
    id: 'n2-transformation-1',
    jlptLevel: 'N2',
    category: 'transformation',
    title: 'Simultaneous Action (〜つつ)',
    promptText: 'Combine: Thinking about future career goals while working everyday.',
    targetGrammar: '〜つつ / 〜つつある',
    exampleAnswer: '自分の将来について考えつつ、毎日の仕事に取り組んでいます。',
  },
  {
    id: 'n2-shadowing-1',
    jlptLevel: 'N2',
    category: 'shadowing',
    title: 'Inevitability (〜ざるを得ない)',
    promptText: 'Listen and repeat: 天候悪化のため、予定を変更せざるを得ない。',
    targetGrammar: '〜ざるを得ない',
    exampleAnswer: 'てんこうあっかのため、よていをへんこうせざるをえない。',
  },

  // N1
  {
    id: 'n1-scenario-1',
    jlptLevel: 'N1',
    category: 'scenario',
    title: 'Firm Resolution (〜を余儀なくされる)',
    promptText: 'Explain formally how unexpected supply delays forced the factory to suspend production.',
    targetGrammar: '〜を余儀なくされる',
    exampleAnswer: '部品供給の遅延により、工場は休止を余儀なくされた。',
  },
  {
    id: 'n1-transformation-1',
    jlptLevel: 'N1',
    category: 'transformation',
    title: 'Uncompromising Stance (〜を限りに)',
    promptText: 'Declare that starting from today as the final boundary, bad habits will cease.',
    targetGrammar: '〜を限りに',
    exampleAnswer: '今日を限りに、不規則な生活習慣を改めようと決心した。',
  },
  {
    id: 'n1-shadowing-1',
    jlptLevel: 'N1',
    category: 'shadowing',
    title: 'Formal Dignity (〜にかかわる)',
    promptText: 'Listen and repeat: これは企業の信用にかかわる重大な問題だ。',
    targetGrammar: '〜にかかわる',
    exampleAnswer: 'これはきぎょうのしんようのかかわるじゅうだいなもんだいだ。',
  },
];
```

- [ ] **Step 2: Write failing test `src/services/drills/DrillService.test.ts`**

Create `src/services/drills/DrillService.test.ts`:
```typescript
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { DrillService } from './DrillService';
import { StorageRepository } from '../storage/StorageRepository';

describe('DrillService', () => {
  let storage: StorageRepository;
  let service: DrillService;

  beforeEach(async () => {
    storage = new StorageRepository('test_drills_db_' + Math.random());
    await storage.init();
    service = new DrillService(storage);
  });

  it('retrieves curated drills filtered by level', async () => {
    const n5Drills = await service.getDrillsByLevel('N5');
    expect(n5Drills.length).toBeGreaterThanOrEqual(3);
    expect(n5Drills.every((d) => d.jlptLevel === 'N5')).toBe(true);
  });

  it('creates and merges custom drills with curated drills', async () => {
    await service.createCustomDrill({
      id: 'custom-1',
      jlptLevel: 'N3',
      category: 'scenario',
      title: 'Custom N3 Drill',
      promptText: 'Use 〜ばかりでなく in a sentence.',
      targetGrammar: '〜ばかりでなく',
      isCustom: true,
    });

    const allN3 = await service.getDrillsByLevel('N3');
    const custom = allN3.find((d) => d.id === 'custom-1');
    expect(custom).toBeDefined();
    expect(custom?.title).toBe('Custom N3 Drill');
  });
});
```

- [ ] **Step 3: Implement `DrillService` in `src/services/drills/DrillService.ts`**

Create `src/services/drills/DrillService.ts`:
```typescript
import { CURATED_DRILLS } from '../../data/drills/curatedDrills';
import { DrillPrompt, JLPTLevel } from '../../types';
import { StorageRepository } from '../storage/StorageRepository';

export class DrillService {
  constructor(private storage: StorageRepository) {}

  async getAllDrills(): Promise<DrillPrompt[]> {
    const customDrills = await this.storage.getCustomDrills();
    return [...CURATED_DRILLS, ...customDrills];
  }

  async getDrillsByLevel(level: JLPTLevel): Promise<DrillPrompt[]> {
    const all = await this.getAllDrills();
    return all.filter((drill) => drill.jlptLevel === level);
  }

  async getDrillById(id: string): Promise<DrillPrompt | undefined> {
    const all = await this.getAllDrills();
    return all.find((d) => d.id === id);
  }

  async createCustomDrill(prompt: DrillPrompt): Promise<DrillPrompt> {
    const customPrompt: DrillPrompt = {
      ...prompt,
      isCustom: true,
    };
    await this.storage.saveCustomDrill(customPrompt);
    return customPrompt;
  }
}
```

- [ ] **Step 4: Run test suite**

Run: `npm test src/services/drills/DrillService.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit `DrillService`**

```bash
git add src/data/drills/ src/services/drills/
git commit -m "feat: implement curated JLPT N5-N1 drills and DrillService"
```

---

### Task 4: Japanese Persona System & System Instruction Builder (`PersonaService`)

**Files:**
- Create: `src/data/personas.ts`
- Create: `src/services/persona/PersonaService.ts`
- Create: `src/services/persona/PersonaService.test.ts`

**Interfaces:**
- Produces: `PERSONAS` array, `PersonaService.getPersona(id)`, `PersonaService.buildSystemInstruction(persona, level, furiganaEnabled)`.

- [ ] **Step 1: Write `src/data/personas.ts` with 4 Japanese conversation personas**

Create `src/data/personas.ts`:
```typescript
import { Persona } from '../types';

export const PERSONAS: Persona[] = [
  {
    id: 'casual_friend',
    name: 'Hiro / Aoi (Casual Friend)',
    japaneseName: 'ヒロ／アオイ（友達）',
    roleDescription: 'Friendly Tokyo native in their 20s. Speaks casual plain form (タメ口).',
    speechRegister: 'Plain / Casual (〜だよ, 〜じゃん, 〜するね)',
    systemPrompt: `You are a friendly 20-something Japanese friend living in Tokyo.
You speak only natural, colloquial Japanese in plain form (タメ口 - Tameguchi).
Do NOT use stiff polite forms (〜ます/〜です) unless playfully joking.
Keep your responses conversational, engaging, concise (1-3 sentences per turn), and encourage your partner to talk.`,
  },
  {
    id: 'izakaya_staff',
    name: 'Kenji (Izakaya & Store Staff)',
    japaneseName: 'ケンジ（店員・居酒屋）',
    roleDescription: 'Attentive izakaya and convenience store worker in Shibuya.',
    speechRegister: 'Polite Service Japanese (丁寧語・接客用語)',
    systemPrompt: `You are Kenji, an enthusiastic worker at a popular Tokyo izakaya and convenience store.
Use authentic Japanese customer service language (いらっしゃいませ, 少々お待ちください, 〜でございます).
Respond naturally to customer requests, food orders, questions about recommendations, or everyday shopping interactions. Keep responses crisp and realistic.`,
  },
  {
    id: 'jlpt_tutor',
    name: 'Sayuri (JLPT Oral Practice Tutor)',
    japaneseName: 'サユリ（日本語講師）',
    roleDescription: 'Patient and encouraging Japanese language tutor who adapts vocabulary to your target JLPT level.',
    speechRegister: 'Standard Polite (丁寧語 〜です／〜ます)',
    systemPrompt: `You are Sayuri, a supportive and professional Japanese language conversation tutor.
Speak in clear, natural polite Japanese (丁寧語).
Listen carefully to your student's speech. If the student makes a grammatical error or unnatural phrasing, gently include the naturally corrected recast within your conversational response while keeping the dialogue flowing warmly.`,
  },
  {
    id: 'workplace_formal',
    name: 'Tanaka-sensei (Formal Workplace & Interview)',
    japaneseName: '田中課長（ビジネス・面接）',
    roleDescription: 'Senior department manager at a Tokyo trading company.',
    speechRegister: 'Formal Business Keigo (尊敬語／謙譲語)',
    systemPrompt: `You are Tanaka-sensei, a senior manager at a traditional Tokyo enterprise.
Use authentic business Keigo (尊敬語 and 謙譲語) appropriate for formal meetings, job interviews, or client communication.
Expect polite phrasing from your partner and engage in professional, respectful corporate dialogue.`,
  },
];
```

- [ ] **Step 2: Write failing test `src/services/persona/PersonaService.test.ts`**

Create `src/services/persona/PersonaService.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { PersonaService } from './PersonaService';

describe('PersonaService', () => {
  const service = new PersonaService();

  it('returns persona by ID', () => {
    const tutor = service.getPersona('jlpt_tutor');
    expect(tutor.name).toContain('Sayuri');
  });

  it('builds full system instruction with target JLPT level constraint', () => {
    const instruction = service.buildSystemInstruction('jlpt_tutor', 'N3');
    expect(instruction).toContain('Sayuri');
    expect(instruction).toContain('TARGET JLPT LEVEL: N3');
  });
});
```

- [ ] **Step 3: Implement `PersonaService` in `src/services/persona/PersonaService.ts`**

Create `src/services/persona/PersonaService.ts`:
```typescript
import { PERSONAS } from '../../data/personas';
import { JLPTLevel, Persona, PersonaId } from '../../types';

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

  buildSystemInstruction(personaId: PersonaId, targetLevel: JLPTLevel): string {
    const persona = this.getPersona(personaId);

    return `${persona.systemPrompt}

TARGET JLPT LEVEL: ${targetLevel}
Adapt your vocabulary and grammatical complexity to match appropriate expectations for Japanese proficiency level ${targetLevel}.
Always respond entirely in authentic spoken Japanese. Keep your spoken turn natural and concise so the user has plenty of opportunity to practice speaking.`;
  }
}
```

- [ ] **Step 4: Run test suite**

Run: `npm test src/services/persona/PersonaService.test.ts`
Expected: PASS (2 tests passed)

- [ ] **Step 5: Commit `PersonaService`**

```bash
git add src/data/personas.ts src/services/persona/
git commit -m "feat: implement Japanese PersonaService and system prompt builder"
```

---

### Task 5: Structured Speaking Evaluation Engine (`EvaluationService`)

**Files:**
- Create: `src/services/ai/EvaluationService.ts`
- Create: `src/services/ai/EvaluationService.test.ts`

**Interfaces:**
- Consumes: `@google/genai` SDK (`gemini-3.5-flash` model with `responseSchema`).
- Produces: `EvaluationService.evaluateSpeech(userTranscript, targetPrompt, jlptLevel, apiKey)` returning `SpeakingAssessment`, and `EvaluationService.generateSessionReport(transcript, jlptLevel, apiKey)` returning `SessionReport`.

- [ ] **Step 1: Write failing test `src/services/ai/EvaluationService.test.ts`**

Create `src/services/ai/EvaluationService.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { EvaluationService } from './EvaluationService';

describe('EvaluationService', () => {
  const service = new EvaluationService();

  it('parses valid structured JSON assessment from gemini response', async () => {
    const mockAssessmentJson = JSON.stringify({
      overallScore: 85,
      grammarScore: 80,
      naturalnessScore: 90,
      userTranscript: 'コーヒーを飲みたいです。',
      nativeRecast: {
        japanese: 'コーヒーが飲みたいです。',
        furigana: 'コーヒーがのみたいです。',
        english: 'I would like to drink coffee.',
      },
      grammarCorrections: [
        {
          originalPart: 'コーヒーを',
          correctedPart: 'コーヒーが',
          explanation: 'With 飲みたい (desire), the particle が is often more natural for the object.',
          jlptLevel: 'N5',
        },
      ],
      keyVocabulary: [
        {
          word: '飲みたい',
          reading: 'のみたい',
          meaning: 'want to drink',
        },
      ],
    });

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: () => mockAssessmentJson,
    });

    const mockAiClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const result = await service.evaluateSpeechWithClient(
      mockAiClient as any,
      'コーヒーを飲みたいです。',
      'Tell someone you want coffee.',
      'N5'
    );

    expect(result.overallScore).toBe(85);
    expect(result.nativeRecast.japanese).toBe('コーヒーが飲みたいです。');
    expect(result.grammarCorrections).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implement `EvaluationService` in `src/services/ai/EvaluationService.ts`**

Create `src/services/ai/EvaluationService.ts`:
```typescript
import { GoogleGenAI, Type } from '@google/genai';
import {
  ConversationTurn,
  JLPTLevel,
  SessionReport,
  SpeakingAssessment,
} from '../../types';

export class EvaluationService {
  private getClient(apiKey: string): GoogleGenAI {
    return new GoogleGenAI({ apiKey });
  }

  async evaluateSpeech(
    userTranscript: string,
    promptContext: string,
    jlptLevel: JLPTLevel,
    apiKey: string
  ): Promise<SpeakingAssessment> {
    const ai = this.getClient(apiKey);
    return this.evaluateSpeechWithClient(ai, userTranscript, promptContext, jlptLevel);
  }

  async evaluateSpeechWithClient(
    ai: GoogleGenAI,
    userTranscript: string,
    promptContext: string,
    jlptLevel: JLPTLevel
  ): Promise<SpeakingAssessment> {
    const prompt = `You are an expert Japanese JLPT oral assessor.
Evaluate the following spoken Japanese utterance from a student targeting JLPT ${jlptLevel}.
Prompt context / exercise goal: "${promptContext}"
Student Utterance: "${userTranscript}"

Provide a detailed structured speaking assessment with scores (0-100), natural native recast with furigana, specific grammar corrections, and useful key vocabulary.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER, description: '0 to 100 overall score' },
            grammarScore: { type: Type.INTEGER, description: '0 to 100 grammar score' },
            naturalnessScore: { type: Type.INTEGER, description: '0 to 100 natural phrasing score' },
            userTranscript: { type: Type.STRING },
            nativeRecast: {
              type: Type.OBJECT,
              properties: {
                japanese: { type: Type.STRING },
                furigana: { type: Type.STRING },
                english: { type: Type.STRING },
              },
              required: ['japanese', 'furigana', 'english'],
            },
            grammarCorrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalPart: { type: Type.STRING },
                  correctedPart: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  jlptLevel: { type: Type.STRING },
                },
                required: ['originalPart', 'correctedPart', 'explanation', 'jlptLevel'],
              },
            },
            keyVocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  reading: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
                required: ['word', 'reading', 'meaning'],
              },
            },
          },
          required: [
            'overallScore',
            'grammarScore',
            'naturalnessScore',
            'userTranscript',
            'nativeRecast',
            'grammarCorrections',
            'keyVocabulary',
          ],
        },
      },
    });

    const rawText = response.text() || '{}';
    return JSON.parse(rawText) as SpeakingAssessment;
  }

  async generateSessionReport(
    transcript: ConversationTurn[],
    jlptLevel: JLPTLevel,
    apiKey: string
  ): Promise<SessionReport> {
    const ai = this.getClient(apiKey);
    const transcriptText = transcript
      .map((t) => `[${t.speaker.toUpperCase()}]: ${t.text}`)
      .join('\n');

    const prompt = `Analyze this Japanese conversation transcript for a student targeting JLPT ${jlptLevel}.
Transcript:
${transcriptText}

Provide an executive session feedback summary, top 3 grammar corrections from the user's speech, natural phrasing tips, and estimated JLPT level.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            topGrammarCorrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalPart: { type: Type.STRING },
                  correctedPart: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  jlptLevel: { type: Type.STRING },
                },
                required: ['originalPart', 'correctedPart', 'explanation', 'jlptLevel'],
              },
            },
            naturalPhrasingTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            estimatedLevel: { type: Type.STRING },
          },
          required: ['summary', 'topGrammarCorrections', 'naturalPhrasingTips', 'estimatedLevel'],
        },
      },
    });

    const rawText = response.text() || '{}';
    return JSON.parse(rawText) as SessionReport;
  }
}
```

- [ ] **Step 3: Run test suite**

Run: `npm test src/services/ai/EvaluationService.test.ts`
Expected: PASS (1 test passed)

- [ ] **Step 4: Commit `EvaluationService`**

```bash
git add src/services/ai/EvaluationService.ts src/services/ai/EvaluationService.test.ts
git commit -m "feat: implement structured EvaluationService using gemini-3.5-flash"
```

---

### Task 6: Audio Worklet & PCM Queue Manager for Gemini Live API (`LiveAudioClient`)

**Files:**
- Create: `src/services/audio/AudioCapture.ts`
- Create: `src/services/audio/AudioPlayer.ts`
- Create: `src/services/audio/AudioPlayer.test.ts`
- Create: `src/services/ai/LiveAudioClient.ts`

**Interfaces:**
- Produces: `AudioCapture.start(onPcmChunk)`, `AudioCapture.stop()`, `AudioPlayer.enqueuePcm24k(base64)`, `AudioPlayer.getVolumeRms()`, `LiveAudioClient.connect(persona, level, apiKey)`, `LiveAudioClient.disconnect()`, `LiveAudioClient.onTurnEvent(callback)`.

- [ ] **Step 1: Write `src/services/audio/AudioPlayer.ts` and unit test `AudioPlayer.test.ts`**

Create `src/services/audio/AudioPlayer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { AudioPlayer } from './AudioPlayer';

describe('AudioPlayer', () => {
  it('calculates RMS volume from base64 PCM data', () => {
    const player = new AudioPlayer();
    // 16-bit PCM buffer with non-zero values
    const samples = new Int16Array([1000, -1000, 2000, -2000]);
    const uint8 = new Uint8Array(samples.buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    const rms = player.calculateRmsFromBase64Pcm(base64);
    expect(rms).toBeGreaterThan(0);
    expect(rms).toBeLessThanOrEqual(1.0);
  });
});
```

Create `src/services/audio/AudioPlayer.ts`:
```typescript
export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private currentRms = 0;

  private getContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
    }
    return this.audioCtx;
  }

  calculateRmsFromBase64Pcm(base64Pcm: string): number {
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    if (int16.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < int16.length; i++) {
      const normalized = int16[i] / 32768.0;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / int16.length);
    this.currentRms = Math.min(1.0, rms * 3.0);
    return this.currentRms;
  }

  getVolumeRms(): number {
    return this.currentRms;
  }

  async enqueuePcm24k(base64Pcm: string): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.calculateRmsFromBase64Pcm(base64Pcm);

    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const start = Math.max(ctx.currentTime, this.nextPlayTime);
    source.start(start);
    this.nextPlayTime = start + buffer.duration;
  }

  clearQueue(): void {
    this.nextPlayTime = 0;
    this.currentRms = 0;
  }

  close(): void {
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
```

- [ ] **Step 2: Implement `src/services/audio/AudioCapture.ts`**

Create `src/services/audio/AudioCapture.ts`:
```typescript
export class AudioCapture {
  private audioCtx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private currentRms = 0;

  getVolumeRms(): number {
    return this.currentRms;
  }

  async start(onPcmChunkBase64: (base64: string) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
      },
    });

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtxClass({ sampleRate: 16000 });
    this.source = this.audioCtx.createMediaStreamSource(this.stream);

    // Using ScriptProcessor for maximum cross-browser client-side simplicity without external worklet file loads
    this.processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      let sum = 0;
      const int16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const sample = Math.max(-1, Math.min(1, inputData[i]));
        sum += sample * sample;
        int16[i] = sample < 0 ? sample * 32768 : sample * 32767;
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.currentRms = Math.min(1.0, rms * 4.0);

      const uint8 = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      onPcmChunkBase64(btoa(binary));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.currentRms = 0;
  }
}
```

- [ ] **Step 3: Implement `src/services/ai/LiveAudioClient.ts`**

Create `src/services/ai/LiveAudioClient.ts`:
```typescript
import { AudioCapture } from '../audio/AudioCapture';
import { AudioPlayer } from '../audio/AudioPlayer';
import { PersonaService } from '../persona/PersonaService';
import { JLPTLevel, PersonaId } from '../../types';

export interface TurnEvent {
  speaker: 'user' | 'ai';
  text: string;
  interrupted?: boolean;
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

  async connect(personaId: PersonaId, jlptLevel: JLPTLevel, apiKey: string): Promise<void> {
    if (this.isConnected) {
      this.disconnect();
    }

    const systemInstructionText = this.personaService.buildSystemInstruction(
      personaId,
      jlptLevel
    );

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      this.isConnected = true;
      const setupMessage = {
        setup: {
          model: 'models/gemini-3.1-flash-live-preview',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
        },
      };
      this.ws?.send(JSON.stringify(setupMessage));

      await this.capture.start((pcmBase64) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'audio/pcm;rate=16000',
                    data: pcmBase64,
                  },
                ],
              },
            })
          );
        }
      });
    };

    this.ws.onmessage = async (evt) => {
      let data: any;
      if (typeof evt.data === 'string') {
        data = JSON.parse(evt.data);
      } else if (evt.data instanceof Blob) {
        const text = await evt.data.text();
        data = JSON.parse(text);
      } else {
        return;
      }

      if (data.serverContent?.interrupted) {
        this.player.clearQueue();
        if (this.onTurnEventCallback) {
          this.onTurnEventCallback({ speaker: 'ai', text: '', interrupted: true });
        }
      }

      const modelTurn = data.serverContent?.modelTurn;
      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
            await this.player.enqueuePcm24k(part.inlineData.data);
          }
          if (part.text && this.onTurnEventCallback) {
            this.onTurnEventCallback({ speaker: 'ai', text: part.text });
          }
        }
      }
    };

    this.ws.onerror = (e) => {
      console.error('Gemini Live API WebSocket error:', e);
    };
  }

  disconnect(): void {
    this.isConnected = false;
    this.capture.stop();
    this.player.clearQueue();
    this.player.close();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

- [ ] **Step 4: Run unit tests**

Run: `npm test src/services/audio/AudioPlayer.test.ts`
Expected: PASS (1 test passed)

- [ ] **Step 5: Commit audio and live client layer**

```bash
git add src/services/audio/ src/services/ai/LiveAudioClient.ts
git commit -m "feat: implement Web Audio PCM capture, queue player, and LiveAudioClient"
```

---

### Task 7: Settings Context & Settings View (`/settings`)

**Files:**
- Create: `src/context/SettingsContext.tsx`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/settings/SettingsView.tsx`
- Create: `src/components/settings/SettingsView.test.tsx`

**Interfaces:**
- Consumes: `StorageRepository` export/import methods.
- Produces: `useSettings()` hook with `apiKey`, `setApiKey`, `defaultLevel`, `setDefaultLevel`, `furiganaEnabled`, `setFuriganaEnabled`.

- [ ] **Step 1: Write `src/context/SettingsContext.tsx`**

Create `src/context/SettingsContext.tsx`:
```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { JLPTLevel } from '../types';

interface SettingsContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  defaultLevel: JLPTLevel;
  setDefaultLevel: (level: JLPTLevel) => void;
  furiganaEnabled: boolean;
  setFuriganaEnabled: (enabled: boolean) => void;
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

  return (
    <SettingsContext.Provider
      value={{
        apiKey,
        setApiKey,
        defaultLevel,
        setDefaultLevel,
        furiganaEnabled,
        setFuriganaEnabled,
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

- [ ] **Step 2: Write failing test `src/components/settings/SettingsView.test.tsx`**

Create `src/components/settings/SettingsView.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SettingsProvider } from '../../context/SettingsContext';
import { SettingsView } from './SettingsView';
import { StorageRepository } from '../../services/storage/StorageRepository';

describe('SettingsView', () => {
  const repo = new StorageRepository('test_settings_db_' + Math.random());

  it('allows entering and saving an API key', () => {
    render(
      <SettingsProvider>
        <SettingsView repository={repo} />
      </SettingsProvider>
    );

    const input = screen.getByLabelText(/Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AIzaSyTestKey123' } });

    expect(screen.getByDisplayValue('AIzaSyTestKey123')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement `src/components/settings/SettingsView.tsx`**

Create `src/components/settings/SettingsView.tsx`:
```tsx
import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { JLPTLevel } from '../../types';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { Key, Upload, Download, ShieldCheck } from 'lucide-react';

interface SettingsViewProps {
  repository: StorageRepository;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ repository }) => {
  const { apiKey, setApiKey, defaultLevel, setDefaultLevel, furiganaEnabled, setFuriganaEnabled } =
    useSettings();

  const [message, setMessage] = useState<string | null>(null);

  const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

  const handleExport = async () => {
    const data = await repository.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nihongo-partner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('All study data exported successfully.');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await repository.importAllData(data);
      setMessage('Study data imported successfully!');
    } catch (err) {
      setMessage('Failed to import JSON backup. Invalid file format.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Settings & Configuration</h2>
        <p className="text-sm text-slate-400">
          Manage your Gemini API key, default JLPT target level, and local study data backups.
        </p>
      </div>

      {message && (
        <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-indigo-300 text-sm">
          {message}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-200">Gemini API Key</h3>
        </div>

        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-slate-300 mb-2">
            Gemini API Key (stored securely in your browser localStorage)
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Obtain your API key from Google AI Studio. It never leaves your browser device.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-200">Study Preferences</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Default Target JLPT Level
            </label>
            <div className="flex gap-2">
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDefaultLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    defaultLevel === lvl
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Furigana Annotation Mode
            </label>
            <button
              type="button"
              onClick={() => setFuriganaEnabled(!furiganaEnabled)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                furiganaEnabled
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {furiganaEnabled ? 'Furigana Enabled (ふりがな)' : 'Kanji Only (漢字のみ)'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-slate-200">Local Data Backup & Migration</h3>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export All Study Data (JSON)
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Backup JSON
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Implement Navigation Header `src/components/layout/Header.tsx`**

Create `src/components/layout/Header.tsx`:
```tsx
import React from 'react';
import { Mic, BookOpen, BookMarked, LayoutDashboard, Settings } from 'lucide-react';

export type ActiveTab = 'partner' | 'drills' | 'notebook' | 'dashboard' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  streakDays: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, streakDays }) => {
  const tabs = [
    { id: 'partner', label: 'Live Partner', icon: Mic },
    { id: 'drills', label: 'JLPT Drills', icon: BookOpen },
    { id: 'notebook', label: 'Notebook', icon: BookMarked },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            日
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-base">Nihongo Speaking Partner</h1>
            <p className="text-xs text-slate-400">Daily Japanese Speaking Studio</p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold">
          <span>🔥</span>
          <span>{streakDays} Days</span>
        </div>
      </div>
    </header>
  );
};
```

- [ ] **Step 5: Run tests**

Run: `npm test src/components/settings/SettingsView.test.tsx`
Expected: PASS (1 test passed)

- [ ] **Step 6: Commit Settings view & Header**

```bash
git add src/context/ src/components/layout/ src/components/settings/
git commit -m "feat: implement SettingsContext, SettingsView, and Navigation Header"
```

---

### Task 8: Study Dashboard & Streak Tracker (`/dashboard`)

**Files:**
- Create: `src/components/dashboard/DashboardView.tsx`
- Create: `src/components/dashboard/DashboardView.test.tsx`

**Interfaces:**
- Consumes: `StorageRepository.getUserStats()`, `StorageRepository.getSessions()`, `StorageRepository.getDrillProgressList()`.

- [ ] **Step 1: Write failing test `src/components/dashboard/DashboardView.test.tsx`**

Create `src/components/dashboard/DashboardView.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DashboardView } from './DashboardView';
import { StorageRepository } from '../../services/storage/StorageRepository';

describe('DashboardView', () => {
  const repo = new StorageRepository('test_dash_db_' + Math.random());

  it('renders stats dashboard cards', async () => {
    render(<DashboardView repository={repo} />);
    expect(await screen.findByText(/Daily Speaking Goal/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `src/components/dashboard/DashboardView.tsx`**

Create `src/components/dashboard/DashboardView.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SessionRecord, DrillProgressRecord, UserStatsRecord } from '../../types';
import { Flame, Clock, Trophy, CheckCircle2 } from 'lucide-react';

interface DashboardViewProps {
  repository: StorageRepository;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ repository }) => {
  const [stats, setStats] = useState<UserStatsRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [drillsProgress, setDrillsProgress] = useState<DrillProgressRecord[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [s, sess, d] = await Promise.all([
        repository.getUserStats(),
        repository.getSessions(),
        repository.getDrillProgressList(),
      ]);
      if (active) {
        setStats(s);
        setSessions(sess);
        setDrillsProgress(d);
      }
    })();
    return () => {
      active = false;
    };
  }, [repository]);

  if (!stats) {
    return <div className="p-8 text-center text-slate-400">Loading study dashboard...</div>;
  }

  const avgDrillScore =
    drillsProgress.length > 0
      ? Math.round(
          drillsProgress.reduce((acc, d) => acc + d.assessment.overallScore, 0) /
            drillsProgress.length
        )
      : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Study Dashboard & Streaks</h2>
        <p className="text-sm text-slate-400">
          Track your daily Japanese speaking activity and overall JLPT level proficiency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Current Streak</p>
            <p className="text-2xl font-bold text-slate-100">{stats.dailyStreak} Days</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Practice Time</p>
            <p className="text-2xl font-bold text-slate-100">{stats.totalMinutesPracticed} mins</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Completed Drills</p>
            <p className="text-2xl font-bold text-slate-100">{drillsProgress.length}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Avg Drill Score</p>
            <p className="text-2xl font-bold text-slate-100">{avgDrillScore}%</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">Daily Speaking Goal</h3>
        <div className="w-full bg-slate-950 rounded-full h-4 overflow-hidden border border-slate-800">
          <div
            className="bg-indigo-600 h-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (stats.totalMinutesPracticed / stats.dailyGoalMinutes) * 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-400">
          Practiced {stats.totalMinutesPracticed} mins out of your {stats.dailyGoalMinutes} min daily goal.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">Recent Speaking Sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">No past live partner sessions recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {sessions.map((s) => (
              <div key={s.id} className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    JLPT {s.jlptLevel} Partner Session ({s.personaId})
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(s.timestamp).toLocaleDateString()} — {Math.round(s.durationSeconds / 60)} mins
                  </p>
                </div>
                {s.feedbackReport && (
                  <span className="text-xs px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    Est. Level: {s.feedbackReport.estimatedLevel}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Run dashboard tests**

Run: `npm test src/components/dashboard/DashboardView.test.tsx`
Expected: PASS (1 test passed)

- [ ] **Step 4: Commit Dashboard view**

```bash
git add src/components/dashboard/
git commit -m "feat: implement Study Dashboard with streaks and activity logs"
```

---

### Task 9: Mistake & Vocabulary Notebook (`/notebook`)

**Files:**
- Create: `src/components/notebook/NotebookView.tsx`
- Create: `src/components/notebook/NotebookView.test.tsx`

**Interfaces:**
- Consumes: `StorageRepository.getNotebookItems()`, `StorageRepository.saveNotebookItem()`, `StorageRepository.deleteNotebookItem()`.

- [ ] **Step 1: Write failing test `src/components/notebook/NotebookView.test.tsx`**

Create `src/components/notebook/NotebookView.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NotebookView } from './NotebookView';
import { StorageRepository } from '../../services/storage/StorageRepository';

describe('NotebookView', () => {
  const repo = new StorageRepository('test_notebook_db_' + Math.random());

  it('renders empty notebook state when no entries exist', async () => {
    render(<NotebookView repository={repo} />);
    expect(await screen.findByText(/No saved mistakes or vocabulary items/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `src/components/notebook/NotebookView.tsx`**

Create `src/components/notebook/NotebookView.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { NotebookItemRecord, JLPTLevel } from '../../types';
import { Volume2, Trash2, CheckCircle, Search } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface NotebookViewProps {
  repository: StorageRepository;
}

export const NotebookView: React.FC<NotebookViewProps> = ({ repository }) => {
  const { furiganaEnabled } = useSettings();
  const [items, setItems] = useState<NotebookItemRecord[]>([]);
  const [filterLevel, setFilterLevel] = useState<JLPTLevel | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'grammar' | 'vocabulary' | 'pronunciation'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadItems = async () => {
    const list = await repository.getNotebookItems();
    setItems(list);
  };

  useEffect(() => {
    loadItems();
  }, [repository]);

  const handleDelete = async (id: string) => {
    await repository.deleteNotebookItem(id);
    await loadItems();
  };

  const handleToggleMastered = async (item: NotebookItemRecord) => {
    await repository.saveNotebookItem({ ...item, mastered: !item.mastered });
    await loadItems();
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterLevel !== 'ALL' && item.jlptLevel !== filterLevel) return false;
    if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.originalText.toLowerCase().includes(q) ||
        item.correctedText.toLowerCase().includes(q) ||
        item.explanation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Mistake & Vocabulary Notebook</h2>
        <p className="text-sm text-slate-400">
          Revisit and master your saved grammar corrections, natural phrasing recasts, and vocabulary.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notebook notes..."
            className="bg-transparent text-sm text-slate-200 focus:outline-none w-full"
          />
        </div>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as any)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="ALL">All Levels</option>
          <option value="N5">JLPT N5</option>
          <option value="N4">JLPT N4</option>
          <option value="N3">JLPT N3</option>
          <option value="N2">JLPT N2</option>
          <option value="N1">JLPT N1</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as any)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200"
        >
          <option value="ALL">All Categories</option>
          <option value="grammar">Grammar Corrections</option>
          <option value="vocabulary">Vocabulary</option>
          <option value="pronunciation">Pronunciation</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">No saved mistakes or vocabulary items found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-900 border rounded-xl p-5 transition-colors ${
                item.mastered ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-500/30">
                      {item.jlptLevel}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                      {item.category}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Your Attempt / Original:</p>
                    <p className="text-sm text-rose-400 line-through">{item.originalText}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Native Recast / Corrected:</p>
                    <p className="text-lg font-semibold text-emerald-400">
                      {furiganaEnabled && item.furiganaText ? item.furiganaText : item.correctedText}
                    </p>
                  </div>

                  <p className="text-sm text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                    {item.explanation}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSpeak(item.correctedText)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Speak Corrected Sentence"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMastered(item)}
                    className={`p-2 rounded-lg transition-colors ${
                      item.mastered
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                    }`}
                    title="Mark as Mastered"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Run notebook tests**

Run: `npm test src/components/notebook/NotebookView.test.tsx`
Expected: PASS (1 test passed)

- [ ] **Step 4: Commit Notebook view**

```bash
git add src/components/notebook/
git commit -m "feat: implement Mistake & Vocabulary Notebook with speech playback and filtering"
```

---

### Task 10: JLPT Drill Studio (`/drills`) & Practice Evaluation Modal

**Files:**
- Create: `src/components/drills/CreateCustomDrillModal.tsx`
- Create: `src/components/drills/DrillStudioView.tsx`
- Create: `src/components/drills/DrillStudioView.test.tsx`

**Interfaces:**
- Consumes: `DrillService`, `EvaluationService`, `StorageRepository.saveDrillProgress()`, `StorageRepository.saveNotebookItem()`.

- [ ] **Step 1: Write `src/components/drills/CreateCustomDrillModal.tsx`**

Create `src/components/drills/CreateCustomDrillModal.tsx`:
```tsx
import React, { useState } from 'react';
import { DrillPrompt, JLPTLevel } from '../../types';

interface CreateCustomDrillModalProps {
  onClose: () => void;
  onCreate: (drill: DrillPrompt) => void;
}

export const CreateCustomDrillModal: React.FC<CreateCustomDrillModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [targetGrammar, setTargetGrammar] = useState('');
  const [jlptLevel, setJlptLevel] = useState<JLPTLevel>('N4');
  const [category, setCategory] = useState<'scenario' | 'transformation' | 'shadowing'>('scenario');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !promptText) return;

    onCreate({
      id: 'custom-' + Date.now(),
      jlptLevel,
      category,
      title,
      promptText,
      targetGrammar,
      isCustom: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-6">
        <h3 className="text-lg font-bold text-slate-100">Create Custom Speaking Prompt</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Asking for leave politely"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">JLPT Level</label>
              <select
                value={jlptLevel}
                onChange={(e) => setJlptLevel(e.target.value as JLPTLevel)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="scenario">Scenario Response</option>
                <option value="transformation">Grammar Transformation</option>
                <option value="shadowing">Shadowing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Prompt Instructions</label>
            <textarea
              required
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={3}
              placeholder="Describe the situation or prompt..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Target Grammar Pattern</label>
            <input
              type="text"
              value={targetGrammar}
              onChange={(e) => setTargetGrammar(e.target.value)}
              placeholder="〜てもいいですか"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
            >
              Create Prompt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Write failing test `src/components/drills/DrillStudioView.test.tsx`**

Create `src/components/drills/DrillStudioView.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DrillStudioView } from './DrillStudioView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SettingsProvider } from '../../context/SettingsContext';

describe('DrillStudioView', () => {
  const repo = new StorageRepository('test_drill_studio_db_' + Math.random());

  it('renders curated drill cards', async () => {
    render(
      <SettingsProvider>
        <DrillStudioView repository={repo} />
      </SettingsProvider>
    );
    expect(await screen.findByText(/JLPT Speaking Drills/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement `src/components/drills/DrillStudioView.tsx`**

Create `src/components/drills/DrillStudioView.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { DrillService } from '../../services/drills/DrillService';
import { EvaluationService } from '../../services/ai/EvaluationService';
import { DrillPrompt, JLPTLevel, SpeakingAssessment } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { CreateCustomDrillModal } from './CreateCustomDrillModal';
import { Plus, CheckCircle, Sparkles, BookPlus } from 'lucide-react';

interface DrillStudioViewProps {
  repository: StorageRepository;
}

export const DrillStudioView: React.FC<DrillStudioViewProps> = ({ repository }) => {
  const { apiKey, defaultLevel } = useSettings();
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>(defaultLevel);
  const [drills, setDrills] = useState<DrillPrompt[]>([]);
  const [selectedDrill, setSelectedDrill] = useState<DrillPrompt | null>(null);
  const [userSpeechText, setUserSpeechText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [assessment, setAssessment] = useState<SpeakingAssessment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const drillService = new DrillService(repository);
  const evalService = new EvaluationService();

  const loadDrills = async (level: JLPTLevel) => {
    const list = await drillService.getDrillsByLevel(level);
    setDrills(list);
  };

  useEffect(() => {
    loadDrills(selectedLevel);
  }, [selectedLevel]);

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrill || !userSpeechText.trim()) return;
    if (!apiKey) {
      alert('Please configure your Gemini API Key in Settings first.');
      return;
    }

    setEvaluating(true);
    try {
      const result = await evalService.evaluateSpeech(
        userSpeechText,
        `${selectedDrill.title}: ${selectedDrill.promptText} (Target Grammar: ${selectedDrill.targetGrammar})`,
        selectedDrill.jlptLevel,
        apiKey
      );

      setAssessment(result);

      await repository.saveDrillProgress({
        id: 'progress-' + Date.now(),
        drillId: selectedDrill.id,
        jlptLevel: selectedDrill.jlptLevel,
        completedAt: Date.now(),
        assessment: result,
      });
    } catch (err) {
      console.error('Evaluation error:', err);
      alert('Failed to evaluate speech response. Check API key.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleAddToNotebook = async () => {
    if (!assessment || !selectedDrill) return;
    await repository.saveNotebookItem({
      id: 'note-' + Date.now(),
      createdAt: Date.now(),
      category: 'grammar',
      jlptLevel: selectedDrill.jlptLevel,
      originalText: assessment.userTranscript,
      correctedText: assessment.nativeRecast.japanese,
      furiganaText: assessment.nativeRecast.furigana,
      explanation:
        assessment.grammarCorrections[0]?.explanation ||
        `Native recast for prompt: ${selectedDrill.title}`,
      mastered: false,
    });
    alert('Saved to your Mistake & Vocabulary Notebook!');
  };

  const levels: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">JLPT Speaking Drills</h2>
          <p className="text-sm text-slate-400">
            Structured prompt exercises with instant grammar & naturalness scoring.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Custom Prompt
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {levels.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setSelectedLevel(lvl)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedLevel === lvl
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            JLPT {lvl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {drills.map((drill) => (
          <div
            key={drill.id}
            onClick={() => {
              setSelectedDrill(drill);
              setAssessment(null);
              setUserSpeechText('');
            }}
            className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-500/30">
                {drill.jlptLevel}
              </span>
              <span className="text-xs text-slate-400 uppercase">{drill.category}</span>
            </div>

            <h3 className="font-semibold text-slate-100">{drill.title}</h3>
            <p className="text-sm text-slate-400 line-clamp-2">{drill.promptText}</p>
            <p className="text-xs text-indigo-400 font-mono">Target: {drill.targetGrammar}</p>
          </div>
        ))}
      </div>

      {selectedDrill && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-400 font-semibold">{selectedDrill.jlptLevel} Drill</span>
                <h3 className="text-xl font-bold text-slate-100">{selectedDrill.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrill(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <p className="text-sm font-medium text-slate-200">{selectedDrill.promptText}</p>
              <p className="text-xs text-indigo-400">Target Grammar: {selectedDrill.targetGrammar}</p>
            </div>

            {!assessment ? (
              <form onSubmit={handleEvaluate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Your Spoken Response (Type or dictate your spoken answer in Japanese)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={userSpeechText}
                    onChange={(e) => setUserSpeechText(e.target.value)}
                    placeholder="e.g. すみません、でんしゃがおくれてしまい..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="submit"
                    disabled={evaluating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    {evaluating ? 'Evaluating with Gemini...' : 'Evaluate Speaking Response'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-lg text-center border border-slate-800">
                    <p className="text-xs text-slate-400">Overall Score</p>
                    <p className="text-2xl font-bold text-indigo-400">{assessment.overallScore}/100</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg text-center border border-slate-800">
                    <p className="text-xs text-slate-400">Grammar</p>
                    <p className="text-2xl font-bold text-emerald-400">{assessment.grammarScore}/100</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-lg text-center border border-slate-800">
                    <p className="text-xs text-slate-400">Natural Phrasing</p>
                    <p className="text-2xl font-bold text-amber-400">{assessment.naturalnessScore}/100</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400">Native Recast (Better Phrasing):</p>
                  <p className="text-base font-semibold text-emerald-400">
                    {assessment.nativeRecast.japanese}
                  </p>
                  <p className="text-xs text-slate-400">{assessment.nativeRecast.english}</p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleAddToNotebook}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium"
                  >
                    <BookPlus className="w-4 h-4" />
                    Save to Notebook
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessment(null)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
                  >
                    Try Another Drill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateCustomDrillModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (drill) => {
            await drillService.createCustomDrill(drill);
            await loadDrills(selectedLevel);
          }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run drill studio tests**

Run: `npm test src/components/drills/DrillStudioView.test.tsx`
Expected: PASS (1 test passed)

- [ ] **Step 5: Commit JLPT Drill Studio**

```bash
git add src/components/drills/
git commit -m "feat: implement JLPT Drill Studio with structured scoring and custom prompt modal"
```

---

### Task 11: Live Partner Studio (`/partner`) with Real-Time Audio & Waveform Visualizer

**Files:**
- Create: `src/components/partner/WaveformVisualizer.tsx`
- Create: `src/components/partner/LivePartnerView.tsx`
- Create: `src/components/partner/LivePartnerView.test.tsx`

**Interfaces:**
- Consumes: `LiveAudioClient`, `EvaluationService.generateSessionReport()`, `PersonaService.getAllPersonas()`, `StorageRepository.saveSession()`.

- [ ] **Step 1: Write `src/components/partner/WaveformVisualizer.tsx`**

Create `src/components/partner/WaveformVisualizer.tsx`:
```tsx
import React from 'react';

interface WaveformVisualizerProps {
  inputRms: number;
  outputRms: number;
  isActive: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  inputRms,
  outputRms,
  isActive,
}) => {
  const level = Math.max(inputRms, outputRms);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16">
      {[...Array(9)].map((_, idx) => {
        const factor = 1 - Math.abs(idx - 4) * 0.15;
        const height = isActive ? Math.max(12, level * factor * 56) : 8;
        return (
          <div
            key={idx}
            className="w-1.5 rounded-full bg-indigo-500 transition-all duration-75"
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Write failing test `src/components/partner/LivePartnerView.test.tsx`**

Create `src/components/partner/LivePartnerView.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LivePartnerView } from './LivePartnerView';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { SettingsProvider } from '../../context/SettingsContext';

describe('LivePartnerView', () => {
  const repo = new StorageRepository('test_partner_db_' + Math.random());

  it('renders persona selectors and conversation controls', async () => {
    render(
      <SettingsProvider>
        <LivePartnerView repository={repo} />
      </SettingsProvider>
    );
    expect(await screen.findByText(/Choose Your Conversation Partner/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement `src/components/partner/LivePartnerView.tsx`**

Create `src/components/partner/LivePartnerView.tsx`:
```tsx
import React, { useState, useEffect, useRef } from 'react';
import { StorageRepository } from '../../services/storage/StorageRepository';
import { PersonaService } from '../../services/persona/PersonaService';
import { EvaluationService } from '../../services/ai/EvaluationService';
import { LiveAudioClient } from '../../services/ai/LiveAudioClient';
import { PersonaId, ConversationTurn, SessionReport } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { WaveformVisualizer } from './WaveformVisualizer';
import { Mic, MicOff, PhoneOff, Sparkles, BookPlus } from 'lucide-react';

interface LivePartnerViewProps {
  repository: StorageRepository;
}

export const LivePartnerView: React.FC<LivePartnerViewProps> = ({ repository }) => {
  const { apiKey, defaultLevel, furiganaEnabled } = useSettings();
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>('casual_friend');
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [rmsLevels, setRmsLevels] = useState({ inputRms: 0, outputRms: 0 });
  const [report, setReport] = useState<SessionReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const personaService = new PersonaService();
  const evalService = new EvaluationService();
  const clientRef = useRef<LiveAudioClient | null>(null);

  useEffect(() => {
    clientRef.current = new LiveAudioClient();
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const startSession = async () => {
    if (!apiKey) {
      alert('Please configure your Gemini API Key in Settings first.');
      return;
    }
    const client = clientRef.current;
    if (!client) return;

    setTranscript([]);
    setReport(null);

    client.onTurnEvent((turn) => {
      setTranscript((prev) => [
        ...prev,
        {
          id: 'turn-' + Date.now() + '-' + Math.random(),
          speaker: turn.speaker,
          text: turn.text,
          timestamp: Date.now(),
        },
      ]);
    });

    await client.connect(selectedPersona, defaultLevel, apiKey);
    setIsConnected(true);
  };

  const endSession = async () => {
    clientRef.current?.disconnect();
    setIsConnected(false);

    if (transcript.length > 0) {
      await repository.saveSession({
        id: 'sess-' + Date.now(),
        timestamp: Date.now(),
        durationSeconds: 300,
        personaId: selectedPersona,
        jlptLevel: defaultLevel,
        transcript,
      });
    }
  };

  const handleGenerateReport = async () => {
    if (transcript.length === 0 || !apiKey) return;
    setGeneratingReport(true);
    try {
      const rep = await evalService.generateSessionReport(transcript, defaultLevel, apiKey);
      setReport(rep);
    } catch (err) {
      console.error(err);
      alert('Failed to generate session feedback report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const personas = personaService.getAllPersonas();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Live Conversation Partner Studio</h2>
        <p className="text-sm text-slate-400">
          Ultra-low-latency voice conversation roleplay powered by Gemini Live API WebSockets.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Choose Your Conversation Partner</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personas.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={isConnected}
              onClick={() => setSelectedPersona(p.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedPersona === p.id
                  ? 'bg-indigo-950/40 border-indigo-500'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <p className="font-semibold text-slate-100">{p.name}</p>
              <p className="text-xs text-indigo-400 mt-0.5">{p.speechRegister}</p>
              <p className="text-xs text-slate-400 mt-2">{p.roleDescription}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center space-y-6">
        <WaveformVisualizer
          inputRms={rmsLevels.inputRms}
          outputRms={rmsLevels.outputRms}
          isActive={isConnected}
        />

        {!isConnected ? (
          <button
            type="button"
            onClick={startSession}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Mic className="w-5 h-5" />
            Start Live Conversation
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={endSession}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-all"
            >
              <PhoneOff className="w-5 h-5" />
              End Conversation
            </button>
          </div>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-200">Conversation Transcript</h3>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              {generatingReport ? 'Evaluating Session...' : 'Generate Feedback Report'}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-3 p-4 rounded-lg bg-slate-950 border border-slate-800">
            {transcript.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-lg max-w-[80%] ${
                  t.speaker === 'user'
                    ? 'ml-auto bg-indigo-900/40 border border-indigo-500/30'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              >
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  {t.speaker === 'user' ? 'You' : 'Speaking Partner'}
                </p>
                <p className="text-sm text-slate-100">{t.text}</p>
              </div>
            ))}
          </div>

          {report && (
            <div className="p-5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-4">
              <h4 className="font-bold text-indigo-400">Executive Session Feedback</h4>
              <p className="text-sm text-slate-200">{report.summary}</p>

              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2">Top Grammar Patterns to Review:</p>
                <ul className="space-y-2">
                  {report.topGrammarCorrections.map((g, idx) => (
                    <li key={idx} className="text-sm bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <p className="text-rose-400 line-through">{g.originalPart}</p>
                      <p className="text-emerald-400 font-semibold">{g.correctedPart}</p>
                      <p className="text-xs text-slate-400 mt-1">{g.explanation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run partner studio unit tests**

Run: `npm test src/components/partner/LivePartnerView.test.tsx`
Expected: PASS (1 test passed)

- [ ] **Step 5: Commit Live Partner Studio**

```bash
git add src/components/partner/
git commit -m "feat: implement Live Partner Studio with waveform visualizer and session reports"
```

---

### Task 12: Root Application Integration (`App.tsx`) & Full Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: All 5 views (`LivePartnerView`, `DrillStudioView`, `NotebookView`, `DashboardView`, `SettingsView`), `SettingsProvider`, `Header`.

- [ ] **Step 1: Write integration test in `src/App.test.tsx`**

Replace `src/App.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Integration', () => {
  it('renders header and allows switching between tabs', async () => {
    render(<App />);
    expect(screen.getByText(/Nihongo Speaking Partner/i)).toBeInTheDocument();

    const drillsTab = screen.getByRole('button', { name: /JLPT Drills/i });
    fireEvent.click(drillsTab);
    expect(await screen.findByText(/JLPT Speaking Drills/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement full multi-view application root `src/App.tsx`**

Replace `src/App.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { Header, ActiveTab } from './components/layout/Header';
import { LivePartnerView } from './components/partner/LivePartnerView';
import { DrillStudioView } from './components/drills/DrillStudioView';
import { NotebookView } from './components/notebook/NotebookView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { StorageRepository } from './services/storage/StorageRepository';

const repository = new StorageRepository();

const MainContent: React.FC = () => {
  const { apiKey } = useSettings();
  const [activeTab, setActiveTab] = useState<ActiveTab>('partner');
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    repository.getUserStats().then((stats) => {
      setStreakDays(stats.dailyStreak);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} streakDays={streakDays} />

      {!apiKey && activeTab !== 'settings' && (
        <div className="max-w-5xl mx-auto w-full px-4 mt-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <p className="text-sm text-amber-300">
              Gemini API Key is not configured yet. Configure your API key to enable live voice speaking practice.
            </p>
            <button
              onClick={() => setActiveTab('settings')}
              className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium"
            >
              Go to Settings
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeTab === 'partner' && <LivePartnerView repository={repository} />}
        {activeTab === 'drills' && <DrillStudioView repository={repository} />}
        {activeTab === 'notebook' && <NotebookView repository={repository} />}
        {activeTab === 'dashboard' && <DashboardView repository={repository} />}
        {activeTab === 'settings' && <SettingsView repository={repository} />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <SettingsProvider>
      <MainContent />
    </SettingsProvider>
  );
}
```

- [ ] **Step 3: Run complete unit & integration test suite**

Run: `npm test`
Expected: PASS (All test files pass with 0 errors)

- [ ] **Step 4: Execute production TypeScript type check and production bundle verification**

Run: `npm run build`
Expected: PASS (`vite v5.x.x building for production... built in xxx ms.`)

- [ ] **Step 5: Commit integration and complete feature branch**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: complete root application integration and verify full test suite"
```
