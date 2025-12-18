import type { ConversationMessage, ConversationState } from '$lib/types/conversation';

const MAX_CONTEXT_MESSAGES = 20;

export function createConversationState(): ConversationState {
	return {
		messages: [],
		contextWindow: []
	};
}

export function addMessage(
	state: ConversationState,
	role: ConversationMessage['role'],
	text: string
): ConversationState {
	const message: ConversationMessage = {
		id: crypto.randomUUID(),
		role,
		text,
		timestamp: Date.now()
	};

	const newMessages = [...state.messages, message];
	const newContextWindow = [...state.contextWindow, message].slice(-MAX_CONTEXT_MESSAGES);

	return {
		messages: newMessages,
		contextWindow: newContextWindow
	};
}

export function getContextForGemini(state: ConversationState): Array<{ role: string; parts: Array<{ text: string }> }> {
	return state.contextWindow.map((msg) => ({
		role: msg.role === 'user' ? 'user' : 'model',
		parts: [{ text: msg.text }]
	}));
}
