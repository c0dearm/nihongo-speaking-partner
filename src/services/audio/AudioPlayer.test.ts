import { describe, it, expect } from 'vitest';
import { AudioPlayer } from './AudioPlayer';

describe('AudioPlayer', () => {
  it('calculates RMS volume from base64 PCM data', () => {
    const player = new AudioPlayer();
    // 16-bit PCM buffer with non-zero values
    const samples = new Int16Array([1000, -1000, 2000, -2000]);
    const uint8 = new Uint8Array(samples.buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    const rms = player.calculateRmsFromBase64Pcm(base64);
    expect(rms).toBeGreaterThan(0);
    expect(rms).toBeLessThanOrEqual(1.0);
  });
});
