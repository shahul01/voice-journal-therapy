import { ELEVENLABS_API_KEY } from '$env/static/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const audioFile = formData.get('audio') as File;
		const modelId = (formData.get('model_id') as string) || 'scribe_v1';

		if (!audioFile) {
			throw error(400, 'Audio file is required');
		}

		if (!ELEVENLABS_API_KEY) {
			throw error(500, 'ElevenLabs API key not configured');
		}

		const audioBuffer = await audioFile.arrayBuffer();
		const audioBlob = new Blob([audioBuffer], { type: audioFile.type || 'audio/wav' });

		const formDataToSend = new FormData();
		formDataToSend.append('file', audioBlob, 'audio.wav');
		formDataToSend.append('model_id', modelId);

		const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
			method: 'POST',
			headers: {
				'xi-api-key': ELEVENLABS_API_KEY
			},
			body: formDataToSend
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw error(response.status, `ElevenLabs STT error: ${errorText}`);
		}

		const result = await response.json();
		const text = result.text || '';

		return json({ text, success: true });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(
			500,
			`Failed to transcribe audio: ${err instanceof Error ? err.message : 'Unknown error'}`
		);
	}
};
