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

    const rawText =
      (typeof response.text === 'function'
        ? (response.text as () => string)()
        : response.text) || '{}';
    return JSON.parse(rawText) as SpeakingAssessment;
  }

  async generateSessionReport(
    transcript: ConversationTurn[],
    jlptLevel: JLPTLevel,
    apiKey: string
  ): Promise<SessionReport> {
    const ai = this.getClient(apiKey);
    return this.generateSessionReportWithClient(ai, transcript, jlptLevel);
  }

  async generateSessionReportWithClient(
    ai: GoogleGenAI,
    transcript: ConversationTurn[],
    jlptLevel: JLPTLevel
  ): Promise<SessionReport> {
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
}
