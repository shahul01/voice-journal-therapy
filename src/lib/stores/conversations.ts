import { writable, derived, get } from 'svelte/store';
import type { ConversationState } from '$lib/types/conversation';
import { browser } from '$app/environment';

export interface Conversation {
	id: string;
	title: string;
	state: ConversationState;
	createdAt: number;
	updatedAt: number;
}

interface ConversationsStore {
	conversations: Conversation[];
	activeConversationId: string | null;
}

const STORAGE_KEY = 'voice-journal-conversations';

/**
 * Loads conversations from local storage
 */
function loadFromStorage(): ConversationsStore {
	if (!browser) {
		return { conversations: [], activeConversationId: null };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (err) {
		console.error('[Conversations] Failed to load from storage:', err);
	}

	return { conversations: [], activeConversationId: null };
}

/**
 * Saves conversations to local storage
 */
function saveToStorage(data: ConversationsStore): void {
	if (!browser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch (err) {
		console.error('[Conversations] Failed to save to storage:', err);
	}
}

/**
 * Generates a title based on conversation content
 */
function generateTitle(state: ConversationState): string {
	if (state.messages.length === 0) {
		return 'New Conversation';
	}

	// Use first user message as title (truncated)
	const firstUserMessage = state.messages.find((m) => m.role === 'user');
	if (firstUserMessage) {
		const text = firstUserMessage.text.trim();
		return text.length > 40 ? text.slice(0, 40) + '...' : text;
	}

	return 'New Conversation';
}

/**
 * Creates the conversations store
 */
function createConversationsStore() {
	const initialData = loadFromStorage();
	const store = writable<ConversationsStore>(initialData);

	// Auto-save on changes
	store.subscribe((data) => {
		saveToStorage(data);
	});

	return {
		subscribe: store.subscribe,
		set: store.set,
		update: store.update,

		/**
		 * Creates a new conversation and sets it as active
		 */
		createConversation: (): string => {
			const id = crypto.randomUUID();
			const now = Date.now();

			const newConversation: Conversation = {
				id,
				title: 'New Conversation',
				state: { messages: [], contextWindow: [] },
				createdAt: now,
				updatedAt: now
			};

			store.update((data) => ({
				conversations: [newConversation, ...data.conversations],
				activeConversationId: id
			}));

			console.log('[Conversations] Created new conversation:', id);
			return id;
		},

		/**
		 * Switches to a different conversation
		 */
		setActiveConversation: (id: string): void => {
			store.update((data) => {
				const exists = data.conversations.some((c) => c.id === id);
				if (!exists) {
					console.warn('[Conversations] Conversation not found:', id);
					return data;
				}

				return {
					...data,
					activeConversationId: id
				};
			});
		},

		/**
		 * Updates the state of the active conversation
		 */
		updateActiveConversation: (state: ConversationState): void => {
			store.update((data) => {
				if (!data.activeConversationId) {
					console.warn('[Conversations] No active conversation to update');
					return data;
				}

				const now = Date.now();
				const conversations = data.conversations.map((conv) => {
					if (conv.id === data.activeConversationId) {
						return {
							...conv,
							state,
							title: generateTitle(state),
							updatedAt: now
						};
					}
					return conv;
				});

				return {
					...data,
					conversations
				};
			});
		},

		/**
		 * Deletes a conversation
		 */
		deleteConversation: (id: string): void => {
			store.update((data) => {
				const conversations = data.conversations.filter((c) => c.id !== id);
				let activeConversationId = data.activeConversationId;

				// If deleting active conversation, switch to another
				if (activeConversationId === id) {
					activeConversationId = conversations.length > 0 ? conversations[0].id : null;
				}

				return {
					conversations,
					activeConversationId
				};
			});

			console.log('[Conversations] Deleted conversation:', id);
		},

		/**
		 * Updates the name/title of a conversation
		 */
		updateConversationName: (id: string, newTitle: string): void => {
			const trimmedTitle = newTitle.trim();
			if (!trimmedTitle) {
				console.warn('[Conversations] Cannot set empty title');
				return;
			}

			store.update((data) => {
				const conversations = data.conversations.map((conv) => {
					if (conv.id === id) {
						return {
							...conv,
							title: trimmedTitle,
							updatedAt: Date.now()
						};
					}
					return conv;
				});

				return {
					...data,
					conversations
				};
			});

			console.log('[Conversations] Updated conversation name:', id, trimmedTitle);
		},

		/**
		 * Clears all conversations
		 */
		clearAll: (): void => {
			store.set({
				conversations: [],
				activeConversationId: null
			});

			console.log('[Conversations] Cleared all conversations');
		}
	};
}

export const conversationsStore = createConversationsStore();

/**
 * Derived store for the active conversation
 */
export const activeConversation = derived(conversationsStore, ($store) => {
	if (!$store.activeConversationId) {
		return null;
	}
	return $store.conversations.find((c) => c.id === $store.activeConversationId) || null;
});

/**
 * Derived store for conversation list (sorted by update time)
 */
export const conversationList = derived(conversationsStore, ($store) => {
	return [...$store.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
});
