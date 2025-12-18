export interface AudioCaptureConfig {
	onDataAvailable: (blob: Blob) => void;
	onError: (error: Error) => void;
	sampleRate?: number;
	chunkInterval?: number;
}

export class AudioCapture {
	private mediaRecorder: MediaRecorder | null = null;
	public stream: MediaStream | null = null;
	private chunkInterval: number;
	private intervalId: ReturnType<typeof setInterval> | null = null;

	constructor(private config: AudioCaptureConfig) {
		this.chunkInterval = config.chunkInterval || 1000;
	}

	async start(): Promise<void> {
		try {
			this.stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					sampleRate: this.config.sampleRate || 44100
				}
			});

			const options: MediaRecorderOptions = {
				mimeType: this.getSupportedMimeType(),
				audioBitsPerSecond: 128000
			};

			this.mediaRecorder = new MediaRecorder(this.stream, options);

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.config.onDataAvailable(event.data);
				}
			};

			this.mediaRecorder.onerror = (event) => {
				this.config.onError(new Error('MediaRecorder error'));
			};

			this.mediaRecorder.start(this.chunkInterval);
		} catch (err) {
			const error = err instanceof Error ? err : new Error('Failed to access microphone');
			this.config.onError(error);
			throw error;
		}
	}

	stop(): void {
		if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
			this.mediaRecorder.stop();
		}

		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
		}

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	isActive(): boolean {
		return this.mediaRecorder?.state === 'recording';
	}

	private getSupportedMimeType(): string {
		const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

		for (const type of types) {
			if (MediaRecorder.isTypeSupported(type)) {
				return type;
			}
		}

		return 'audio/webm';
	}
}
