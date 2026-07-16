import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpeechSynthesisService } from './SpeechSynthesisService';

describe('SpeechSynthesisService', () => {
  let mockSpeak: any;
  let mockCancel: any;
  let mockUtteranceInstance: any;

  beforeEach(() => {
    SpeechSynthesisService.cancel();
    mockSpeak = vi.fn((ut: any) => {
      mockUtteranceInstance = ut;
    });
    mockCancel = vi.fn();

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = '';
      rate = 1;
      onend: (() => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockSpeechSynthesisUtterance,
      writable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      value: { speak: mockSpeak, cancel: mockCancel },
      writable: true,
    });
  });

  it('speaks japanese text with ja-JP lang and tracks activeId', () => {
    const onEnd = vi.fn();
    SpeechSynthesisService.speak('turn-1', 'こんにちは', onEnd);

    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockUtteranceInstance.text).toBe('こんにちは');
    expect(mockUtteranceInstance.lang).toBe('ja-JP');
    expect(SpeechSynthesisService.getActiveId()).toBe('turn-1');

    // Trigger onend
    mockUtteranceInstance.onend?.();
    expect(SpeechSynthesisService.getActiveId()).toBeNull();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('cancels speech cleanly', () => {
    SpeechSynthesisService.speak('turn-2', 'ありがとう');
    expect(SpeechSynthesisService.getActiveId()).toBe('turn-2');

    SpeechSynthesisService.cancel();
    expect(mockCancel).toHaveBeenCalled();
    expect(SpeechSynthesisService.getActiveId()).toBeNull();
  });
});
