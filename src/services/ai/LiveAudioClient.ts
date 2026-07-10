import { AudioCapture } from '../audio/AudioCapture';
import { AudioPlayer } from '../audio/AudioPlayer';
import { PersonaService } from '../persona/PersonaService';
import { JLPTLevel, PersonaId } from '../../types';

export interface TurnEvent {
  speaker: 'user' | 'ai';
  text: string;
  interrupted?: boolean;
}

export class LiveAudioClient {
  private ws: WebSocket | null = null;
  private capture: AudioCapture;
  private player: AudioPlayer;
  private personaService: PersonaService;
  private onTurnEventCallback?: (event: TurnEvent) => void;
  private isConnected = false;

  constructor() {
    this.capture = new AudioCapture();
    this.player = new AudioPlayer();
    this.personaService = new PersonaService();
  }

  onTurnEvent(cb: (event: TurnEvent) => void): void {
    this.onTurnEventCallback = cb;
  }

  getVolumes(): { inputRms: number; outputRms: number } {
    return {
      inputRms: this.capture.getVolumeRms(),
      outputRms: this.player.getVolumeRms(),
    };
  }

  async connect(personaId: PersonaId, jlptLevel: JLPTLevel, apiKey: string): Promise<void> {
    if (this.isConnected) {
      this.disconnect();
    }

    const systemInstructionText = this.personaService.buildSystemInstruction(
      personaId,
      jlptLevel
    );

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      this.isConnected = true;
      const setupMessage = {
        setup: {
          model: 'models/gemini-3.1-flash-live-preview',
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
        },
      };
      this.ws?.send(JSON.stringify(setupMessage));

      await this.capture.start((pcmBase64) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: 'audio/pcm;rate=16000',
                    data: pcmBase64,
                  },
                ],
              },
            })
          );
        }
      });
    };

    this.ws.onmessage = async (evt) => {
      let data: any;
      if (typeof evt.data === 'string') {
        data = JSON.parse(evt.data);
      } else if (evt.data instanceof Blob) {
        const text = await evt.data.text();
        data = JSON.parse(text);
      } else {
        return;
      }

      if (data.serverContent?.interrupted) {
        this.player.clearQueue();
        if (this.onTurnEventCallback) {
          this.onTurnEventCallback({ speaker: 'ai', text: '', interrupted: true });
        }
      }

      const modelTurn = data.serverContent?.modelTurn;
      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
            await this.player.enqueuePcm24k(part.inlineData.data);
          }
          if (part.text && this.onTurnEventCallback) {
            this.onTurnEventCallback({ speaker: 'ai', text: part.text });
          }
        }
      }
    };

    this.ws.onerror = (e) => {
      console.error('Gemini Live API WebSocket error:', e);
    };
  }

  disconnect(): void {
    this.isConnected = false;
    this.capture.stop();
    this.player.clearQueue();
    this.player.close();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
