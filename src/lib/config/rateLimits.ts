/**
 * Rate limit configuration for Gemini API models
 * Limits are per-project and vary by tier (Free, Tier 1, Tier 2, Tier 3)
 * Reference: https://ai.google.dev/gemini-api/docs/rate-limits
 */

export interface RateLimits {
	rpm: number; // Requests per minute
	tpm: number; // Tokens per minute (input)
	rpd: number; // Requests per day
}

export const RATE_LIMITS: Record<string, RateLimits> = {
	'gemini-2.5-flash': {
		rpm: 10,
		tpm: 250000,
		rpd: 20
	},
	'gemini-2.5-flash-lite': {
		rpm: 10,
		tpm: 250000,
		rpd: 20
	}
};

export const PACIFIC_TIMEZONE = 'America/Los_Angeles';

export function getRateLimits(model: string): RateLimits {
	return RATE_LIMITS[model] || RATE_LIMITS['gemini-2.5-flash'];
}

export function getMidnightPTOffset(): number {
	const now = new Date();
	const ptDate = new Date(
		now.toLocaleString('en-US', {
			timeZone: PACIFIC_TIMEZONE
		})
	);
	const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));

	const ptMidnight = new Date(ptDate);
	ptMidnight.setHours(24, 0, 0, 0);

	const msUntilMidnightPT = ptMidnight.getTime() - ptDate.getTime();
	const utcOffset = utcDate.getTime() - now.getTime();

	return msUntilMidnightPT + utcOffset;
}