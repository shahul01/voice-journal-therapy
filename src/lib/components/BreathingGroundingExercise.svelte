<script lang="ts">
	import { onMount } from 'svelte';
	import { selectedProfile } from '$lib/stores/profile';
	import { BREATHING_GUIDANCE, GROUNDING_GUIDANCE, LEVEL_2_SUPPORT, type GuidanceStep } from '$lib/utils/crisis/breathingScripts';
	import type { Profile } from '$lib/types/profile';

	interface Props {
		isOpen: boolean;
		crisisLevel: 1 | 2;
		onClose: () => void;
	}

	let { isOpen, crisisLevel, onClose }: Props = $props();
	let currentProfile = $state<Profile>($selectedProfile);

	let exerciseStep = $state<'breathing' | 'grounding' | 'complete'>('breathing');
	let isVoiceGuidanceActive = $state(false);
	let isGeneratingAudio = $state(false);
	let currentStepIndex = $state(0);
	let currentAction = $state<string>('intro');
	let errorMessage = $state<string | null>(null);
	let audioElement: HTMLAudioElement | null = null;
	let stepTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Parse percentage string to decimal for voice settings
	 */
	function parsePercentage(value: string): number {
		if (!value) return 0.5;
		const cleaned = value.toString().replace('%', '').trim();
		const parsed = parseFloat(cleaned);
		if (isNaN(parsed)) return 0.5;
		return parsed > 1 ? parsed / 100 : parsed;
	}

	/**
	 * Generate TTS audio using user's selected voice profile
	 */
	async function generateTTS(text: string): Promise<ArrayBuffer> {
		const voiceId = currentProfile.config.voice_id;
		const stability = parsePercentage(currentProfile.config.Stability);
		const similarityBoost = parsePercentage(currentProfile.config['Similarity boost']);

		const response = await fetch('/api/v1/elevenlabs/tts', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				text,
				voiceId,
				modelId: 'eleven_flash_v2_5',
				stability: Math.max(stability, 0.75), // Minimum 0.75 for calm voice
				similarityBoost,
				speed: 0.85 // Slightly slower for calming effect
			})
		});

		if (!response.ok) {
			throw new Error(`TTS generation failed: ${response.statusText}`);
		}

		return response.arrayBuffer();
	}

	/**
	 * Play audio from ArrayBuffer
	 */
	async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
		return new Promise((resolve, reject) => {
			const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
			const url = URL.createObjectURL(blob);

			if (audioElement) {
				audioElement.pause();
				audioElement.src = '';
			}

			audioElement = new Audio(url);

			audioElement.onended = () => {
				URL.revokeObjectURL(url);
				resolve();
			};

			audioElement.onerror = (err) => {
				URL.revokeObjectURL(url);
				reject(new Error('Audio playback failed'));
			};

			audioElement.play().catch(reject);
		});
	}

	/**
	 * Run voice-guided breathing exercise
	 */
	async function startVoiceGuidedBreathing() {
		isVoiceGuidanceActive = true;
		currentStepIndex = 0;
		errorMessage = null;

		try {
			await runGuidanceSteps(BREATHING_GUIDANCE);

			// After breathing, move to grounding
			exerciseStep = 'grounding';
			await runGuidanceSteps(GROUNDING_GUIDANCE);

			// Level 2: Additional support message
			if (crisisLevel === 2) {
				await runGuidanceSteps(LEVEL_2_SUPPORT);
			}

			exerciseStep = 'complete';
		} catch (err) {
			console.error('[Voice Guidance] Error:', err);
			errorMessage = 'Voice guidance interrupted. You can try again or continue on your own.';
		} finally {
			isVoiceGuidanceActive = false;
		}
	}

	/**
	 * Run through guidance steps with TTS
	 */
	async function runGuidanceSteps(steps: GuidanceStep[]) {
		for (let i = 0; i < steps.length; i++) {
			if (!isVoiceGuidanceActive) break;

			const step = steps[i];
			currentStepIndex = i;
			currentAction = step.action || 'transition';

			// Generate and play TTS
			isGeneratingAudio = true;
			const audioBuffer = await generateTTS(step.text);
			isGeneratingAudio = false;

			await playAudio(audioBuffer);

			// Wait for step duration after audio finishes
			await new Promise(resolve => {
				stepTimeout = setTimeout(resolve, step.duration);
			});
		}
	}

	/**
	 * Stop voice guidance
	 */
	function stopVoiceGuidance() {
		isVoiceGuidanceActive = false;

		if (audioElement) {
			audioElement.pause();
			audioElement.src = '';
		}

		if (stepTimeout) {
			clearTimeout(stepTimeout);
			stepTimeout = null;
		}
	}

	function completeExercise() {
		exerciseStep = 'complete';
	}

	function handleClose() {
		stopVoiceGuidance();
		exerciseStep = 'breathing';
		currentStepIndex = 0;
		errorMessage = null;
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	onMount(() => {
		// Subscribe to profile changes
		const unsubscribe = selectedProfile.subscribe((profile) => {
			currentProfile = profile;
		});

		return () => {
			stopVoiceGuidance();
			unsubscribe();
		};
	});

	$effect(() => {
		if (isOpen) {
			// Reset state when modal opens
			exerciseStep = 'breathing';
			currentStepIndex = 0;
			isVoiceGuidanceActive = false;
			errorMessage = null;
		} else {
			stopVoiceGuidance();
		}
	});
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		onclick={handleClose}
		onkeydown={handleKeydown}
		role="button"
		tabindex="0"
		aria-label="Close modal backdrop"
	></div>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<div class="modal-header">
			<h2 id="modal-title">Let's Take a Moment Together</h2>
			<button type="button" class="close-button" onclick={handleClose} aria-label="Close modal">
				×
			</button>
		</div>

		<div class="modal-body">
			{#if errorMessage}
				<div class="error-banner" role="alert">
					<span class="error-icon">⚠️</span>
					{errorMessage}
				</div>
			{/if}

			{#if exerciseStep === 'breathing'}
				<div class="exercise-section">
					<p class="intro-text">
						I'm here with you. Let me guide you through a calming breathing exercise using my voice to help you relax.
					</p>

					{#if !isVoiceGuidanceActive}
						<div class="voice-guidance-info">
							<div class="info-icon">🎙️</div>
							<h3>Voice-Guided Breathing & Grounding</h3>
							<p class="info-description">
								I'll guide you through breathing exercises and grounding techniques with my voice.
								Just relax, listen, and follow along.
							</p>
							<ul class="guidance-features">
								<li>🌬️ 3 cycles of calming breath work</li>
								<li>🧘 5-4-3-2-1 grounding technique</li>
								<li>💙 Personalized with your selected voice</li>
								<li>⏱️ Takes about 3-4 minutes</li>
							</ul>
						</div>

						<button type="button" class="primary-button large" onclick={startVoiceGuidedBreathing}>
							<span class="button-icon">▶️</span>
							Start Voice-Guided Session
						</button>
					{:else}
						<div class="voice-active-display">
							{#if isGeneratingAudio}
								<div class="generating-indicator">
									<div class="pulse-icon">🎙️</div>
									<p class="generating-text">Preparing guidance...</p>
								</div>
							{:else}
								<div class="breath-visualizer">
									<div class="breath-circle {currentAction}"></div>
									<div class="voice-instruction">
										<span class="listening-icon">🎧</span>
										<span class="instruction-text">Listen and follow my voice...</span>
									</div>
								</div>
							{/if}
						</div>

						<button type="button" class="secondary-button" onclick={stopVoiceGuidance}>
							<span class="button-icon">⏸️</span>
							Pause
						</button>
					{/if}
				</div>
			{:else if exerciseStep === 'grounding'}
				<div class="exercise-section">
					{#if isVoiceGuidanceActive}
						<div class="voice-active-display">
							<div class="grounding-visualizer">
								<div class="grounding-icon">🧘</div>
								<p class="grounding-text">Continue listening to my voice...</p>
							</div>
						</div>

						<button type="button" class="secondary-button" onclick={stopVoiceGuidance}>
							<span class="button-icon">⏸️</span>
							Pause
						</button>
					{:else}
						<p class="intro-text">Grounding exercise in progress...</p>
					{/if}
				</div>
			{:else if exerciseStep === 'complete'}
				<div class="exercise-section complete">
					<div class="success-icon">✓</div>
					<h3>You Did Great!</h3>
					<p class="complete-text">
						Taking these moments for yourself is important. Remember, you can return to these
						exercises anytime you need them.
					</p>

					{#if crisisLevel === 2}
						<div class="additional-support">
							<p class="support-text">
								I'm here to listen if you'd like to talk more. Would you like to continue our
								conversation?
							</p>
						</div>
					{/if}

					<div class="action-buttons">
						<button
							type="button"
							class="secondary-button"
							onclick={() => (exerciseStep = 'breathing')}
						>
							Practice Again
						</button>
						<button type="button" class="primary-button" onclick={handleClose}> Continue </button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="postcss">
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 9998;
		backdrop-filter: blur(4px);
		animation: fadeIn 0.2s ease;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: hsl(200, 30%, 98%);
		border-radius: 1.5rem;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
		z-index: 9999;
		width: 90%;
		max-width: 600px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: slideUp 0.3s ease;
	}

	.dark .modal {
		background: hsl(200, 15%, 15%);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translate(-50%, -40%);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%);
		}
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid hsl(200, 20%, 85%);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.dark .modal-header {
		border-bottom-color: hsl(200, 20%, 35%);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(200, 30%, 20%);
	}

	.dark .modal-header h2 {
		color: hsl(200, 20%, 85%);
	}

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		line-height: 1;
		cursor: pointer;
		color: hsl(200, 20%, 60%);
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: hsl(200, 20%, 90%);
		color: hsl(200, 30%, 20%);
	}

	.dark .close-button:hover {
		background: hsl(200, 20%, 25%);
		color: hsl(200, 20%, 85%);
	}

	.modal-body {
		padding: 2rem;
		overflow-y: auto;
		flex: 1;
	}

	.exercise-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		align-items: center;
		text-align: center;
	}

	.intro-text {
		color: hsl(200, 20%, 40%);
		line-height: 1.6;
		margin: 0;
		font-size: 1rem;
	}

	.dark .intro-text {
		color: hsl(200, 20%, 70%);
	}

	.instructions {
		background: hsl(200, 30%, 95%);
		padding: 1.5rem;
		border-radius: 1rem;
		width: 100%;
		text-align: left;
	}

	.dark .instructions {
		background: hsl(200, 20%, 20%);
	}

	.instructions h3 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: hsl(200, 40%, 30%);
	}

	.dark .instructions h3 {
		color: hsl(200, 30%, 75%);
	}

	.instructions ol {
		margin: 0;
		padding-left: 1.5rem;
	}

	.instructions li {
		color: hsl(200, 20%, 35%);
		line-height: 1.8;
		font-size: 0.95rem;
	}

	.dark .instructions li {
		color: hsl(200, 20%, 75%);
	}

	.instruction-note {
		margin: 1rem 0 0 0;
		font-size: 0.9rem;
		color: hsl(200, 40%, 40%);
		font-style: italic;
	}

	.dark .instruction-note {
		color: hsl(200, 30%, 65%);
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: hsl(30, 60%, 95%);
		border: 1px solid hsl(30, 60%, 80%);
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
		color: hsl(30, 60%, 30%);
		font-size: 0.95rem;
	}

	.dark .error-banner {
		background: hsl(30, 40%, 22%);
		border-color: hsl(30, 50%, 35%);
		color: hsl(30, 60%, 75%);
	}

	.error-icon {
		font-size: 1.3rem;
		flex-shrink: 0;
	}

	.voice-guidance-info {
		background: hsl(200, 40%, 96%);
		border: 2px solid hsl(200, 40%, 85%);
		border-radius: 1rem;
		padding: 1.5rem;
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.dark .voice-guidance-info {
		background: hsl(200, 25%, 20%);
		border-color: hsl(200, 30%, 35%);
	}

	.info-icon {
		font-size: 3rem;
		margin-bottom: 0.75rem;
	}

	.voice-guidance-info h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.2rem;
		color: hsl(200, 40%, 25%);
		font-weight: 600;
	}

	.dark .voice-guidance-info h3 {
		color: hsl(200, 30%, 80%);
	}

	.info-description {
		margin: 0 0 1rem 0;
		color: hsl(200, 20%, 40%);
		line-height: 1.6;
		font-size: 0.95rem;
	}

	.dark .info-description {
		color: hsl(200, 20%, 70%);
	}

	.guidance-features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		text-align: left;
		max-width: 400px;
		margin: 0 auto;
	}

	.guidance-features li {
		color: hsl(200, 25%, 35%);
		font-size: 0.9rem;
		padding-left: 0;
	}

	.dark .guidance-features li {
		color: hsl(200, 25%, 75%);
	}

	.primary-button.large {
		padding: 1rem 2.5rem;
		font-size: 1.1rem;
	}

	.button-icon {
		font-size: 1.2rem;
	}

	.voice-active-display {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.generating-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
	}

	.pulse-icon {
		font-size: 4rem;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.6;
			transform: scale(1.1);
		}
	}

	.generating-text {
		color: hsl(200, 20%, 50%);
		font-size: 1rem;
		margin: 0;
	}

	.dark .generating-text {
		color: hsl(200, 20%, 70%);
	}

	.voice-instruction {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}

	.listening-icon {
		font-size: 2rem;
	}

	.instruction-text {
		font-size: 1.1rem;
		color: hsl(200, 30%, 30%);
		font-weight: 500;
	}

	.dark .instruction-text {
		color: hsl(200, 25%, 75%);
	}

	.grounding-visualizer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
	}

	.grounding-icon {
		font-size: 4rem;
		animation: gentle-float 3s ease-in-out infinite;
	}

	@keyframes gentle-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.grounding-text {
		color: hsl(200, 20%, 45%);
		font-size: 1.1rem;
		margin: 0;
		font-weight: 500;
	}

	.dark .grounding-text {
		color: hsl(200, 20%, 70%);
	}

	.breath-visualizer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		width: 100%;
	}

	.breath-circle {
		width: 150px;
		height: 150px;
		border-radius: 50%;
		background: linear-gradient(135deg, hsl(200, 60%, 60%), hsl(200, 70%, 70%));
		box-shadow: 0 4px 20px rgba(0, 150, 200, 0.3);
		transition:
			transform 0.3s ease,
			box-shadow 0.3s ease;
	}

	.breath-circle.intro {
		transform: scale(1);
		animation: gentle-pulse 2s ease-in-out infinite;
	}

	.breath-circle.inhale {
		animation: breatheIn 4.5s ease-in-out forwards;
	}

	.breath-circle.hold {
		transform: scale(1.3);
		box-shadow: 0 8px 30px rgba(0, 150, 200, 0.5);
	}

	.breath-circle.exhale {
		animation: breatheOut 6.5s ease-in-out forwards;
	}

	.breath-circle.rest {
		transform: scale(1);
	}

	.breath-circle.transition,
	.breath-circle.complete {
		transform: scale(1);
		animation: gentle-pulse 2s ease-in-out infinite;
	}

	@keyframes gentle-pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.05);
		}
	}

	@keyframes breatheIn {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.3);
		}
	}

	@keyframes breatheOut {
		from {
			transform: scale(1.3);
		}
		to {
			transform: scale(1);
		}
	}

	.breath-instruction {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.phase-text {
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(200, 40%, 30%);
	}

	.dark .phase-text {
		color: hsl(200, 30%, 75%);
	}

	.count-text {
		font-size: 1rem;
		color: hsl(200, 20%, 50%);
	}

	.dark .count-text {
		color: hsl(200, 20%, 65%);
	}

	.cycle-count {
		font-size: 0.9rem;
		color: hsl(200, 20%, 55%);
		font-weight: 500;
	}

	.dark .cycle-count {
		color: hsl(200, 20%, 65%);
	}

	.grounding-technique {
		width: 100%;
		background: hsl(200, 30%, 95%);
		padding: 1.5rem;
		border-radius: 1rem;
		text-align: left;
	}

	.dark .grounding-technique {
		background: hsl(200, 20%, 20%);
	}

	.grounding-technique h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.2rem;
		color: hsl(200, 40%, 30%);
		text-align: center;
	}

	.dark .grounding-technique h3 {
		color: hsl(200, 30%, 75%);
	}

	.technique-intro {
		margin: 0 0 1rem 0;
		color: hsl(200, 20%, 40%);
		font-size: 0.95rem;
		text-align: center;
	}

	.dark .technique-intro {
		color: hsl(200, 20%, 70%);
	}

	.grounding-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.grounding-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: hsl(200, 20%, 98%);
		border-radius: 0.5rem;
	}

	.dark .grounding-item {
		background: hsl(200, 15%, 25%);
	}

	.grounding-item .number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: hsl(200, 50%, 50%);
		color: white;
		border-radius: 50%;
		font-weight: 700;
		font-size: 1.1rem;
		flex-shrink: 0;
	}

	.grounding-item .text {
		color: hsl(200, 20%, 35%);
		font-size: 0.95rem;
	}

	.dark .grounding-item .text {
		color: hsl(200, 20%, 75%);
	}

	.technique-note {
		margin: 1rem 0 0 0;
		font-size: 0.85rem;
		color: hsl(200, 30%, 45%);
		font-style: italic;
		text-align: center;
	}

	.dark .technique-note {
		color: hsl(200, 25%, 65%);
	}

	.exercise-section.complete {
		padding-top: 1rem;
	}

	.success-icon {
		width: 80px;
		height: 80px;
		background: hsl(140, 50%, 50%);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		font-weight: 700;
		margin-bottom: 1rem;
	}

	.exercise-section.complete h3 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		color: hsl(200, 40%, 30%);
	}

	.dark .exercise-section.complete h3 {
		color: hsl(200, 30%, 75%);
	}

	.complete-text {
		color: hsl(200, 20%, 40%);
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
	}

	.dark .complete-text {
		color: hsl(200, 20%, 70%);
	}

	.additional-support {
		width: 100%;
		background: hsl(45, 50%, 95%);
		border: 1px solid hsl(45, 50%, 80%);
		border-radius: 0.75rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.dark .additional-support {
		background: hsl(45, 30%, 25%);
		border-color: hsl(45, 40%, 40%);
	}

	.support-text {
		margin: 0;
		color: hsl(45, 40%, 30%);
		font-size: 0.95rem;
	}

	.dark .support-text {
		color: hsl(45, 50%, 75%);
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		width: 100%;
		justify-content: center;
		flex-wrap: wrap;
	}

	.primary-button,
	.secondary-button {
		padding: 0.875rem 2rem;
		border: none;
		border-radius: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		min-width: 150px;
	}

	.primary-button {
		background: hsl(200, 60%, 50%);
		color: white;
	}

	.primary-button:hover {
		background: hsl(200, 60%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 150, 200, 0.3);
	}

	.secondary-button {
		background: hsl(200, 20%, 85%);
		color: hsl(200, 30%, 25%);
	}

	.secondary-button:hover {
		background: hsl(200, 20%, 80%);
	}

	.dark .secondary-button {
		background: hsl(200, 20%, 30%);
		color: hsl(200, 20%, 85%);
	}

	.dark .secondary-button:hover {
		background: hsl(200, 20%, 35%);
	}

	@media (max-width: 640px) {
		.modal {
			width: 95%;
			max-height: 95vh;
		}

		.modal-body {
			padding: 1.5rem;
		}

		.breath-circle {
			width: 120px;
			height: 120px;
		}

		.action-buttons {
			flex-direction: column;
		}

		.primary-button,
		.secondary-button {
			width: 100%;
		}
	}
</style>
