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
  goalVerdict?: {
    status: 'ACHIEVED' | 'PARTIALLY_ACHIEVED' | 'MISSED';
    analysis: string;
  };
}

export interface RoleplayScenario {
  id: string;
  title: string;
  jlptLevel: JLPTLevel;
  category: 'dining' | 'travel' | 'business' | 'daily_life' | 'emergency';
  goalDescription: string;
  userRole: string;
  aiRole: string;
  aiPromptContext?: string;
  isCustom?: boolean;
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
