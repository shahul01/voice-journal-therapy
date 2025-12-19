/**
 * Smart request queue for Gemini API calls
 * Prioritizes requests and processes within rate limits
 */

import { rateLimitTrackerMethods } from '$lib/stores/rateLimitTracker';
import { estimateConversationTokens } from './tokenEstimator';
import { circuitBreaker } from './circuitBreaker';
import { cooldownManager } from './cooldownManager';

export type RequestPriority = 'critical' | 'high' | 'normal' | 'low';

interface QueuedRequest {
	id: string;
	priority: RequestPriority;
	messages: Array<{ role: string; parts: Array<{ text: string }> }>;
	resolve: (value: string) => void;
	reject: (error: Error) => void;
	createdAt: number;
}

const PRIORITY_ORDER: Record<RequestPriority, number> = {
	critical: 0,
	high: 1,
	normal: 2,
	low: 3
};

function createRequestQueue() {
	const queue: QueuedRequest[] = [];
	let processing = false;

	function enqueue(
		messages: Array<{ role: string; parts: Array<{ text: string }> }>,
		priority: RequestPriority = 'normal'
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const request: QueuedRequest = {
				id: crypto.randomUUID(),
				priority,
				messages,
				resolve,
				reject,
				createdAt: Date.now()
			};

			const insertIndex = queue.findIndex((req) => PRIORITY_ORDER[req.priority] > PRIORITY_ORDER[priority]);
			if (insertIndex === -1) {
				queue.push(request);
			} else {
				queue.splice(insertIndex, 0, request);
			}

			processQueue();
		});
	}

	async function processQueue(): Promise<void> {
		if (processing || queue.length === 0) return;

		processing = true;

		while (queue.length > 0) {
			const request = queue.shift();
			if (!request) break;

			try {
				const queueTime = Date.now() - request.createdAt;
				await cooldownManager.waitIfNeeded();

				if (!circuitBreaker.canProceed()) {
					const msUntilOpen = circuitBreaker.getMsUntilOpen();
					const waitSeconds = Math.ceil((msUntilOpen || 60000) / 1000);
					console.error('[RequestQueue] Circuit breaker open', {
						requestId: request.id,
						priority: request.priority,
						waitSeconds,
						queueTime
					});
					const error = new Error(
						`Rate limit circuit breaker is open. Try again in ${waitSeconds}s`
					);
					request.reject(error);
					continue;
				}

				const state = rateLimitTrackerMethods.getState();
				if (state.isLimited) {
					console.error('[RequestQueue] Rate limit exceeded (pre-check)', {
						requestId: request.id,
						priority: request.priority,
						rpm: `${state.rpm.used}/${state.rpm.limit}`,
						tpm: `${state.tpm.used}/${state.tpm.limit}`,
						rpd: `${state.rpd.used}/${state.rpd.limit}`,
						queueTime
					});
					const error = new Error(
						`Rate limit exceeded. ${state.rpd.remaining === 0 ? `Daily limit reached (${state.rpd.used}/${state.rpd.limit}). Resets in ${Math.ceil(state.rpd.msUntilReset / (1000 * 60 * 60))}h` : 'Please try again later'}`
					);
					request.reject(error);
					continue;
				}

				const tokenEstimate = estimateConversationTokens(request.messages);

				// Check if we have enough quota before recording
				if (state.rpm.remaining === 0 || state.tpm.remaining < tokenEstimate.inputTokens || state.rpd.remaining === 0) {
					console.warn('[RequestQueue] Insufficient quota, will retry', {
						requestId: request.id,
						priority: request.priority,
						rpm: `${state.rpm.used}/${state.rpm.limit} (remaining: ${state.rpm.remaining})`,
						tpm: `${state.tpm.used}/${state.tpm.limit} (remaining: ${state.tpm.remaining}, required: ${tokenEstimate.inputTokens})`,
						rpd: `${state.rpd.used}/${state.rpd.limit} (remaining: ${state.rpd.remaining})`,
						queueTime
					});
					queue.unshift(request);
					await new Promise((resolve) => setTimeout(resolve, 5000));
					continue;
				}

				if (!rateLimitTrackerMethods.recordRequest(tokenEstimate.inputTokens)) {
					const stateAfter = rateLimitTrackerMethods.getState();
					console.warn('[RequestQueue] Rate limit reached after recording attempt', {
						requestId: request.id,
						priority: request.priority,
						rpm: `${stateAfter.rpm.used}/${stateAfter.rpm.limit}`,
						tpm: `${stateAfter.tpm.used}/${stateAfter.tpm.limit}`,
						rpd: `${stateAfter.rpd.used}/${stateAfter.rpd.limit}`,
						queueTime
					});
					queue.unshift(request);
					await new Promise((resolve) => setTimeout(resolve, 5000));
					continue;
				}

				cooldownManager.recordCall();
				const finalState = rateLimitTrackerMethods.getState();
				console.log('[RequestQueue] Processing request', {
					requestId: request.id,
					priority: request.priority,
					estimatedTokens: tokenEstimate.inputTokens,
					quota: {
						rpm: `${finalState.rpm.used}/${finalState.rpm.limit}`,
						tpm: `${finalState.tpm.used}/${finalState.tpm.limit}`,
						rpd: `${finalState.rpd.used}/${finalState.rpd.limit}`
					},
					queueTime
				});

				const startTime = Date.now();
				const response = await executeRequest(request.messages);
				const duration = Date.now() - startTime;

				console.log('[RequestQueue] Request completed', {
					requestId: request.id,
					priority: request.priority,
					duration,
					responseLength: response.length
				});

				request.resolve(response);
				circuitBreaker.recordSuccess();
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate limit');

				if (isRateLimit) {
					console.error('[RequestQueue] Rate limit error during execution', {
						requestId: request.id,
						priority: request.priority,
						error: errorMessage,
						queueTime: Date.now() - request.createdAt
					});
					circuitBreaker.recordFailure();
				} else {
					console.error('[RequestQueue] Request failed', {
						requestId: request.id,
						priority: request.priority,
						error: errorMessage,
						queueTime: Date.now() - request.createdAt
					});
				}

				request.reject(error instanceof Error ? error : new Error('Request failed'));
			}
		}

		processing = false;
	}

	async function executeRequest(
		messages: Array<{ role: string; parts: Array<{ text: string }> }>
	): Promise<string> {
		const response = await fetch('/api/v1/google/gemini', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				messages,
				stream: false
			})
		});

		if (!response.ok) {
			if (response.status === 429) {
				circuitBreaker.recordFailure();
				throw new Error('Rate limit exceeded (429)');
			}
			const errorText = await response.text().catch(() => response.statusText);
			throw new Error(`API error (${response.status}): ${errorText}`);
		}

		const data = await response.json().catch(() => ({ text: '' }));
		return data.text || '';
	}

	function clear(): void {
		queue.forEach((req) => {
			req.reject(new Error('Request queue cleared'));
		});
		queue.length = 0;
		processing = false;
	}

	function size(): number {
		return queue.length;
	}

	return {
		enqueue,
		clear,
		size
	};
}

export const requestQueue = createRequestQueue();