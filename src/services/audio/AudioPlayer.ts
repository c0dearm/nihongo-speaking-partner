export class AudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private currentRms = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

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

    source.onended = () => {
      this.activeSources.delete(source);
    };

    const start = Math.max(ctx.currentTime, this.nextPlayTime);
    source.start(start);
    this.activeSources.add(source);
    this.nextPlayTime = start + buffer.duration;
  }

  clearQueue(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Source may have already stopped
      }
    });
    this.activeSources.clear();
    this.nextPlayTime = 0;
    this.currentRms = 0;
  }

  close(): void {
    this.clearQueue();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
