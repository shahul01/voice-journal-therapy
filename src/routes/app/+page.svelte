<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { selectedProfile } from '$lib/stores/profile';
	import {
		conversationsStore,
		activeConversation,
		conversationList
	} from '$lib/stores/conversations';
	import { ConversationOrchestrator } from '$lib/utils/conversation/orchestrator';
	import RateLimitIndicator from '$lib/components/RateLimitIndicator.svelte';
	import ProfileDropdown from '$lib/components/ProfileDropdown.svelte';
	import { openCrisisModal } from '$lib/stores/crisisModal';
	import {
		breathingExerciseModal,
		openBreathingExerciseModal,
		closeBreathingExerciseModal
	} from '$lib/stores/breathingExerciseModal';
	import { updateCrisisDetection } from '$lib/stores/crisisDetection';
	import BreathingGroundingExercise from '$lib/components/BreathingGroundingExercise.svelte';
	import EmergencyContactQuickModal from '$lib/components/EmergencyContactQuickModal.svelte';
	import type { ConversationState } from '$lib/types/conversation';
	import type { Profile } from '$lib/types/profile';
	import type { CrisisDetectionResult } from '$lib/types/crisis';

	let isListening = $state(false);
	let conversationState = $state<ConversationState>({ messages: [], contextWindow: [] });
	let currentProfile = $state<Profile>(get(selectedProfile));
	let currentState = $state<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
	let errorMessage = $state<string | null>(null);
	let isSwitchingProfile = $state(false);
	let breathingModalState = $state($breathingExerciseModal);
	let emergencyContactModalOpen = $state(false);
	let showConversationList = $state(false);
	let currentConversationId: string | null = null;
	let orchestrator: ConversationOrchestrator | null = null;
	let unsubscribeProfile: (() => void) | null = null;
	let unsubscribeBreathingModal: (() => void) | null = null;
	let unsubscribeActiveConversation: (() => void) | null = null;
	let isEditingName = $state(false);
	let editingNameValue = $state('');

	onMount(() => {
		// Initialize conversations - create first one if none exist
		const currentConversations = get(conversationList);
		if (currentConversations.length === 0) {
			conversationsStore.createConversation();
		}

		// Load active conversation state
		const active = get(activeConversation);
		if (active) {
			conversationState = active.state;
			currentConversationId = active.id;
		}

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

		// Subscribe to breathing modal state
		unsubscribeBreathingModal = breathingExerciseModal.subscribe((state) => {
			breathingModalState = state;
		});

		// Subscribe to active conversation changes
		unsubscribeActiveConversation = activeConversation.subscribe((conv) => {
			if (conv) {
				// Only reinitialize if switching to a DIFFERENT conversation
				const isNewConversation = conv.id !== currentConversationId;

				console.log('[App] Active conversation changed:', {
					newId: conv.id,
					oldId: currentConversationId,
					isNewConversation,
					messageCount: conv.state.messages.length
				});

				conversationState = conv.state;
				currentConversationId = conv.id;

				// Only reinitialize orchestrator when switching conversations, not on state updates
				if (isNewConversation && orchestrator) {
					console.log('[App] Switching conversation - reinitializing orchestrator');
					orchestrator?.stop();
					initializeOrchestrator();
				}
			}
		});
	});

	onDestroy(() => {
		if (orchestrator) {
			orchestrator?.stop();
		}
		if (unsubscribeProfile) {
			unsubscribeProfile();
		}
		if (unsubscribeBreathingModal) {
			unsubscribeBreathingModal();
		}
		if (unsubscribeActiveConversation) {
			unsubscribeActiveConversation();
		}
	});

	function initializeOrchestrator(profile?: Profile) {
		const profileToUse = profile || currentProfile;

		console.log('[App] initializeOrchestrator called with profile:', {
			name: profileToUse.name,
			id: profileToUse.id,
			voiceId: profileToUse.config.voice_id,
			wasPassed: profile !== undefined,
			currentMessageCount: conversationState.messages.length
		});
		if (orchestrator) {
			console.log('[App] Stopping existing orchestrator');
			orchestrator.stop();
			orchestrator = null;
		}

		orchestrator = new ConversationOrchestrator({
			onTranscriptUpdate: (state) => {
				conversationState = state;
				saveConversationState();
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
			onCrisisDetected: handleCrisisDetected,
			profile: profileToUse,
			initialState: conversationState
		});

		console.log(
			'[App] Orchestrator created successfully with',
			conversationState.messages.length,
			'existing messages'
		);
	}

	/**
	 * Handle crisis detection result and trigger appropriate intervention
	 */
	function handleCrisisDetected(result: CrisisDetectionResult) {
		console.log('🚨🚨🚨 [App] handleCrisisDetected CALLED 🚨🚨🚨');
		console.log('[App] Crisis result:', JSON.stringify(result, null, 2));

		// Update crisis detection store
		updateCrisisDetection(result);

		// Trigger appropriate intervention based on crisis level
		switch (result.level) {
			case 0:
				// No intervention needed
				console.log('[App] ✅ Level 0: No crisis detected, continuing normally');
				break;

			case 1:
				// Offer breathing and grounding exercises
				console.log('[App] 🧘 Level 1: Opening breathing/grounding modal');
				openBreathingExerciseModal(1);
				console.log('[App] Modal state:', $breathingExerciseModal);
				break;

			case 2:
				// Proper conversation and/or breathing exercises
				console.log('[App] 🧘 Level 2: Opening breathing/grounding modal with enhanced support');
				openBreathingExerciseModal(2);
				console.log('[App] Modal state:', $breathingExerciseModal);
				break;

			case 3:
				// Show emergency contacts modal
				console.log('[App] 👥 Level 3: Opening emergency contacts modal');
				emergencyContactModalOpen = true;
				console.log('[App] Emergency modal open:', emergencyContactModalOpen);
				break;

			case 4:
				// Show crisis hotlines modal (critical)
				console.log('[App] 🆘 Level 4 (CRITICAL): Opening crisis hotlines modal');
				openCrisisModal();
				break;

			default:
				console.warn('[App] ⚠️ Unknown crisis level:', result.level);
		}
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

	/**
	 * Creates a new conversation and switches to it
	 */
	function createNewConversation() {
		// Stop current recording if active
		if (orchestrator && isListening) {
			orchestrator.stop();
		}

		const newId = conversationsStore.createConversation();
		console.log('[App] Created new conversation:', newId);

		// Reset error message
		errorMessage = null;

		// Close conversation list
		showConversationList = false;
	}

	/**
	 * Switches to a different conversation
	 */
	function switchConversation(conversationId: string) {
		// Stop current recording if active
		if (orchestrator && isListening) {
			orchestrator.stop();
		}

		conversationsStore.setActiveConversation(conversationId);
		console.log('[App] Switched to conversation:', conversationId);

		// Reset error message
		errorMessage = null;

		// Close conversation list
		showConversationList = false;
	}

	/**
	 * Deletes a conversation
	 */
	function deleteConversation(conversationId: string) {
		if (confirm('Delete this conversation? This cannot be undone.')) {
			conversationsStore.deleteConversation(conversationId);
			console.log('[App] Deleted conversation:', conversationId);
		}
	}

	/**
	 * Saves the current conversation state to the store
	 */
	function saveConversationState() {
		conversationsStore.updateActiveConversation(conversationState);
	}

	/**
	 * Starts editing the conversation name
	 */
	function startEditingName() {
		if (!$activeConversation) return;
		isEditingName = true;
		editingNameValue = $activeConversation.title;
	}

	/**
	 * Saves the edited conversation name
	 */
	function saveConversationName() {
		if (!$activeConversation || !editingNameValue.trim()) {
			cancelEditingName();
			return;
		}

		conversationsStore.updateConversationName($activeConversation.id, editingNameValue);
		isEditingName = false;
		editingNameValue = '';
	}

	/**
	 * Cancels editing the conversation name
	 */
	function cancelEditingName() {
		isEditingName = false;
		editingNameValue = '';
	}

	/**
	 * Handles keydown events in the name input
	 */
	function handleNameInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveConversationName();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEditingName();
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

	async function sendNow() {
		if (!orchestrator) return;

		try {
			errorMessage = null;
			await orchestrator.sendNow();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to send recording';
		}
	}

	async function stopAISpeaking() {
		if (!orchestrator) return;

		try {
			errorMessage = null;
			await orchestrator.stopAISpeaking(true);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to stop AI';
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

	<div class="conversation-management">
		<div class="conversation-header">
			<div class="conversation-toggle-wrapper">
				<button
					type="button"
					class="conversation-toggle"
					onclick={() => (showConversationList = !showConversationList)}
					aria-label={showConversationList ? 'Hide conversations' : 'Show conversations'}
					disabled={isEditingName}
				>
					<span class="button-icon">💬</span>
					{#if isEditingName}
						<input
							type="text"
							class="conversation-name-input"
							bind:value={editingNameValue}
							onkeydown={handleNameInputKeydown}
							onblur={saveConversationName}
							placeholder="Enter conversation name"
							autofocus
							onclick={(e) => e.stopPropagation()}
						/>
					{:else if $activeConversation}
						<span class="conversation-title">{$activeConversation.title}</span>
					{:else}
						<span class="conversation-title">No conversation</span>
					{/if}
					<span class="dropdown-icon">{showConversationList ? '▲' : '▼'}</span>
				</button>

				{#if $activeConversation && !isEditingName}
					<button
						type="button"
						class="edit-name-button"
						onclick={startEditingName}
						disabled={isListening || currentState === 'processing'}
						aria-label="Edit conversation name"
						title="Edit conversation name"
					>
						✏️
					</button>
				{/if}
			</div>

			<button
				type="button"
				class="new-conversation-button"
				onclick={createNewConversation}
				disabled={isListening || currentState === 'processing'}
				aria-label="Create new conversation"
			>
				<span class="button-icon">✨</span>
				New
			</button>
		</div>

		{#if showConversationList}
			<div class="conversation-list">
				{#if $conversationList.length === 0}
					<div class="empty-conversations">No conversations yet</div>
				{:else}
					{#each $conversationList as conv (conv.id)}
						<div
							class="conversation-item"
							class:active={$activeConversation?.id === conv.id}
							onclick={() => switchConversation(conv.id)}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && switchConversation(conv.id)}
						>
							<div class="conversation-item-content">
								<div class="conversation-item-title">{conv.title}</div>
								<div class="conversation-item-meta">
									<span>{conv.state.messages.length} messages</span>
									<span>·</span>
									<span>{new Date(conv.updatedAt).toLocaleDateString()}</span>
								</div>
							</div>
							<button
								type="button"
								class="delete-conversation-button"
								onclick={(e) => {
									e.stopPropagation();
									deleteConversation(conv.id);
								}}
								aria-label="Delete conversation"
							>
								🗑️
							</button>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>

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

		<div class="button-group">
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

			{#if isListening}
				<button class="send-now-button" onclick={sendNow} disabled={currentState === 'processing'}>
					<span class="button-icon">📤</span>
					Send Now
				</button>
			{/if}

			{#if currentState === 'speaking'}
				<button class="stop-ai-button" onclick={stopAISpeaking}>
					<span class="button-icon">✋</span>
					Stop AI & Talk
				</button>
			{/if}
		</div>

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
	<div class="ai-disclaimer">
		<strong>Important:</strong> VoiceGuard AI is
		<span aria-label="artificial intelligence">AI</span>-powered and is not a replacement for
		professional mental therapy.
	</div>
</div>

<!-- Crisis Intervention Modals -->
<BreathingGroundingExercise
	isOpen={breathingModalState.isOpen}
	crisisLevel={breathingModalState.crisisLevel || 1}
	onClose={closeBreathingExerciseModal}
/>

<EmergencyContactQuickModal
	isOpen={emergencyContactModalOpen}
	onClose={() => (emergencyContactModalOpen = false)}
/>

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

	.button-group {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
		justify-content: center;
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

	.send-now-button {
		padding: 1rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 2rem;
		background: linear-gradient(135deg, hsl(150, 60%, 45%), hsl(170, 60%, 45%));
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		animation: pulse-scale 2s infinite;
	}

	.send-now-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
		background: linear-gradient(135deg, hsl(150, 60%, 40%), hsl(170, 60%, 40%));
	}

	.send-now-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@keyframes pulse-scale {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.02);
		}
	}

	.stop-ai-button {
		padding: 1rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 2rem;
		background: linear-gradient(135deg, hsl(30, 80%, 50%), hsl(15, 80%, 50%));
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		animation: pulse-attention 1.5s infinite;
	}

	.stop-ai-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
		background: linear-gradient(135deg, hsl(30, 80%, 45%), hsl(15, 80%, 45%));
	}

	.stop-ai-button:active {
		transform: translateY(0);
	}

	@keyframes pulse-attention {
		0%,
		100% {
			transform: scale(1);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		}
		50% {
			transform: scale(1.03);
			box-shadow: 0 4px 16px rgba(255, 140, 0, 0.4);
		}
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

	/* Conversation Management Styles */
	.conversation-management {
		margin-bottom: 1.5rem;
		background: hsl(220, 20%, 98%);
		border-radius: 1rem;
		padding: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	}

	.dark .conversation-management {
		background: hsl(220, 20%, 15%);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.conversation-header {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.conversation-toggle-wrapper {
		flex: 1;
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.conversation-toggle {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: white;
		border: 1px solid hsl(220, 20%, 85%);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.95rem;
	}

	.conversation-toggle:disabled {
		cursor: default;
		opacity: 1;
	}

	.dark .conversation-toggle {
		background: hsl(220, 20%, 20%);
		border-color: hsl(220, 20%, 30%);
	}

	.conversation-toggle:hover {
		background: hsl(220, 20%, 97%);
		border-color: hsl(220, 30%, 70%);
	}

	.dark .conversation-toggle:hover {
		background: hsl(220, 20%, 25%);
		border-color: hsl(220, 30%, 40%);
	}

	.conversation-title {
		flex: 1;
		text-align: left;
		color: hsl(220, 30%, 30%);
		font-weight: 500;
	}

	.dark .conversation-title {
		color: hsl(220, 20%, 85%);
	}

	.dropdown-icon {
		color: hsl(220, 20%, 60%);
		font-size: 0.8rem;
	}

	.conversation-name-input {
		flex: 1;
		padding: 0.25rem 0.5rem;
		background: hsl(220, 20%, 98%);
		border: 2px solid hsl(220, 50%, 60%);
		border-radius: 0.375rem;
		font-size: 0.95rem;
		color: hsl(220, 30%, 30%);
		font-weight: 500;
		outline: none;
		font-family: inherit;
	}

	.dark .conversation-name-input {
		background: hsl(220, 20%, 15%);
		color: hsl(220, 20%, 85%);
		border-color: hsl(220, 50%, 50%);
	}

	.edit-name-button {
		padding: 0.5rem 0.75rem;
		background: hsl(220, 20%, 97%);
		border: 1px solid hsl(220, 20%, 85%);
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s ease;
		opacity: 0.7;
	}

	.dark .edit-name-button {
		background: hsl(220, 20%, 22%);
		border-color: hsl(220, 20%, 30%);
	}

	.edit-name-button:hover:not(:disabled) {
		opacity: 1;
		background: hsl(220, 30%, 95%);
		border-color: hsl(220, 30%, 70%);
		transform: scale(1.05);
	}

	.dark .edit-name-button:hover:not(:disabled) {
		background: hsl(220, 20%, 28%);
		border-color: hsl(220, 30%, 40%);
	}

	.edit-name-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.new-conversation-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: linear-gradient(135deg, hsl(220, 70%, 60%), hsl(240, 70%, 60%));
		color: white;
		border: none;
		border-radius: 0.75rem;
		cursor: pointer;
		font-size: 0.95rem;
		font-weight: 600;
		transition: all 0.2s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
	}

	.new-conversation-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
	}

	.new-conversation-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.conversation-list {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 300px;
		overflow-y: auto;
	}

	.empty-conversations {
		padding: 1.5rem;
		text-align: center;
		color: hsl(220, 20%, 60%);
		font-size: 0.9rem;
	}

	.conversation-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: white;
		border: 1px solid hsl(220, 20%, 90%);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.dark .conversation-item {
		background: hsl(220, 20%, 18%);
		border-color: hsl(220, 20%, 25%);
	}

	.conversation-item:hover {
		background: hsl(220, 30%, 97%);
		border-color: hsl(220, 30%, 75%);
		transform: translateX(4px);
	}

	.dark .conversation-item:hover {
		background: hsl(220, 20%, 23%);
		border-color: hsl(220, 30%, 35%);
	}

	.conversation-item.active {
		background: hsl(220, 70%, 96%);
		border-color: hsl(220, 70%, 70%);
		box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
	}

	.dark .conversation-item.active {
		background: hsl(220, 50%, 25%);
		border-color: hsl(220, 50%, 45%);
		box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
	}

	.conversation-item-content {
		flex: 1;
		min-width: 0;
	}

	.conversation-item-title {
		font-weight: 500;
		color: hsl(220, 30%, 30%);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.25rem;
	}

	.dark .conversation-item-title {
		color: hsl(220, 20%, 85%);
	}

	.conversation-item-meta {
		display: flex;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: hsl(220, 20%, 60%);
	}

	.dark .conversation-item-meta {
		color: hsl(220, 20%, 65%);
	}

	.delete-conversation-button {
		padding: 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		opacity: 0.6;
		transition: all 0.2s ease;
	}

	.delete-conversation-button:hover {
		opacity: 1;
		transform: scale(1.2);
	}

	@media (max-width: 640px) {
		.home {
			padding: 1rem;
		}

		.conversation-header {
			flex-direction: column;
		}

		.conversation-toggle-wrapper {
			width: 100%;
		}

		.new-conversation-button {
			width: 100%;
			justify-content: center;
		}

		.message-user,
		.message-ai {
			max-width: 85%;
		}

		.button-group {
			flex-direction: column;
			width: 100%;
			gap: 0.75rem;
		}

		.record-button,
		.send-now-button,
		.stop-ai-button {
			width: 100%;
			justify-content: center;
			padding: 0.875rem 1.5rem;
			font-size: 1rem;
		}
	}
	.ai-disclaimer {
		background: hsl(40, 100%, 97%);
		border: 1px solid hsl(35, 85%, 85%);
		color: hsl(30, 70%, 45%);
		font-size: 0.97rem;
		border-radius: 0.75rem;
		padding: 1em 1.1em;
		margin: 1.5em 0 0.8em 0;
		box-shadow: 0 2px 8px 0 hsl(30 60% 80% / 18%);
	}
	.dark .ai-disclaimer {
		background: hsl(30, 25%, 20%);
		border: 1px solid hsl(30, 15%, 30%);
		color: hsl(37, 90%, 82%);
	}
	.crisis-hotline-link {
		color: hsl(10, 70%, 46%);
		text-decoration: underline;
	}
	.dark .crisis-hotline-link {
		color: hsl(10, 85%, 60%);
	}
</style>
