/**
 * Cooldown manager to prevent burst requests
 * Enforces minimum delay between API calls
 */

interface CooldownManagerConfig {
	minDelayMs: number;
}

const DEFAULT_CONFIG: CooldownManagerConfig = {
	minDelayMs: 1000 // 1 second between requests
};

function createCooldownManager(config: CooldownManagerConfig = DEFAULT_CONFIG) {
	let lastCallTime = 0;
	let pendingWait: Promise<void> | null = null;

	async function waitIfNeeded(): Promise<void> {
		const now = Date.now();
		const timeSinceLastCall = now - lastCallTime;
		const waitTime = Math.max(0, config.minDelayMs - timeSinceLastCall);

		if (waitTime > 0) {
			if (pendingWait) {
				await pendingWait;
			}
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}

		lastCallTime = Date.now();
	}

	function recordCall(): void {
		lastCallTime = Date.now();
	}

	function getTimeSinceLastCall(): number {
		return Date.now() - lastCallTime;
	}

	function reset(): void {
		lastCallTime = 0;
		pendingWait = null;
	}

	return {
		waitIfNeeded,
		recordCall,
		getTimeSinceLastCall,
		reset
	};
}

export const cooldownManager = createCooldownManager();