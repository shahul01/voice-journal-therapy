/**
 * Simple token estimation for Gemini API
 * Uses approximation: ~4 characters per token (conservative estimate)
 * More accurate than word count, less than full tokenization
 */

export interface TokenEstimate {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

export function estimateTokens(text: string): number {
	if (!text) return 0;
	return Math.ceil(text.length / 4);
}

export function estimateMessageTokens(message: { role: string; parts: Array<{ text: string }> }): number {
	let total = 0;
	total += estimateTokens(message.role);
	for (const part of message.parts) {
		if (part.text) {
			total += estimateTokens(part.text);
		}
	}
	return total;
}

export function estimateConversationTokens(messages: Array<{ role: string; parts: Array<{ text: string }> }>): TokenEstimate {
	let inputTokens = 0;

	for (const message of messages) {
		inputTokens += estimateMessageTokens(message);
	}

	const avgResponseLength = 200;
	const outputTokens = estimateTokens('x'.repeat(avgResponseLength));

	return {
		inputTokens,
		outputTokens,
		totalTokens: inputTokens + outputTokens
	};
}