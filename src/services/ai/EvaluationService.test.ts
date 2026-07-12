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

  it('generateSessionReportWithClient requests goalVerdict when a roleplay scenario is passed', async () => {
    const mockReportJson = JSON.stringify({
      summary: 'Good negotiation attempt.',
      topGrammarCorrections: [],
      naturalPhrasingTips: [],
      estimatedLevel: 'N4',
      goalVerdict: {
        status: 'ACHIEVED',
        analysis: 'You successfully stated the reservation time and party size.',
      },
    });

    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: () => mockReportJson,
    });

    const mockAiClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const result = await service.generateSessionReportWithClient(
      mockAiClient as any,
      [{ id: 't1', speaker: 'user', text: '予約をお願いします。', timestamp: 1000 }],
      'N4',
      {
        id: 'n4-izakaya',
        title: 'Izakaya Reservation',
        jlptLevel: 'N4',
        category: 'dining',
        goalDescription: 'Reserve a table for 5 for Saturday at 7 PM.',
        userRole: 'Customer',
        aiRole: 'Host',
      }
    );

    expect(result.goalVerdict?.status).toBe('ACHIEVED');
    expect(result.goalVerdict?.analysis).toContain('successfully stated');
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining('SECRET CONVERSATION GOAL: Reserve a table for 5 for Saturday at 7 PM.'),
        config: expect.objectContaining({
          responseSchema: expect.objectContaining({
            properties: expect.objectContaining({
              goalVerdict: expect.any(Object),
            }),
          }),
        }),
      })
    );
  });

  it('generates turn-by-turn speaking suggestions for a roleplay mission when using test-api-key', async () => {
    const service = new EvaluationService();
    const suggestions = await service.generateSpeakingSuggestions(
      [
        { id: 't1', speaker: 'ai', text: 'いらっしゃいませ！何名様でしょうか？', timestamp: Date.now() - 5000 },
      ],
      'N4',
      'test-api-key',
      {
        id: 'izakaya_reserve',
        title: 'Reserving an Izakaya Table',
        category: 'dining',
        goalDescription: 'Call an izakaya to reserve a table for 5 people for Saturday at 7pm under Tanaka.',
        userRole: 'Customer calling the izakaya',
        aiRole: 'Izakaya host taking reservations on the phone',
      }
    );

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions[0]).toHaveProperty('japanese');
    expect(suggestions[0]).toHaveProperty('furigana');
    expect(suggestions[0]).toHaveProperty('english');
    expect(suggestions[0]).toHaveProperty('tip');
  });

  it('generateSpeakingSuggestions returns free-chat mock suggestions when test-api-key is used and scenario is undefined', async () => {
    const service = new EvaluationService();
    const suggestions = await service.generateSpeakingSuggestions(
      [
        { id: 't1', speaker: 'ai', text: 'こんにちは！何について話しましょうか？', timestamp: Date.now() - 5000 },
      ],
      'N4',
      'test-api-key',
      undefined
    );

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].japanese).toBe('最近、どんな映画や音楽に興味がありますか？');
    expect(suggestions[1].japanese).toBe('週末はいつもどのように過ごしていますか？');
  });

  it('generates roleplay speaking suggestions with furigana using gemini-3.1-flash-lite-preview and strict JSON schema', async () => {
    const service = new EvaluationService();
    const mockSuggestionsJson = JSON.stringify([
      {
        japanese: '予約をお願いします。',
        furigana: '予約[よやく]をお願[ねが]いします。',
        english: 'I would like to make a reservation, please.',
        tip: 'Simple reservation request.',
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
      [{ id: 't1', speaker: 'ai', text: '何名様でしょうか？', timestamp: 1000 }],
      'N4',
      {
        id: 'izakaya_reserve',
        title: 'Reserving an Izakaya Table',
        category: 'dining',
        goalDescription: 'Reserve for 5.',
        userRole: 'Customer',
        aiRole: 'Host',
      }
    );

    expect(result).toHaveLength(1);
    expect(result[0].japanese).toBe('予約をお願いします。');
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.1-flash-lite-preview',
        contents: expect.stringContaining('AI Partner: 何名様でしょうか？'),
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          responseSchema: expect.objectContaining({
            type: 'ARRAY',
          }),
        }),
      })
    );
  });

  it('enforces a 12-second timeout and returns empty array if mid-conversation suggestions request times out', async () => {
    vi.useFakeTimers();
    const service = new EvaluationService();
    const mockGenerateContent = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 15000)));

    const mockAiClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const promise = service.generateSpeakingSuggestionsWithClient(
      mockAiClient as any,
      [{ id: 't1', speaker: 'ai', text: '何名様でしょうか？', timestamp: 1000 }],
      'N4',
      {
        id: 'izakaya_reserve',
        title: 'Reserving an Izakaya Table',
        category: 'dining',
        goalDescription: 'Reserve for 5.',
        userRole: 'Customer',
        aiRole: 'Host',
      }
    );

    vi.advanceTimersByTime(12000);
    const result = await promise;
    expect(result).toEqual([]);
    vi.useRealTimers();
  });

  it('returns kickstart conversation opening suggestions if turn 0 request throws or times out', async () => {
    vi.useFakeTimers();
    const service = new EvaluationService();
    const mockGenerateContent = vi.fn().mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Network error')), 100)));

    const mockAiClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const promise = service.generateSpeakingSuggestionsWithClient(
      mockAiClient as any,
      [], // Turn 0
      'N4',
      {
        id: 'izakaya_reserve',
        title: 'Reserving an Izakaya Table',
        category: 'dining',
        goalDescription: 'Reserve for 5.',
        userRole: 'Customer',
        aiRole: 'Host',
      }
    );

    vi.advanceTimersByTime(200);
    const result = await promise;
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].japanese).toContain('お話ししたいこと');
    vi.useRealTimers();
  });

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
        model: 'gemini-3.1-flash-lite-preview',
        contents: expect.stringContaining('Conversation Type: Free open-ended casual conversation on everyday topics.'),
      })
    );
  });
});



