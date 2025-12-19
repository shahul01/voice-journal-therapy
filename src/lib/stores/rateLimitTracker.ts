import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { getRateLimits, getMidnightPTOffset } from '$lib/config/rateLimits';

interface RateLimitUsage {
	rpmTimestamps: number[];
	tpmHistory: Array<{ timestamp: number; tokens: number }>;
	dailyRequests: number;
	lastResetTime: number;
}

interface RateLimitState {
	rpm: {
		used: number;
		limit: number;
		remaining: number;
	};
	tpm: {
		used: number;
		limit: number;
		remaining: number;
	};
	rpd: {
		used: number;
		limit: number;
		remaining: number;
		msUntilReset: number;
	};
	isLimited: boolean;
}

const STORAGE_KEY = 'gemini-rate-limit-usage';
const WINDOW_RPM = 60 * 1000; // 1 minute in ms
const WINDOW_TPM = 60 * 1000; // 1 minute in ms

function loadUsageFromStorage(): RateLimitUsage {
	if (!browser) {
		return {
			rpmTimestamps: [],
			tpmHistory: [],
			dailyRequests: 0,
			lastResetTime: Date.now()
		};
	}

	try {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (stored) {
			const data = JSON.parse(stored);
			const lastResetTime = data.lastResetTime || Date.now();
			const msUntilReset = getMidnightPTOffset();
			const now = Date.now();

			if (now - lastResetTime >= msUntilReset || data.lastResetTime < now - 24 * 60 * 60 * 1000) {
				return {
					rpmTimestamps: [],
					tpmHistory: [],
					dailyRequests: 0,
					lastResetTime: now
				};
			}

			return {
				rpmTimestamps: (data.rpmTimestamps || data.timestamps || []).filter(
					(ts: number) => now - ts < WINDOW_RPM
				),
				tpmHistory: (data.tpmHistory || []).filter(
					(entry: { timestamp: number }) => now - entry.timestamp < WINDOW_TPM
				),
				dailyRequests: data.dailyRequests || 0,
				lastResetTime
			};
		}
	} catch (err) {
		console.error('[RateLimitTracker] Failed to load from storage:', err);
	}

	return {
		rpmTimestamps: [],
		tpmHistory: [],
		dailyRequests: 0,
		lastResetTime: Date.now()
	};
}

function saveUsageToStorage(usage: RateLimitUsage): void {
	if (!browser) return;

	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
	} catch (err) {
		console.error('[RateLimitTracker] Failed to save to storage:', err);
	}
}

function createRateLimitTracker(model: string = 'gemini-2.5-flash') {
	const limits = getRateLimits(model);
	let usage = loadUsageFromStorage();

	const updateUsage = () => {
		const now = Date.now();
		const msUntilReset = getMidnightPTOffset();

		if (now - usage.lastResetTime >= msUntilReset) {
			usage = {
				rpmTimestamps: [],
				tpmHistory: [],
				dailyRequests: 0,
				lastResetTime: now
			};
			saveUsageToStorage(usage);
		}

		usage.rpmTimestamps = usage.rpmTimestamps.filter((ts) => now - ts < WINDOW_RPM);
		usage.tpmHistory = usage.tpmHistory.filter((entry) => now - entry.timestamp < WINDOW_TPM);
	};

	const { subscribe, set } = writable<RateLimitState>(calculateState());

	function calculateState(): RateLimitState {
		updateUsage();
		const now = Date.now();

		const rpmUsed = usage.rpmTimestamps.filter((ts) => now - ts < WINDOW_RPM).length;
		const tpmUsed = usage.tpmHistory
			.filter((entry) => now - entry.timestamp < WINDOW_TPM)
			.reduce((sum, entry) => sum + entry.tokens, 0);
		const rpdUsed = usage.dailyRequests;

		const rpmRemaining = Math.max(0, limits.rpm - rpmUsed);
		const tpmRemaining = Math.max(0, limits.tpm - tpmUsed);
		const rpdRemaining = Math.max(0, limits.rpd - rpdUsed);

		const isLimited = rpmRemaining === 0 || tpmRemaining === 0 || rpdRemaining === 0;

		return {
			rpm: {
				used: rpmUsed,
				limit: limits.rpm,
				remaining: rpmRemaining
			},
			tpm: {
				used: tpmUsed,
				limit: limits.tpm,
				remaining: tpmRemaining
			},
			rpd: {
				used: rpdUsed,
				limit: limits.rpd,
				remaining: rpdRemaining,
				msUntilReset: getMidnightPTOffset()
			},
			isLimited
		};
	}

	function recordRequest(estimatedTokens: number): boolean {
		updateUsage();
		const state = calculateState();

		if (state.isLimited) {
			return false;
		}

		const now = Date.now();
		usage.rpmTimestamps.push(now);
		usage.tpmHistory.push({ timestamp: now, tokens: estimatedTokens });
		usage.dailyRequests += 1;

		saveUsageToStorage(usage);
		set(calculateState());

		return true;
	}

	const tracker = {
		recordRequest,
		getState: calculateState,
		reset: () => {
			usage = {
				rpmTimestamps: [],
				tpmHistory: [],
				dailyRequests: 0,
				lastResetTime: Date.now()
			};
			saveUsageToStorage(usage);
			set(calculateState());
		}
	};

	return {
		subscribe,
		...tracker
	};
}

export const rateLimitTracker = createRateLimitTracker();

export const rateLimitState = derived(rateLimitTracker, ($state) => $state);

export const rateLimitTrackerMethods = {
	recordRequest: (tokens: number) => rateLimitTracker.recordRequest(tokens),
	getState: () => rateLimitTracker.getState(),
	reset: () => rateLimitTracker.reset()
};