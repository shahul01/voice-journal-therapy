import { json, error } from '@sveltejs/kit';
import { detectCrisisLevel } from '$lib/utils/crisis/detection';
import type { RequestHandler } from './$types';
import type { ConversationMessage } from '$lib/types/conversation';

export const POST: RequestHandler = async ({ request }) => {
	console.log('🔥 [CrisisDetectionAPI] POST endpoint HIT');

	try {
		const body = await request.json();
		console.log('[CrisisDetectionAPI] Request body:', body);

		const { messages } = body;

		if (!messages || !Array.isArray(messages)) {
			console.error('[CrisisDetectionAPI] ❌ Messages array missing or invalid');
			throw error(400, 'Messages array is required');
		}

		console.log('[CrisisDetectionAPI] Received', messages.length, 'messages');

		// Validate messages structure
		const validMessages: ConversationMessage[] = messages.filter(
			(msg: any) =>
				msg &&
				typeof msg === 'object' &&
				(msg.role === 'user' || msg.role === 'ai') &&
				typeof msg.text === 'string'
		);

		console.log('[CrisisDetectionAPI] Valid messages:', validMessages.length);

		if (validMessages.length === 0) {
			console.error('[CrisisDetectionAPI] ❌ No valid messages after filtering');
			throw error(400, 'No valid messages provided');
		}

		console.log('[CrisisDetectionAPI] 🔍 Calling detectCrisisLevel...');
		console.log('[CrisisDetectionAPI] Sample messages:', validMessages.slice(-2));

		const detectionResult = await detectCrisisLevel(validMessages);

		console.log('[CrisisDetectionAPI] ⚠️ DETECTION RESULT:', {
			level: detectionResult.level,
			confidence: detectionResult.confidence,
			indicators: detectionResult.indicators,
			reasoning: detectionResult.reasoning
		});

		const response = {
			success: true,
			data: detectionResult
		};

		console.log('[CrisisDetectionAPI] ✅ Returning response:', response);

		return json(response);
	} catch (err) {
		console.error('[CrisisDetectionAPI] ❌❌❌ ERROR:', err);
		console.error('[CrisisDetectionAPI] Error type:', typeof err);
		console.error(
			'[CrisisDetectionAPI] Error stack:',
			err instanceof Error ? err.stack : 'No stack'
		);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(
			500,
			`Crisis detection failed: ${err instanceof Error ? err.message : 'Unknown error'}`
		);
	}
};
