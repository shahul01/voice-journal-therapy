export class AudioPlayback {
	private audioContext: AudioContext | null = null;
	private currentSource: AudioBufferSourceNode | null = null;
	private queue: ArrayBuffer[] = [];
	private isPlaying = false;
	private onEndCallback: (() => void) | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		}
	}

	async play(audioData: ArrayBuffer, onEnd?: () => void): Promise<void> {
		if (!this.audioContext) {
			throw new Error('AudioContext not available');
		}

		if (this.isPlaying) {
			this.queue.push(audioData);
			if (onEnd) {
				this.onEndCallback = onEnd;
			}
			return;
		}

		await this.playAudio(audioData, onEnd);
	}

	private async playAudio(audioData: ArrayBuffer, onEnd?: () => void): Promise<void> {
		if (!this.audioContext) return;

		try {
			const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
			this.isPlaying = true;

			this.currentSource = this.audioContext.createBufferSource();
			this.currentSource.buffer = audioBuffer;
			this.currentSource.connect(this.audioContext.destination);

			this.currentSource.onended = () => {
				this.isPlaying = false;
				this.currentSource = null;

				if (onEnd) {
					onEnd();
				}

				if (this.queue.length > 0) {
					const nextAudio = this.queue.shift()!;
					this.playAudio(nextAudio, this.onEndCallback || undefined);
					this.onEndCallback = null;
				}
			};

			this.currentSource.start(0);
		} catch (err) {
			this.isPlaying = false;
			throw new Error(`Failed to play audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	stop(): void {
		if (this.currentSource) {
			this.currentSource.stop();
			this.currentSource = null;
		}
		this.isPlaying = false;
		this.queue = [];
		this.onEndCallback = null;
	}

	isCurrentlyPlaying(): boolean {
		return this.isPlaying;
	}
}
