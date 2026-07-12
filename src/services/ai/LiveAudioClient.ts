import { AudioCapture } from '../audio/AudioCapture';
import { AudioPlayer } from '../audio/AudioPlayer';
import { PersonaService } from '../persona/PersonaService';
import { JLPTLevel, PersonaId } from '../../types';

export interface TurnEvent {
  speaker: 'user' | 'ai';
  text: string;
  interrupted?: boolean;
  turnComplete?: boolean;
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
    console.log('[LiveAudioClient] Connecting to WebSocket:', wsUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      this.isConnected = true;
      console.log('[LiveAudioClient] WebSocket onopen fired. Sending setup message...');
      const setupMessage = {
        setup: {
          model: 'models/gemini-3.1-flash-live-preview',
          generationConfig: {
            responseModalities: ['AUDIO', 'TEXT'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
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
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: pcmBase64,
                },
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

      console.log('[LiveAudioClient] Received WebSocket frame:', data);

      if (data.setupComplete) {
        console.log('[LiveAudioClient] Setup successfully completed with Gemini server.');
      }

      if (data.error || data.error_details) {
        console.error('[LiveAudioClient] Server returned error:', data.error || data.error_details);
        if (this.onTurnEventCallback) {
          const errorMsg = typeof data.error === 'object' ? data.error.message || JSON.stringify(data.error) : String(data.error || 'Unknown server error');
          this.onTurnEventCallback({
            speaker: 'ai',
            text: `⚠️ [Server Error]: ${errorMsg}`,
          });
        }
      }

      if (data.serverContent?.interrupted) {
        console.log('[LiveAudioClient] AI turn interrupted by user speech.');
        this.player.clearQueue();
        if (this.onTurnEventCallback) {
          this.onTurnEventCallback({ speaker: 'ai', text: '', interrupted: true });
        }
      }

      if (data.serverContent?.turnComplete) {
        console.log('[LiveAudioClient] AI turn complete.');
        if (this.onTurnEventCallback) {
          this.onTurnEventCallback({ speaker: 'ai', text: '', turnComplete: true });
        }
      }

      const inputTranscript = data.serverContent?.inputTranscription?.text || data.serverContent?.input_transcription?.text;
      if (inputTranscript && this.onTurnEventCallback) {
        console.log('[LiveAudioClient] User input transcription:', inputTranscript);
        this.onTurnEventCallback({ speaker: 'user', text: inputTranscript });
      }

      const outputTranscript = data.serverContent?.outputTranscription?.text || data.serverContent?.output_transcription?.text;
      if (outputTranscript && this.onTurnEventCallback) {
        console.log('[LiveAudioClient] AI output transcription:', outputTranscript);
        this.onTurnEventCallback({ speaker: 'ai', text: outputTranscript });
      }

      const modelTurn = data.serverContent?.modelTurn;
      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/pcm')) {
            console.log('[LiveAudioClient] Received audio/pcm output chunk, bytes:', part.inlineData.data?.length);
            await this.player.enqueuePcm24k(part.inlineData.data);
          }
          if (part.text && !outputTranscript && this.onTurnEventCallback) {
            console.log('[LiveAudioClient] Received text part:', part.text);
            this.onTurnEventCallback({ speaker: 'ai', text: part.text });
          }
        }
      }
    };

    this.ws.onerror = (e) => {
      console.error('[LiveAudioClient] WebSocket onerror event:', e);
      if (this.onTurnEventCallback) {
        this.onTurnEventCallback({
          speaker: 'ai',
          text: '⚠️ [Connection Error]: WebSocket connection encountered an error.',
        });
      }
    };

    this.ws.onclose = (e) => {
      console.warn('[LiveAudioClient] WebSocket onclose fired. Code:', e.code, 'Reason:', e.reason);
      this.isConnected = false;
      if (e.code !== 1000 && this.onTurnEventCallback) {
        this.onTurnEventCallback({
          speaker: 'ai',
          text: `⚠️ [Connection Closed]: Code ${e.code} ${e.reason ? `(${e.reason})` : ''}`,
        });
      }
    };
  }

  disconnect(): void {
    console.log('[LiveAudioClient] Disconnecting and cleaning up resources...');
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
