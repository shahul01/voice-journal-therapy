/**
 * Converts an audio blob to WAV format
 * @param audioBlob - The input audio blob (can be any format)
 * @param sampleRate - Target sample rate (default: 44100)
 * @returns Promise resolving to WAV format blob
 */
export async function convertToWav(audioBlob: Blob, sampleRate: number = 44100): Promise<Blob> {
	if (typeof window === 'undefined') {
		throw new Error('Audio conversion requires browser environment');
	}

	const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
		sampleRate
	});

	const arrayBuffer = await audioBlob.arrayBuffer();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

	const wavBuffer = audioBufferToWav(audioBuffer);
	return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Converts AudioBuffer to WAV format ArrayBuffer
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
	const length = buffer.length;
	const numberOfChannels = buffer.numberOfChannels;
	const sampleRate = buffer.sampleRate;
	const bytesPerSample = 2;
	const blockAlign = numberOfChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = length * blockAlign;
	const bufferSize = 44 + dataSize;
	const arrayBuffer = new ArrayBuffer(bufferSize);
	const view = new DataView(arrayBuffer);

	const writeString = (offset: number, string: string) => {
		for (let i = 0; i < string.length; i++) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	};

	let offset = 0;
	writeString(offset, 'RIFF');
	offset += 4;
	view.setUint32(offset, bufferSize - 8, true);
	offset += 4;
	writeString(offset, 'WAVE');
	offset += 4;
	writeString(offset, 'fmt ');
	offset += 4;
	view.setUint32(offset, 16, true);
	offset += 4;
	view.setUint16(offset, 1, true);
	offset += 2;
	view.setUint16(offset, numberOfChannels, true);
	offset += 2;
	view.setUint32(offset, sampleRate, true);
	offset += 4;
	view.setUint32(offset, byteRate, true);
	offset += 4;
	view.setUint16(offset, blockAlign, true);
	offset += 2;
	view.setUint16(offset, bytesPerSample * 8, true);
	offset += 2;
	writeString(offset, 'data');
	offset += 4;
	view.setUint32(offset, dataSize, true);
	offset += 4;

	for (let i = 0; i < length; i++) {
		for (let channel = 0; channel < numberOfChannels; channel++) {
			const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
			view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
			offset += 2;
		}
	}

	return arrayBuffer;
}
