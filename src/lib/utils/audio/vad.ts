export interface VADConfig {
	threshold?: number;
	silenceDuration?: number;
	onSpeechStart?: () => void;
	onSpeechEnd?: () => void;
}

export class VoiceActivityDetector {
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private dataArray: Uint8Array<ArrayBuffer> | null = null;
	private isSpeechActive = false;
	private silenceStartTime: number | null = null;
	private animationFrameId: number | null = null;
	private threshold: number;
	private silenceDuration: number;

	constructor(private config: VADConfig) {
		this.threshold = config.threshold || 30;
		this.silenceDuration = config.silenceDuration || 1500;
	}

	async start(stream: MediaStream): Promise<void> {
		if (typeof window === 'undefined') return;

		this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		const source = this.audioContext.createMediaStreamSource(stream);
		this.analyser = this.audioContext.createAnalyser();
		this.analyser.fftSize = 256;
		this.analyser.smoothingTimeConstant = 0.8;
		source.connect(this.analyser);

		const buffer = new ArrayBuffer(this.analyser.frequencyBinCount);
		this.dataArray = new Uint8Array(buffer);
		this.detect();
	}

	private detect(): void {
		if (!this.analyser || !this.dataArray) return;

		this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
		const average = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;

		const now = Date.now();
		const isSpeaking = average > this.threshold;

		if (isSpeaking) {
			if (!this.isSpeechActive) {
				this.isSpeechActive = true;
				this.silenceStartTime = null;
				this.config.onSpeechStart?.();
			}
		} else {
			if (this.isSpeechActive) {
				if (this.silenceStartTime === null) {
					this.silenceStartTime = now;
				} else if (now - this.silenceStartTime >= this.silenceDuration) {
					this.isSpeechActive = false;
					this.silenceStartTime = null;
					this.config.onSpeechEnd?.();
				}
			}
		}

		this.animationFrameId = requestAnimationFrame(() => this.detect());
	}

	stop(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}

		this.isSpeechActive = false;
		this.silenceStartTime = null;
	}

	isActive(): boolean {
		return this.isSpeechActive;
	}
}
