<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import profiles from '$lib/utils/profile';
	import { ConversationOrchestrator } from '$lib/utils/conversation/orchestrator';
	import type { ConversationState } from '$lib/types/conversation';
	import type { Profile } from '$lib/types/profile';

	let isListening = $state(false);
	let conversationState = $state<ConversationState>({ messages: [], contextWindow: [] });
	let selectedProfile = $state<Profile>(profiles[0]);
	let currentState = $state<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
	let errorMessage = $state<string | null>(null);

	let orchestrator: ConversationOrchestrator | null = null;

	onMount(() => {
		loadConversationFromStorage();

		orchestrator = new ConversationOrchestrator({
			onTranscriptUpdate: (state) => {
				conversationState = state;
				saveConversationToStorage();
			},
			onError: (error) => {
				errorMessage = error.message;
				console.error('Orchestrator error:', error);
			},
			onStateChange: (state) => {
				currentState = state;
			},
			profile: selectedProfile
		});
	});

	onDestroy(() => {
		if (orchestrator) {
			orchestrator.stop();
		}
	});

	function loadConversationFromStorage() {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem('conversation-state');
			if (stored) {
				conversationState = JSON.parse(stored);
			}
		} catch (err) {
			console.error('Failed to load conversation from storage:', err);
		}
	}

	function saveConversationToStorage() {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem('conversation-state', JSON.stringify(conversationState));
		} catch (err) {
			console.error('Failed to save conversation to storage:', err);
		}
	}

	async function toggleListening() {
		if (!orchestrator) return;

		if (isListening) {
			try {
				orchestrator.stop();
				isListening = false;
				errorMessage = null;
			} catch (err) {
				errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
			}
		} else {
			try {
				errorMessage = null;
				await orchestrator.start();
				isListening = true;
			} catch (err) {
				errorMessage = err instanceof Error ? err.message : 'Failed to start recording. Please check microphone permissions.';
				isListening = false;
			}
		}
	}

	async function sendDemoAudio() {
		if (!orchestrator || currentState === 'processing') return;

		try {
			const demoAudio = '/audio/ElevenLabs_2025-12-17T19_24_59_Brittney - Relaxing, Calm and Meditative_pvc_sp95_s50_sb75_f2-5.wav';
			errorMessage = null;
			await orchestrator.processDemoAudio(demoAudio);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to process demo audio';
		}
	}

	function getStateLabel(): string {
		switch (currentState) {
			case 'listening':
				return 'Listening...';
			case 'processing':
				return 'Processing...';
			case 'speaking':
				return 'AI Speaking...';
			default:
				return 'Ready';
		}
	}

	function getStateColor(): string {
		switch (currentState) {
			case 'listening':
				return 'hsl(0, 70%, 50%)';
			case 'processing':
				return 'hsl(45, 70%, 50%)';
			case 'speaking':
				return 'hsl(200, 70%, 50%)';
			default:
				return 'hsl(120, 30%, 50%)';
		}
	}
</script>

<div class="home">
	<h1>Voice Journal Therapy</h1>
	<p class="profile-info">Profile: {selectedProfile.name}</p>

	<div class="voice-controls">
		<div class="state-indicator" style="background-color: {getStateColor()}">
			<span class="state-dot"></span>
			<span class="state-text">{getStateLabel()}</span>
		</div>

		<button class="record-button" onclick={toggleListening} disabled={currentState === 'processing'}>
			{#if isListening}
				<span class="button-icon">⏹</span>
				Stop Recording
			{:else}
				<span class="button-icon">🎤</span>
				Start Recording
			{/if}
		</button>

		<button class="demo-button" onclick={sendDemoAudio} disabled={currentState === 'processing' || isListening}>
			<span class="button-icon">🎵</span>
			Send Demo Audio
		</button>

		{#if errorMessage}
			<div class="error-message">{errorMessage}</div>
		{/if}
	</div>

	<div class="transcript-container">
		<h2>Conversation</h2>
		<div class="transcript">
			{#if conversationState.messages.length === 0}
				<p class="empty-state">Start recording to begin your therapy session...</p>
			{:else}
				{#each conversationState.messages as message (message.id)}
					<div class="message message-{message.role}">
						<div class="message-header">
							<span class="message-role">{message.role === 'user' ? 'You' : 'Therapist'}</span>
							<span class="message-time">
								{new Date(message.timestamp).toLocaleTimeString()}
							</span>
						</div>
						<div class="message-text">{message.text}</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style lang="postcss">
	.home {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 1rem;
		color: hsl(220, 30%, 20%);
	}

	.dark h1 {
		color: hsl(220, 20%, 85%);
	}

	.profile-info {
		color: hsl(220, 20%, 50%);
		margin-bottom: 2rem;
		font-size: 0.9rem;
	}

	.voice-controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
		align-items: center;
	}

	.state-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: 1rem;
		color: white;
		font-weight: 500;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.state-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: white;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.record-button {
		padding: 1rem 2rem;
		font-size: 1.1rem;
		font-weight: 600;
		border: none;
		border-radius: 2rem;
		background: linear-gradient(135deg, hsl(220, 70%, 50%), hsl(250, 70%, 50%));
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.record-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
	}

	.record-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.demo-button {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		border: none;
		border-radius: 1.5rem;
		background: hsl(220, 40%, 60%);
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.demo-button:hover:not(:disabled) {
		background: hsl(220, 40%, 55%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.demo-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.button-icon {
		font-size: 1.2rem;
	}

	.error-message {
		padding: 0.75rem 1rem;
		background-color: hsl(0, 70%, 95%);
		color: hsl(0, 70%, 30%);
		border-radius: 0.5rem;
		border: 1px solid hsl(0, 70%, 80%);
		font-size: 0.9rem;
	}

	.dark .error-message {
		background-color: hsl(0, 50%, 20%);
		color: hsl(0, 70%, 80%);
		border-color: hsl(0, 50%, 40%);
	}

	.transcript-container {
		background: hsl(220, 20%, 98%);
		border-radius: 1rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.dark .transcript-container {
		background: hsl(220, 15%, 15%);
	}

	.transcript-container h2 {
		font-size: 1.3rem;
		margin-bottom: 1rem;
		color: hsl(220, 30%, 20%);
	}

	.dark .transcript-container h2 {
		color: hsl(220, 20%, 85%);
	}

	.transcript {
		max-height: 500px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty-state {
		text-align: center;
		color: hsl(220, 20%, 60%);
		padding: 2rem;
		font-style: italic;
	}

	.message {
		padding: 1rem;
		border-radius: 0.75rem;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
	}

	.message-user {
		background: hsl(220, 50%, 95%);
		align-self: flex-end;
		max-width: 70%;
	}

	.dark .message-user {
		background: hsl(220, 30%, 25%);
	}

	.message-ai {
		background: hsl(200, 40%, 95%);
		align-self: flex-start;
		max-width: 70%;
	}

	.dark .message-ai {
		background: hsl(200, 30%, 25%);
	}

	.message-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.85rem;
	}

	.message-role {
		font-weight: 600;
		color: hsl(220, 50%, 40%);
	}

	.dark .message-role {
		color: hsl(220, 50%, 70%);
	}

	.message-time {
		color: hsl(220, 20%, 60%);
		font-size: 0.75rem;
	}

	.message-text {
		color: hsl(220, 30%, 20%);
		line-height: 1.6;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.dark .message-text {
		color: hsl(220, 20%, 85%);
	}

	@media (max-width: 640px) {
		.home {
			padding: 1rem;
		}

		.message-user,
		.message-ai {
			max-width: 85%;
		}
	}
</style>
