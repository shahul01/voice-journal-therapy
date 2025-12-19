/**
 * Circuit breaker pattern for rate limit protection
 * Opens circuit when rate limit hit, automatically closes after cooldown
 */

interface CircuitBreakerState {
	isOpen: boolean;
	openUntil: number | null;
	failureCount: number;
	lastFailureTime: number | null;
}

interface CircuitBreakerConfig {
	failureThreshold: number;
	cooldownPeriod: number; // milliseconds
	resetTimeout: number; // milliseconds
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
	failureThreshold: 1, // Open on first rate limit error
	cooldownPeriod: 60000, // 1 minute
	resetTimeout: 300000 // 5 minutes
};

function createCircuitBreaker(config: CircuitBreakerConfig = DEFAULT_CONFIG) {
	let state: CircuitBreakerState = {
		isOpen: false,
		openUntil: null,
		failureCount: 0,
		lastFailureTime: null
	};

	function recordSuccess(): void {
		if (!state.isOpen && state.failureCount > 0) {
			const now = Date.now();
			if (state.lastFailureTime && now - state.lastFailureTime > config.resetTimeout) {
				state.failureCount = 0;
				state.lastFailureTime = null;
			}
		}
	}

	function recordFailure(): void {
		const now = Date.now();
		state.failureCount += 1;
		state.lastFailureTime = now;

		if (state.failureCount >= config.failureThreshold) {
			state.isOpen = true;
			state.openUntil = now + config.cooldownPeriod;
		}
	}

	function canProceed(): boolean {
		if (!state.isOpen) return true;

		if (state.openUntil && Date.now() >= state.openUntil) {
			state.isOpen = false;
			state.openUntil = null;
			return true;
		}

		return false;
	}

	function getState(): CircuitBreakerState {
		return { ...state };
	}

	function getMsUntilOpen(): number | null {
		if (!state.isOpen || !state.openUntil) return null;
		const remaining = state.openUntil - Date.now();
		return remaining > 0 ? remaining : null;
	}

	function reset(): void {
		state = {
			isOpen: false,
			openUntil: null,
			failureCount: 0,
			lastFailureTime: null
		};
	}

	return {
		recordSuccess,
		recordFailure,
		canProceed,
		getState,
		getMsUntilOpen,
		reset
	};
}

export const circuitBreaker = createCircuitBreaker();