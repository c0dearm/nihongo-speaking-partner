import { GoogleGenAI, Type } from '@google/genai';
import {
  ConversationTurn,
  JLPTLevel,
  SessionReport,
  SpeakingAssessment,
  RoleplayScenario,
  SpeakingSuggestion,
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

    const rawText =
      (typeof response.text === 'function'
        ? (response.text as () => string)()
        : response.text) || '{}';
    return JSON.parse(rawText) as SpeakingAssessment;
  }

  async generateSessionReport(
    transcript: ConversationTurn[],
    jlptLevel: JLPTLevel,
    apiKey: string,
    scenario?: RoleplayScenario
  ): Promise<SessionReport> {
    const ai = this.getClient(apiKey);
    return this.generateSessionReportWithClient(ai, transcript, jlptLevel, scenario);
  }

  async generateSessionReportWithClient(
    ai: GoogleGenAI,
    transcript: ConversationTurn[],
    jlptLevel: JLPTLevel,
    scenario?: RoleplayScenario
  ): Promise<SessionReport> {
    const transcriptText = transcript
      .map((t) => `[${t.speaker.toUpperCase()}]: ${t.text}`)
      .join('\n');

    let prompt = `Analyze this Japanese conversation transcript for a student targeting JLPT ${jlptLevel}.
Transcript:
${transcriptText}

Provide an executive session feedback summary, top 3 grammar corrections from the user's speech, natural phrasing tips, and estimated JLPT level.`;

    if (scenario) {
      prompt += `\n\nSECRET CONVERSATION GOAL: ${scenario.goalDescription}
The user was playing: "${scenario.userRole}" and the AI was playing: "${scenario.aiRole}".
Evaluate whether the user successfully communicated all requirements of their secret goal across the multi-turn dialogue. Provide a goal verdict status (ACHIEVED, PARTIALLY_ACHIEVED, or MISSED) and detailed goal analysis.`;
    }

    const properties: Record<string, any> = {
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
    };

    const required = ['summary', 'topGrammarCorrections', 'naturalPhrasingTips', 'estimatedLevel'];

    if (scenario) {
      properties.goalVerdict = {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
          analysis: { type: Type.STRING },
        },
        required: ['status', 'analysis'],
      };
      required.push('goalVerdict');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties,
          required,
        },
      },
    });

    const rawText =
      (typeof response.text === 'function'
        ? (response.text as () => string)()
        : response.text) || '{}';
    return JSON.parse(rawText) as SessionReport;
  }

  private static furiganaCache = new Map<string, string>();

  async generateFurigana(text: string, apiKey: string): Promise<string> {
    const ai = this.getClient(apiKey);
    return this.generateFuriganaWithClient(ai, text);
  }

  async generateFuriganaWithClient(ai: GoogleGenAI, text: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return text;

    // If text already has bracket/ruby furigana readings, return immediately without network call
    if (trimmed.includes('<ruby>') || /[(（[［{｛<《][ぁ-んァ-ンa-zA-Z0-9]+[)）\]］}｝>》]/.test(trimmed)) {
      return text;
    }

    if (EvaluationService.furiganaCache.has(trimmed)) {
      return EvaluationService.furiganaCache.get(trimmed)!;
    }

    const prompt = `Add Japanese furigana readings to the following text using round bracket format where each kanji word is followed by its reading in parentheses, for example: 漢字(かんじ)を読む(よむ). Only output the annotated text with round parentheses, nothing else. Do not use square brackets.
Text to annotate: "${trimmed}"`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 500,
          thinkingConfig: { thinkingBudget: 0 },
        } as any,
      });
      const raw = typeof response.text === 'function' ? (response.text as () => string)() : response.text;
      const result = raw ? raw.trim() : text;
      EvaluationService.furiganaCache.set(trimmed, result);
      return result;
    } catch (e) {
      console.error('Failed to generate furigana:', e);
      return text;
    }
  }

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
      const ai = this.getClient(apiKey);
      return await this.generateSpeakingSuggestionsWithClient(ai, transcript, scenario, targetLevel);
    } catch (err) {
      console.error('[EvaluationService] Failed to generate speaking suggestions:', err);
      return [];
    }
  }

  async generateSpeakingSuggestionsWithClient(
    ai: GoogleGenAI,
    transcript: ConversationTurn[],
    scenario: RoleplayScenario,
    targetLevel: JLPTLevel
  ): Promise<SpeakingSuggestion[]> {
    try {
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
          setTimeout(() => reject(new Error('Suggestions request timed out after 6000ms')), 6000)
        ),
      ]);

      const jsonText = typeof response.text === 'function' ? (response.text as () => string)() : response.text;
      if (!jsonText) return [];
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('[EvaluationService] Failed to generate speaking suggestions:', err);
      return [];
    }
  }
}
