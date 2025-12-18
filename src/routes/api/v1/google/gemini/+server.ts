import { GOOGLE_GEMINI_API_KEY } from '$env/static/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const THERAPIST_SYSTEM_PROMPT = `You are an empathetic and intelligent therapist helping users through voice journal therapy. Your role is to:
- Listen actively and respond with genuine empathy
- Guide users toward self-reflection and understanding
- Provide gentle, supportive guidance for both immediate relief and long-term growth
- Keep responses conversational and natural (not clinical or robotic)
- Be concise but meaningful - this is a voice conversation, so responses should be appropriate for speech
- Help users feel heard, understood, and supported
- Encourage healthy coping strategies and positive thinking patterns

Respond as if you're having a natural conversation. Be warm, understanding, and helpful.`;

function extractRetryDelay(errorData: any): number | null {
	try {
		if (errorData?.error?.details) {
			for (const detail of errorData.error.details) {
				if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && detail.retryDelay) {
					const seconds = parseFloat(detail.retryDelay);
					if (!isNaN(seconds)) {
						return seconds * 1000;
					}
				}
			}
		}
		if (errorData?.error?.message) {
			const match = errorData.error.message.match(/Please retry in ([\d.]+)s/);
			if (match) {
				return parseFloat(match[1]) * 1000;
			}
		}
	} catch {
		// Ignore parsing errors
	}
	return null;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { messages, stream } = await request.json();

		if (!messages || !Array.isArray(messages)) {
			throw error(400, 'Messages array is required');
		}

		if (!GOOGLE_GEMINI_API_KEY) {
			throw error(500, 'Google Gemini API key not configured');
		}

		const conversationHistory = messages.map(
			(msg: { role: string; parts: Array<{ text: string }> }) => ({
				role: msg.role,
				parts: msg.parts
			})
		);

		const requestBody = {
			contents: [
				{
					role: 'user',
					parts: [{ text: THERAPIST_SYSTEM_PROMPT }]
				},
				...conversationHistory
			],
			generationConfig: {
				temperature: 0.7,
				topK: 40,
				topP: 0.95,
				maxOutputTokens: 1024
			}
		};

		const modelName = 'gemini-2.5-flash-lite';
		const maxRetries = 3;
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				if (stream) {
					const response = await fetch(
						`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${GOOGLE_GEMINI_API_KEY}`,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify(requestBody)
						}
					);

					if (!response.ok) {
						if (response.status === 429 && attempt < maxRetries) {
							const errorData = await response.json().catch(() => ({}));
							const retryDelay = extractRetryDelay(errorData) || Math.pow(2, attempt) * 1000;
							await new Promise((resolve) => setTimeout(resolve, retryDelay));
							continue;
						}
						const errorText = await response.text();
						throw error(response.status, `Gemini API error: ${errorText}`);
					}

					return new Response(response.body, {
						headers: {
							'Content-Type': 'text/event-stream',
							'Cache-Control': 'no-cache',
							Connection: 'keep-alive'
						}
					});
				} else {
					const response = await fetch(
						`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
						{
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify(requestBody)
						}
					);

					if (!response.ok) {
						if (response.status === 429 && attempt < maxRetries) {
							const errorData = await response.json().catch(() => ({}));
							const retryDelay = extractRetryDelay(errorData) || Math.pow(2, attempt) * 1000;
							await new Promise((resolve) => setTimeout(resolve, retryDelay));
							continue;
						}
						const errorText = await response.text();
						throw error(response.status, `Gemini API error: ${errorText}`);
					}

					const result = await response.json();
					const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

					return json({ text, success: true });
				}
			} catch (err) {
				if (err && typeof err === 'object' && 'status' in err) {
					throw err;
				}
				lastError = err instanceof Error ? err : new Error(String(err));
				if (attempt === maxRetries) {
					break;
				}
			}
		}

		if (lastError && typeof lastError === 'object' && 'status' in lastError) {
			throw lastError;
		}
		throw error(
			500,
			`Failed to get AI response after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
		);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(
			500,
			`Failed to get AI response: ${err instanceof Error ? err.message : 'Unknown error'}`
		);
	}
};
