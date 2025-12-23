import { ELEVENLABS_API_KEY } from '$env/static/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { text, voiceId, modelId, stability, similarityBoost, speed } = await request.json();

		if (!text || typeof text !== 'string') {
			throw error(400, 'Text is required');
		}

		if (!ELEVENLABS_API_KEY) {
			throw error(500, 'ElevenLabs API key not configured');
		}

		// Use provided voiceId or fallback to default
		const finalVoiceId = voiceId || 'pjcYQlDFKMbcOUp6F5GD';

		console.log('[TTS API] Request:', {
			voiceId: finalVoiceId,
			modelId: modelId || 'eleven_flash_v2_5',
			stability: stability ?? 0.5,
			similarityBoost: similarityBoost ?? 0.75,
			speed: speed !== undefined ? speed : undefined
		});

		const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`, {
			method: 'POST',
			headers: {
				'xi-api-key': ELEVENLABS_API_KEY,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				text,
				model_id: modelId || 'eleven_flash_v2_5',
				voice_settings: {
					stability: stability ?? 0.5,
					similarity_boost: similarityBoost ?? 0.75,
					style: 0,
					use_speaker_boost: true
				},
				...(speed !== undefined && { output_format: 'mp3_44100_128', speed })
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw error(response.status, `ElevenLabs TTS error: ${errorText}`);
		}

		const audioBuffer = await response.arrayBuffer();

		return new Response(audioBuffer, {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Content-Length': audioBuffer.byteLength.toString()
			}
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, `Failed to generate speech: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
