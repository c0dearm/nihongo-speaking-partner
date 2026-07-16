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
        title: 'Izakaya Table Reservation',
        category: 'dining',
        goalDescription: 'Call a busy izakaya to reserve a table for 4 people for Saturday at 7:30 PM under the name Tanaka.',
        userRole: 'Customer calling to make a reservation',
        aiRole: 'Busy izakaya host/hostess on the phone',
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
    expect(suggestions[0].japanese).toBe('最近、何に興味がありますか？');
    expect(suggestions[0].tier).toBe('easy');
    expect(suggestions[1].japanese).toBe('最近、どんな映画や音楽に興味がありますか？');
    expect(suggestions[1].tier).toBe('natural');
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

  it('generateFuriganaWithClient calls gemini-3.1-flash-lite-preview with square bracket prompt and strips markdown code blocks', async () => {
    const service = new EvaluationService();
    const mockAiClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: '```text\n私は漢字[かんじ]を勉強[べんきょう]しています\n```',
        }),
      },
    };

    const result = await service.generateFuriganaWithClient(
      mockAiClient as any,
      '私は漢字を勉強しています'
    );

    expect(result).toBe('私は漢字[かんじ]を勉強[べんきょう]しています');
    expect(mockAiClient.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.1-flash-lite-preview',
        contents: expect.stringContaining('漢字[かんじ]を読む[よむ]'),
      })
    );
  });

  it('deduplicates in-flight generateFuriganaWithClient requests for the same text', async () => {
    const service = new EvaluationService();
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const mockAiClient = {
      models: {
        generateContent: vi.fn().mockImplementation(() => delayedPromise),
      },
    };

    const p1 = service.generateFuriganaWithClient(mockAiClient as any, '漢字を勉強する');
    const p2 = service.generateFuriganaWithClient(mockAiClient as any, '漢字を勉強する');

    expect(mockAiClient.models.generateContent).toHaveBeenCalledTimes(1);

    resolvePromise!({
      text: '漢字[かんじ]を勉強[べんきょう]する',
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1).toBe('漢字[かんじ]を勉強[べんきょう]する');
    expect(res2).toBe('漢字[かんじ]を勉強[べんきょう]する');
  });

  it('lookupTurnVocabulary calls gemini-3.1-flash-lite-preview with structured schema and caches/deduplicates requests', async () => {
    const service = new EvaluationService();
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    const mockAiClient = {
      models: {
        generateContent: vi.fn().mockImplementation(() => delayedPromise),
      },
    };

    const p1 = service.lookupTurnVocabularyWithClient(
      mockAiClient as any,
      '詳しい内容を検討します。',
      'N3'
    );
    const p2 = service.lookupTurnVocabularyWithClient(
      mockAiClient as any,
      '詳しい内容を検討します。',
      'N3'
    );

    expect(mockAiClient.models.generateContent).toHaveBeenCalledTimes(1);
    expect(mockAiClient.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.1-flash-lite-preview',
        contents: expect.stringContaining('詳しい内容を検討します。'),
      })
    );

    const sampleVocab = [
      { word: '詳しい', reading: 'くわしい', meaning: 'Detailed; accurate', jlptLevel: 'N3' },
      { word: '検討', reading: 'けんとう', meaning: 'Consideration; examination', jlptLevel: 'N3' },
    ];

    resolvePromise!({
      text: JSON.stringify(sampleVocab),
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    expect(res1).toEqual(sampleVocab);
    expect(res2).toEqual(sampleVocab);

    // 3rd call should hit cache and not call generateContent again
    const res3 = await service.lookupTurnVocabularyWithClient(
      mockAiClient as any,
      '詳しい内容を検討します。',
      'N3'
    );
    expect(res3).toEqual(sampleVocab);
    expect(mockAiClient.models.generateContent).toHaveBeenCalledTimes(1);
  });

  it('lookupTurnVocabularyWithClient keys cache by jlptLevel and normalizes level', async () => {
    const service = new EvaluationService();
    const mockGenerateContent = vi.fn().mockImplementation(async ({ contents }: any) => {
      if (contents.includes('Student\'s Target Proficiency: JLPT N5')) {
        return {
          text: JSON.stringify([
            { word: '単語', reading: 'たんご', meaning: 'word', jlptLevel: 'n5' },
            { word: '無効', reading: 'むこう', meaning: 'invalid level', jlptLevel: 'INVALID' },
          ]),
        };
      }
      return {
        text: JSON.stringify([
          { word: '単語', reading: 'たんご', meaning: 'word', jlptLevel: 'N2' },
        ]),
      };
    });

    const mockAiClient = {
      models: {
        generateContent: mockGenerateContent,
      },
    };

    const n5Result = await service.lookupTurnVocabularyWithClient(
      mockAiClient as any,
      '同じテキスト',
      'N5'
    );

    expect(n5Result).toEqual([
      { word: '単語', reading: 'たんご', meaning: 'word', jlptLevel: 'N5' },
      { word: '無効', reading: 'むこう', meaning: 'invalid level', jlptLevel: 'N5' },
    ]);

    const n2Result = await service.lookupTurnVocabularyWithClient(
      mockAiClient as any,
      '同じテキスト',
      'N2'
    );

    expect(n2Result).toEqual([
      { word: '単語', reading: 'たんご', meaning: 'word', jlptLevel: 'N2' },
    ]);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

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
});





