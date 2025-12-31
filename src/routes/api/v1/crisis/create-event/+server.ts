import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CrisisSeverity } from '$lib/types/emergency';

interface CreateEventInput {
	level: number;
	confidence: number;
	indicators: string[];
	reasoning: string;
}

/**
 * Map crisis detection level to severity
 */
function mapLevelToSeverity(level: number): CrisisSeverity {
	switch (level) {
		case 1:
			return 'low';
		case 2:
			return 'medium';
		case 3:
			return 'high';
		case 4:
			return 'critical';
		default:
			return 'low';
	}
}

/**
 * Generate a local UUID (no database for now)
 */
function generateLocalUUID(): string {
	return 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Create a local crisis event (no database)
 */
export const POST: RequestHandler = async ({ request }) => {
	const body: CreateEventInput = await request.json();

	if (typeof body.level !== 'number' || body.level < 0 || body.level > 4) {
		throw error(400, 'Valid crisis level (0-4) is required');
	}

	const severity = mapLevelToSeverity(body.level);
	const crisis_event_id = generateLocalUUID();

	console.log('[CreateCrisisEvent] Creating LOCAL event:', {
		crisis_event_id,
		level: body.level,
		severity,
		confidence: body.confidence
	});

	return json({
		success: true,
		data: {
			crisis_event_id,
			severity,
			created_at: new Date().toISOString()
		}
	});
};
