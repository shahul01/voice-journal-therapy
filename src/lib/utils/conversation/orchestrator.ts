import { AudioCapture, type AudioCaptureConfig } from '$lib/utils/audio/capture';
import { AudioPlayback } from '$lib/utils/audio/playback';
import { VoiceActivityDetector } from '$lib/utils/audio/vad';
import { convertToWav } from '$lib/utils/audio/wav-converter';
import { addMessage, getContextForGemini } from './index';
import type { ConversationState } from '$lib/types/conversation';
import type { Profile } from '$lib/types/profile';

function downloadAndLogAudio(audioBlob: Blob, prefix: string = 'recording'): void {
	if (typeof window === 'undefined') return;

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `${prefix}_${timestamp}.wav`;

	const url = URL.createObjectURL(audioBlob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);

	console.log(`[Audio] Downloaded: ${filename}`, {
		size: audioBlob.size,
		type: audioBlob.type,
		timestamp: new Date().toISOString()
	});
}

export interface OrchestratorConfig {
	onTranscriptUpdate: (state: ConversationState) => void;
	onError: (error: Error) => void;
	onStateChange: (state: 'idle' | 'listening' | 'processing' | 'speaking') => void;
	onRecordingStateChange?: (isRecording: boolean) => void;
	profile: Profile;
}

export class ConversationOrchestrator {
	private audioCapture: AudioCapture | null = null;
	private audioPlayback: AudioPlayback;
	private vad: VoiceActivityDetector | null = null;
	private conversationState: ConversationState;
	private isRecording = false;
	private isProcessing = false;
	private manualStop = false;
	private audioChunks: Blob[] = [];
	private currentState: 'idle' | 'listening' | 'processing' | 'speaking' = 'idle';
	private speechEndTimeout: ReturnType<typeof setTimeout> | null = null;
	private pendingRequestPromise: Promise<string> | null = null;

	constructor(private config: OrchestratorConfig) {
		console.log('[Orchestrator] Constructor called with profile:', {
			name: config.profile.name,
			id: config.profile.id,
			voiceId: config.profile.config.voice_id
		});
		this.audioPlayback = new AudioPlayback();
		this.conversationState = { messages: [], contextWindow: [] };
	}

	async start(): Promise<void> {
		// Only skip if we're already actively capturing (not just if flag is set)
		if (this.isRecording && this.audioCapture) return;

		this.manualStop = false;
		this.isRecording = true;
		this.audioChunks = [];
		this.updateState('listening');
		this.config.onRecordingStateChange?.(true);

		const captureConfig: AudioCaptureConfig = {
			onDataAvailable: (blob) => {
				this.audioChunks.push(blob);
			},
			onError: (error) => {
				this.config.onError(error);
				this.stop();
			},
			chunkInterval: 1000
		};

		this.audioCapture = new AudioCapture(captureConfig);
		await this.audioCapture.start();

		if (this.audioCapture?.stream) {
			this.setupVAD(this.audioCapture.stream);
		}
	}

	private setupVAD(stream: MediaStream): void {
		this.vad = new VoiceActivityDetector({
			threshold: 30,
			silenceDuration: 1500,
			onSpeechStart: () => {
				if (this.currentState === 'speaking') {
					this.interruptAI();
				}
			},
			onSpeechEnd: () => {
				if (this.speechEndTimeout) {
					clearTimeout(this.speechEndTimeout);
				}
				this.speechEndTimeout = setTimeout(() => {
					if (this.isRecording && !this.isProcessing) {
						this.processUserSpeech();
					}
				}, 500);
			}
		});

		this.vad.start(stream);
	}

	stop(): void {
		this.manualStop = true;
		this.isRecording = false;
		this.isProcessing = false;
		this.config.onRecordingStateChange?.(false);

		// Stop audio playback
		this.audioPlayback.stop();

		if (this.speechEndTimeout) {
			clearTimeout(this.speechEndTimeout);
			this.speechEndTimeout = null;
		}

		if (this.audioCapture) {
			this.audioCapture.stop();
			this.audioCapture = null;
		}

		if (this.vad) {
			this.vad.stop();
			this.vad = null;
		}

		// When manually stopped, don't process pending chunks - just stop everything
		this.audioChunks = [];
		this.pendingRequestPromise = null;
		this.updateState('idle');
	}

	private async processUserSpeech(): Promise<void> {
		if (this.isProcessing || this.audioChunks.length === 0) return;

		this.isProcessing = true;
		this.updateState('processing');

		const wasRecording = this.isRecording;
		// Temporarily stop capture during processing, but maintain recording intent
		if (this.audioCapture) {
			this.audioCapture.stop();
			this.audioCapture = null;
		}

		try {
			const audioBlob = new Blob(this.audioChunks);
			this.audioChunks = [];

			if (audioBlob.size < 100) {
				this.isProcessing = false;
				if (wasRecording && !this.manualStop) {
					await this.start();
				} else {
					this.updateState('idle');
				}
				return;
			}

			const wavBlob = await convertToWav(audioBlob);
			downloadAndLogAudio(wavBlob, 'recording');
			const transcribedText = await this.transcribeAudio(wavBlob);
			if (!transcribedText.trim()) {
				this.isProcessing = false;
				if (wasRecording && !this.manualStop) {
					await this.start();
				} else {
					this.updateState('idle');
				}
				return;
			}

			this.conversationState = addMessage(this.conversationState, 'user', transcribedText);
			this.config.onTranscriptUpdate(this.conversationState);

			const aiResponse = await this.getAIResponse();
			if (!aiResponse.trim()) {
				this.isProcessing = false;
				if (wasRecording && !this.manualStop) {
					await this.start();
				} else {
					this.updateState('idle');
				}
				return;
			}

			this.conversationState = addMessage(this.conversationState, 'ai', aiResponse);
			this.config.onTranscriptUpdate(this.conversationState);

			await this.speakResponse(aiResponse);

			this.isProcessing = false;

			// Auto-restart only if was recording and user didn't manually stop
			if (wasRecording && !this.manualStop) {
				await this.start();
			} else {
				this.updateState('idle');
			}
		} catch (error) {
			this.isProcessing = false;
			const errorMessage = error instanceof Error ? error.message : 'Processing failed';
			this.config.onError(new Error(errorMessage));

			if (wasRecording && !this.manualStop) {
				try {
					await this.start();
				} catch (restartError) {
					this.config.onError(
						restartError instanceof Error ? restartError : new Error('Failed to restart recording')
					);
					this.updateState('idle');
				}
			} else {
				this.updateState('idle');
			}
		}
	}

	private async transcribeAudio(audioBlob: Blob): Promise<string> {
		const formData = new FormData();
		formData.append('audio', audioBlob, 'audio.wav');

		let response: Response;
		try {
			response = await fetch('/api/v1/elevenlabs/stt', {
				method: 'POST',
				body: formData
			});
		} catch (err) {
			throw new Error(
				`Network error during transcription: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		}

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(`STT failed (${response.status}): ${errorText}`);
		}

		const data = await response.json().catch(() => ({ text: '' }));
		return data.text || '';
	}

	private async getAIResponse(): Promise<string> {
		// Prevent duplicate simultaneous requests
		if (this.pendingRequestPromise) {
			return this.pendingRequestPromise;
		}

		const context = getContextForGemini(this.conversationState);

		// Check cache first to reduce API calls
		const { getCachedResponse, cacheResponse } = await import('$lib/utils/responseCache');
		const cached = getCachedResponse(context);
		if (cached) {
			console.log('[Orchestrator] Using cached response, skipping API call');
			return cached;
		}

		// Use request queue for rate limit protection
		const { requestQueue } = await import('$lib/utils/requestQueue');
		this.pendingRequestPromise = (async () => {
			try {
				const response = await requestQueue.enqueue(context, 'normal');

				// Cache successful response
				if (response) {
					cacheResponse(context, response);
				}

				return response;
			} finally {
				this.pendingRequestPromise = null;
			}
		})();

		try {
			return await this.pendingRequestPromise;
		} catch (err) {
			throw new Error(
				`AI response failed: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Parses a percentage string (e.g., "50%") to a decimal (e.g., 0.5)
	 */
	private parsePercentage(value: string): number {
		if (!value) return 0.5;
		const cleaned = value.toString().replace('%', '').trim();
		const parsed = parseFloat(cleaned);
		if (isNaN(parsed)) return 0.5;
		// If value is > 1, assume it's a percentage (50 = 0.5), otherwise use as-is
		return parsed > 1 ? parsed / 100 : parsed;
	}

	private async speakResponse(text: string): Promise<void> {
		this.updateState('speaking');

		const voiceId = this.config.profile.config.voice_id;
		const speed = parseFloat(this.config.profile.config.Speed) || 0.95;
		const stability = this.parsePercentage(this.config.profile.config.Stability);
		const similarityBoost = this.parsePercentage(this.config.profile.config['Similarity boost']);

		console.log('[Orchestrator] TTS request:', {
			profile: this.config.profile.name,
			profileId: this.config.profile.id,
			voiceId,
			speed,
			stability,
			similarityBoost
		});

		let response: Response;
		try {
			response = await fetch('/api/v1/elevenlabs/tts', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text,
					voiceId,
					modelId: 'eleven_flash_v2_5',
					stability,
					similarityBoost,
					speed
				})
			});
		} catch (err) {
			throw new Error(
				`Network error during speech generation: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		}

		if (!response.ok) {
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(`TTS failed (${response.status}): ${errorText}`);
		}

		const audioData = await response.arrayBuffer().catch(() => {
			throw new Error('Failed to read audio data from response');
		});

		return new Promise((resolve, reject) => {
			this.audioPlayback.play(audioData, () => {
				// Don't update state here - let processUserSpeech handle state transitions
				// This prevents race conditions and ensures smooth flow
				resolve();
			});
		});
	}

	private updateState(state: 'idle' | 'listening' | 'processing' | 'speaking'): void {
		this.currentState = state;
		this.config.onStateChange(state);
	}

	interruptAI(): void {
		this.audioPlayback.stop();
		if (this.currentState === 'speaking') {
			this.updateState('idle');
		}
	}

	getState(): 'idle' | 'listening' | 'processing' | 'speaking' {
		return this.currentState;
	}

	getConversationState(): ConversationState {
		return this.conversationState;
	}

	async processDemoAudio(audioUrl: string): Promise<void> {
		if (this.isProcessing) return;

		this.isProcessing = true;
		this.updateState('processing');

		try {
			const response = await fetch(audioUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch demo audio: ${response.statusText}`);
			}

			const audioBlob = await response.blob();
			downloadAndLogAudio(audioBlob, 'demo');
			const transcribedText = await this.transcribeAudio(audioBlob);

			if (!transcribedText.trim()) {
				this.isProcessing = false;
				this.updateState('idle');
				return;
			}

			this.conversationState = addMessage(this.conversationState, 'user', transcribedText);
			this.config.onTranscriptUpdate(this.conversationState);

			const aiResponse = await this.getAIResponse();
			if (!aiResponse.trim()) {
				this.isProcessing = false;
				this.updateState('idle');
				return;
			}

			this.conversationState = addMessage(this.conversationState, 'ai', aiResponse);
			this.config.onTranscriptUpdate(this.conversationState);

			await this.speakResponse(aiResponse);

			this.isProcessing = false;
			this.updateState('idle');
		} catch (error) {
			this.isProcessing = false;
			const errorMessage = error instanceof Error ? error.message : 'Processing demo audio failed';
			this.config.onError(new Error(errorMessage));
			this.updateState('idle');
		}
	}
}
