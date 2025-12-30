<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { selectedProfile } from '$lib/stores/profile';
	import { ConversationOrchestrator } from '$lib/utils/conversation/orchestrator';
	import RateLimitIndicator from '$lib/components/RateLimitIndicator.svelte';
	import ProfileDropdown from '$lib/components/ProfileDropdown.svelte';
	import { openCrisisModal } from '$lib/stores/crisisModal';
	import type { ConversationState } from '$lib/types/conversation';
	import type { Profile } from '$lib/types/profile';

	let isListening = $state(false);
	let conversationState = $state<ConversationState>({ messages: [], contextWindow: [] });
	let currentProfile = $state<Profile>(get(selectedProfile));
	let currentState = $state<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
	let errorMessage = $state<string | null>(null);
	let isSwitchingProfile = $state(false);

	let orchestrator: ConversationOrchestrator | null = null;
	let unsubscribeProfile: (() => void) | null = null;

	onMount(() => {
		loadConversationFromStorage();

		// Log initial profile
		console.log('[App] Initial profile loaded:', {
			name: currentProfile.name,
			id: currentProfile.id,
			voiceId: currentProfile.config.voice_id
		});

		initializeOrchestrator();

		// Subscribe to profile changes
		unsubscribeProfile = selectedProfile.subscribe((profile) => {
			currentProfile = profile;
		});
	});

	onDestroy(() => {
		if (orchestrator) {
			orchestrator.stop();
		}
		if (unsubscribeProfile) {
			unsubscribeProfile();
		}
	});

	function initializeOrchestrator(profile?: Profile) {
		const profileToUse = profile || currentProfile;

		console.log('[App] initializeOrchestrator called with profile:', {
			name: profileToUse.name,
			id: profileToUse.id,
			voiceId: profileToUse.config.voice_id,
			wasPassed: profile !== undefined
		});

		if (orchestrator) {
			console.log('[App] Stopping existing orchestrator');
			orchestrator.stop();
			orchestrator = null;
		}

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
			onRecordingStateChange: (isRecording) => {
				isListening = isRecording;
			},
			profile: profileToUse
		});

		console.log('[App] Orchestrator created successfully');
	}

	async function handleProfileChange(newProfile: Profile) {
		// Allow seamless profile switching - don't block during active states
		if (!orchestrator) {
			// If no orchestrator exists, initialize it with the new profile
			currentProfile = newProfile;
			initializeOrchestrator(newProfile);
			return;
		}

		isSwitchingProfile = true;
		errorMessage = null;

		try {
			const wasRecording = orchestrator.isRecordingActive();
			const wasPlaying = orchestrator.isAudioPlaying();

			console.log('[Profile] Switching profile seamlessly:', {
				newProfile: newProfile.name,
				voiceId: newProfile.config.voice_id,
				wasRecording,
				wasPlaying
			});

			// Update profile in orchestrator without stopping operations
			// This allows audio playback to continue and recording to persist
			orchestrator.updateProfile(newProfile);

			// Update currentProfile state
			currentProfile = newProfile;

			console.log(
				'[Profile] Successfully switched to:',
				newProfile.name,
				'Voice ID:',
				newProfile.config.voice_id,
				wasRecording ? '(recording continues)' : '',
				wasPlaying ? '(audio continues playing)' : ''
			);
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : 'Failed to switch voice profile. Please try again.';
			console.error('[Profile] Failed to switch profile:', err);
		} finally {
			isSwitchingProfile = false;
		}
	}

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
				errorMessage = null;
			} catch (err) {
				errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
			}
		} else {
			try {
				errorMessage = null;
				await orchestrator.start();
			} catch (err) {
				errorMessage =
					err instanceof Error
						? err.message
						: 'Failed to start recording. Please check microphone permissions.';
			}
		}
	}

	async function sendDemoAudio() {
		if (!orchestrator || currentState === 'processing') return;

		try {
			const demoAudio =
				'/audio/ElevenLabs_2025-12-17T19_24_59_Brittney - Relaxing, Calm and Meditative_pvc_sp95_s50_sb75_f2-5.wav';
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

	<div class="profile-section">
		<ProfileDropdown disabled={isSwitchingProfile} onProfileChange={handleProfileChange} />
		{#if isSwitchingProfile}
			<div class="profile-switching-indicator">Switching voice profile...</div>
		{/if}
	</div>

	<RateLimitIndicator />

	<button
		type="button"
		class="crisis-button"
		onclick={openCrisisModal}
		aria-label="Open crisis hotlines and support resources"
	>
		<span class="crisis-icon">🆘</span>
		<span class="crisis-text">Crisis Help</span>
	</button>

	<div class="voice-controls">
		<div class="state-indicator" style="color: {getStateColor()}">
			<span class="state-dot"></span>
			<span class="state-text">{getStateLabel()}</span>
		</div>

		<button
			class="record-button"
			onclick={toggleListening}
			disabled={currentState === 'processing'}
		>
			{#if isListening}
				<span class="button-icon">⏹</span>
				Stop Recording
			{:else}
				<span class="button-icon">🎤</span>
				Start Recording
			{/if}
		</button>

		<!-- <button
			class="demo-button"
			onclick={sendDemoAudio}
			disabled={currentState === 'processing' || isListening}
		>
			<span class="button-icon">🎵</span>
			Send Demo Audio
		</button> -->

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
		color: hsl(220, 30%, 60%);
	}

	.dark h1 {
		color: hsl(220, 20%, 85%);
	}

	.profile-section {
		margin-bottom: 2rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
	}

	.profile-switching-indicator {
		padding: 0.5rem 1rem;
		background: hsl(220, 50%, 95%);
		border: 1px solid hsl(220, 40%, 80%);
		border-radius: 0.5rem;
		color: hsl(220, 50%, 40%);
		font-size: 0.85rem;
		text-align: center;
		animation: pulse 2s infinite;
	}

	.dark .profile-switching-indicator {
		background: hsl(220, 30%, 25%);
		border-color: hsl(220, 40%, 40%);
		color: hsl(220, 50%, 70%);
	}

	.crisis-button {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, hsl(0, 70%, 55%), hsl(0, 80%, 50%));
		color: white;
		border: none;
		border-radius: 2rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
		transition: all 0.3s ease;
		z-index: 1000;
		animation: pulse-glow 2s infinite;
	}

	.crisis-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
		background: linear-gradient(135deg, hsl(0, 70%, 50%), hsl(0, 80%, 45%));
	}

	.crisis-button:active {
		transform: translateY(0);
	}

	.crisis-icon {
		font-size: 1.3rem;
	}

	.crisis-text {
		white-space: nowrap;
	}

	@keyframes pulse-glow {
		0%,
		100% {
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
		}
		50% {
			box-shadow: 0 4px 20px rgba(220, 50%, 50%, 0.5);
		}
	}

	@media (max-width: 640px) {
		.crisis-button {
			bottom: 1rem;
			right: 1rem;
			padding: 0.75rem 1.25rem;
			font-size: 0.9rem;
		}

		.crisis-text {
			display: none;
		}

		.crisis-icon {
			font-size: 1.5rem;
		}
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
