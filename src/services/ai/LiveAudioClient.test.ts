import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveAudioClient } from './LiveAudioClient';

vi.mock('../audio/AudioCapture', () => ({
  AudioCapture: class {
    start = vi.fn().mockResolvedValue(undefined);
    getVolumeRms = vi.fn().mockReturnValue(0);
  },
}));

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: any }) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onclose: ((e: any) => void) | null = null;
  readyState = 1; // OPEN
  send = vi.fn();
  close = vi.fn(() => {
    if (this.onclose) this.onclose({ code: 1000, reason: 'normal' });
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 5);
  }
}

describe('LiveAudioClient', () => {
  let originalWebSocket: any;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = global.WebSocket;
    (global as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    (global as any).WebSocket = originalWebSocket;
  });

  it('sends clientContent turn trigger upon setupComplete when initiator is ai_first', async () => {
    const client = new LiveAudioClient();
    await client.connect('casual_friend', 'N4', 'test-key', undefined, undefined, 'auto', 'auto', 'ai_first');

    const wsInstance = MockWebSocket.instances[0];
    expect(wsInstance).toBeDefined();

    // Clear calls from setup message
    wsInstance.send.mockClear();

    // Simulate receiving setupComplete from Gemini Live server
    if (wsInstance.onmessage) {
      wsInstance.onmessage({ data: JSON.stringify({ setupComplete: true }) });
    }

    expect(wsInstance.send).toHaveBeenCalledWith(
      expect.stringContaining('clientContent')
    );
    expect(wsInstance.send).toHaveBeenCalledWith(
      expect.stringContaining('会話を開始してください')
    );
  });

  it('does NOT send clientContent turn trigger upon setupComplete when initiator is user_first', async () => {
    const client = new LiveAudioClient();
    await client.connect('casual_friend', 'N4', 'test-key', undefined, undefined, 'auto', 'auto', 'user_first');

    const wsInstance = MockWebSocket.instances[0];
    wsInstance.send.mockClear();

    if (wsInstance.onmessage) {
      wsInstance.onmessage({ data: JSON.stringify({ setupComplete: true }) });
    }

    expect(wsInstance.send).not.toHaveBeenCalledWith(
      expect.stringContaining('clientContent')
    );
  });
});
