export class SpeechSynthesisService {
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  private static activeId: string | null = null;

  static speak(
    id: string,
    text: string,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onError) onError(new Error('SpeechSynthesis not supported in this browser.'));
      return;
    }

    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.95;

    utterance.onend = () => {
      if (this.activeId === id) {
        this.activeId = null;
        this.activeUtterance = null;
        if (onEnd) onEnd();
      }
    };

    utterance.onerror = (e) => {
      if (this.activeId === id) {
        this.activeId = null;
        this.activeUtterance = null;
        if (onError) onError(e);
      }
    };

    this.activeId = id;
    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  static cancel(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.activeId = null;
    this.activeUtterance = null;
  }

  static getActiveId(): string | null {
    return this.activeId;
  }

  static getActiveUtterance(): SpeechSynthesisUtterance | null {
    return this.activeUtterance;
  }
}
