import { describe, it, expect, vi } from 'vitest';
import { EvaluationService } from './EvaluationService';
import { ConversationTurn } from '../../types';

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
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-flash',
        config: expect.objectContaining({
          responseMimeType: 'application/json',
        }),
      })
    );
  });

  it('parses valid structured JSON session report from gemini response', async () => {
    const mockReportJson = JSON.stringify({
      summary: 'Good attempt at N5 conversation.',
      topGrammarCorrections: [
        {
          originalPart: '本をよむ',
          correctedPart: '本を読みます',
          explanation: 'Use polite form in this context.',
          jlptLevel: 'N5',
        },
      ],
      naturalPhrasingTips: ['Try to use fillers like ええと naturally.'],
      estimatedLevel: 'N5',
    });

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: () => mockReportJson,
    });

    const mockAiClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const transcript: ConversationTurn[] = [
      {
        id: '1',
        speaker: 'ai',
        text: 'こんにちは！',
        timestamp: 1000,
      },
      {
        id: '2',
        speaker: 'user',
        text: 'こんにちは、本をよむ。',
        timestamp: 2000,
      },
    ];

    const result = await service.generateSessionReportWithClient(
      mockAiClient as any,
      transcript,
      'N5'
    );

    expect(result.summary).toBe('Good attempt at N5 conversation.');
    expect(result.topGrammarCorrections).toHaveLength(1);
    expect(result.naturalPhrasingTips).toContain('Try to use fillers like ええと naturally.');
    expect(result.estimatedLevel).toBe('N5');
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-flash',
        config: expect.objectContaining({
          responseMimeType: 'application/json',
        }),
      })
    );
  });

  it('handles response.text as a direct property string (new SDK v0.2.0 behavior)', async () => {
    const mockAssessmentJson = JSON.stringify({
      overallScore: 90,
      grammarScore: 88,
      naturalnessScore: 92,
      userTranscript: 'テストです。',
      nativeRecast: {
        japanese: 'テストです。',
        furigana: 'てすとです。',
        english: 'This is a test.',
      },
      grammarCorrections: [],
      keyVocabulary: [],
    });

    const mockAiClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: mockAssessmentJson,
        }),
      },
    };

    const result = await service.evaluateSpeechWithClient(
      mockAiClient as any,
      'テストです。',
      'Context',
      'N5'
    );

    expect(result.overallScore).toBe(90);
    expect(result.nativeRecast.english).toBe('This is a test.');
  });

  it('evaluateSpeech delegates to evaluateSpeechWithClient with created client', async () => {
    const spy = vi
      .spyOn(service, 'evaluateSpeechWithClient')
      .mockResolvedValueOnce({
        overallScore: 100,
        grammarScore: 100,
        naturalnessScore: 100,
        userTranscript: 'はい',
        nativeRecast: {
          japanese: 'はい',
          furigana: 'はい',
          english: 'Yes',
        },
        grammarCorrections: [],
        keyVocabulary: [],
      });

    const result = await service.evaluateSpeech('はい', 'Reply yes', 'N5', 'fake-api-key');

    expect(result.overallScore).toBe(100);
    expect(spy).toHaveBeenCalled();
  });

  it('generateSessionReport delegates to generateSessionReportWithClient with created client', async () => {
    const spy = vi
      .spyOn(service, 'generateSessionReportWithClient')
      .mockResolvedValueOnce({
        summary: 'Excellent session',
        topGrammarCorrections: [],
        naturalPhrasingTips: [],
        estimatedLevel: 'N3',
      });

    const result = await service.generateSessionReport([], 'N3', 'fake-api-key');

    expect(result.summary).toBe('Excellent session');
    expect(spy).toHaveBeenCalled();
  });
});
