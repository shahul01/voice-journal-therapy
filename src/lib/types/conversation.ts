export type MessageRole = 'user' | 'ai';

export interface ConversationMessage {
	id: string;
	role: MessageRole;
	text: string;
	timestamp: number;
}

export interface ConversationState {
	messages: ConversationMessage[];
	contextWindow: ConversationMessage[];
}
