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
    if (this.audioCtx.state === 'suspended') {
      console.log('[AudioCapture] AudioContext suspended on start, resuming...');
      await this.audioCtx.resume();
    }
    console.log('[AudioCapture] Started microphone. AudioContext sampleRate:', this.audioCtx.sampleRate);
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
      const base64 = btoa(binary);
      onPcmChunkBase64(base64);
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
