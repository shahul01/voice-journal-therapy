<script lang="ts">
	import { onMount } from 'svelte';
	import { createFocusTrap } from '$lib/utils/focusTrap';
	import type { EmergencyContact } from '$lib/types/emergency';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let contacts = $state<EmergencyContact[]>([]);
	let isLoading = $state(false);
	let isSendingAlerts = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let modalElement: HTMLElement | null = null;
	let cleanupFocusTrap: (() => void) | null = null;

	$effect(() => {
		if (isOpen) {
			loadContacts();

			// Setup focus trap
			if (modalElement) {
				cleanupFocusTrap = createFocusTrap(modalElement, {
					onEscape: () => {
						if (!isSendingAlerts) handleClose();
					}
				});
			}
		} else {
			// Cleanup focus trap
			if (cleanupFocusTrap) {
				cleanupFocusTrap();
				cleanupFocusTrap = null;
			}
		}
	});

	async function loadContacts() {
		isLoading = true;
		errorMessage = null;

		try {
			const response = await fetch('/api/v1/emergency-contacts');
			if (!response.ok) {
				throw new Error('Failed to load contacts');
			}

			const result = await response.json();
			contacts = result.data || [];
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to load contacts';
			console.error('[EmergencyQuickModal] Load error:', err);
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Generate a valid UUID for crisis event (no database connection required)
	 */
	function generateCrisisEventId(): string {
		// Use crypto.randomUUID() for valid RFC 4122 UUID format
		return crypto.randomUUID();
	}

	async function sendAlerts() {
		if (contacts.length === 0) return;

		isSendingAlerts = true;
		errorMessage = null;
		successMessage = null;

		try {
			// Generate a valid UUID for crisis event
			const crisisEventId = generateCrisisEventId();

			const response = await fetch('/api/v1/crisis/send-alerts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					crisis_event_id: crisisEventId,
					severity: 'high',
					message: 'I need support right now. Can you check in on me?'
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to send alerts');
			}

			successMessage = result.message || 'Alerts sent successfully!';

			// Auto-close after 3 seconds on success
			setTimeout(() => {
				handleClose();
			}, 3000);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to send alerts';
		} finally {
			isSendingAlerts = false;
		}
	}

	function handleClose() {
		successMessage = null;
		errorMessage = null;
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isSendingAlerts) {
			handleClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		onclick={() => {
			if (!isSendingAlerts) handleClose();
		}}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
		aria-label="Close modal"
	></div>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" bind:this={modalElement}>
		<div class="modal-header">
			<h2 id="modal-title">Reach Out to Your Support Network</h2>
			<button
				type="button"
				class="close-button"
				onclick={handleClose}
				aria-label="Close modal"
				disabled={isSendingAlerts}
			>
				×
			</button>
		</div>

		<div class="modal-body">
			<p class="intro-text">
				You don't have to go through this alone. Your trusted contacts are here to support you.
			</p>

			{#if isLoading}
				<div class="loading-state">
					<div class="spinner"></div>
					<p>Loading your contacts...</p>
				</div>
			{:else if contacts.length === 0}
				<div class="no-contacts-state">
					<p class="no-contacts-text">
						You haven't added any emergency contacts yet. Would you like to add them now?
					</p>
					<a href="/app/profile/contacts" class="add-contacts-link" aria-label="Go to emergency contacts page to add contacts">
						<span class="link-icon" aria-hidden="true">➕</span>
						<span class="link-text">Add Emergency Contacts</span>
					</a>
				</div>
			{:else}
				<div class="contacts-list">
					<h3>Your Support Network ({contacts.length}):</h3>
					<div class="contacts-grid">
						{#each contacts.slice(0, 3) as contact (contact.id)}
							<div class="contact-card">
								<div class="contact-name">{contact.name}</div>
								<div class="contact-relation">{contact.relation}</div>
							</div>
						{/each}
					</div>
					{#if contacts.length > 3}
						<p class="more-contacts">
							+ {contacts.length - 3} more contact{contacts.length - 3 !== 1 ? 's' : ''}
						</p>
					{/if}
				</div>

				{#if successMessage}
					<div class="success-message" role="alert">
						<span class="success-icon">✓</span>
						{successMessage}
					</div>
				{/if}

				{#if errorMessage}
					<div class="error-message" role="alert">
						<span class="error-icon">⚠️</span>
						{errorMessage}
					</div>
				{/if}

				<div class="alert-section">
					<p class="alert-description">
						Send a message to your contacts letting them know you need support right now.
					</p>
					<button
						type="button"
						class="send-alerts-button"
						onclick={sendAlerts}
						disabled={isSendingAlerts}
						aria-label="Send alert to all emergency contacts"
					>
						{#if isSendingAlerts}
							<span class="button-spinner" aria-hidden="true"></span>
							Sending...
						{:else}
							<span class="button-icon" aria-hidden="true">📨</span>
							Notify My Support Network
						{/if}
					</button>
				</div>
			{/if}

			<div class="alternative-help">
				<p class="alternative-text">Need immediate professional help?</p>
				<a href="tel:988" class="crisis-link" aria-label="Call 988 Suicide and Crisis Lifeline">
					<span class="link-icon" aria-hidden="true">📞</span>
					<span class="link-text">Call 988 - Suicide & Crisis Lifeline</span>
				</a>
			</div>
		</div>

		<div class="modal-footer">
			<button
				type="button"
				class="close-footer-button"
				onclick={handleClose}
				disabled={isSendingAlerts}
				aria-label={successMessage ? 'Close emergency contact modal' : 'Not ready to contact support network'}
			>
				{successMessage ? 'Close' : 'Not Right Now'}
			</button>
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
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.35);
		z-index: 9999;
		width: 90%;
		max-width: 550px;
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
		gap: 1rem;
	}

	.dark .modal-header {
		border-bottom-color: hsl(200, 20%, 35%);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 600;
		color: hsl(200, 30%, 20%);
		line-height: 1.3;
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
		flex-shrink: 0;
	}

	.close-button:hover:not(:disabled) {
		background: hsl(200, 20%, 90%);
		color: hsl(200, 30%, 20%);
	}

	.close-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dark .close-button:hover:not(:disabled) {
		background: hsl(200, 20%, 25%);
		color: hsl(200, 20%, 85%);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.intro-text {
		color: hsl(200, 20%, 40%);
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
		font-size: 1rem;
		text-align: center;
	}

	.dark .intro-text {
		color: hsl(200, 20%, 70%);
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid hsl(200, 20%, 90%);
		border-top-color: hsl(200, 70%, 50%);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.dark .spinner {
		border-color: hsl(200, 20%, 30%);
		border-top-color: hsl(200, 70%, 50%);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-state p {
		color: hsl(200, 20%, 50%);
		font-size: 0.95rem;
	}

	.dark .loading-state p {
		color: hsl(200, 20%, 70%);
	}

	.no-contacts-state {
		text-align: center;
		padding: 2rem 1rem;
	}

	.no-contacts-text {
		color: hsl(200, 20%, 45%);
		margin: 0 0 1.5rem 0;
		line-height: 1.6;
	}

	.dark .no-contacts-text {
		color: hsl(200, 20%, 70%);
	}

	.add-contacts-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: hsl(200, 60%, 50%);
		color: white;
		text-decoration: none;
		border-radius: 0.75rem;
		font-weight: 600;
		transition: all 0.2s;
	}

	.add-contacts-link:hover {
		background: hsl(200, 60%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 150, 200, 0.3);
	}

	.contacts-list {
		margin-bottom: 1.5rem;
	}

	.contacts-list h3 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: hsl(200, 30%, 25%);
	}

	.dark .contacts-list h3 {
		color: hsl(200, 20%, 80%);
	}

	.contacts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.contact-card {
		background: hsl(200, 30%, 95%);
		border: 1px solid hsl(200, 30%, 85%);
		border-radius: 0.75rem;
		padding: 1rem;
		text-align: center;
	}

	.dark .contact-card {
		background: hsl(200, 20%, 22%);
		border-color: hsl(200, 20%, 35%);
	}

	.contact-name {
		font-weight: 600;
		color: hsl(200, 30%, 25%);
		margin-bottom: 0.25rem;
		font-size: 0.95rem;
	}

	.dark .contact-name {
		color: hsl(200, 20%, 85%);
	}

	.contact-relation {
		font-size: 0.85rem;
		color: hsl(200, 20%, 50%);
	}

	.dark .contact-relation {
		color: hsl(200, 20%, 65%);
	}

	.more-contacts {
		text-align: center;
		color: hsl(200, 20%, 50%);
		font-size: 0.9rem;
		margin: 0;
	}

	.dark .more-contacts {
		color: hsl(200, 20%, 65%);
	}

	.alert-section {
		background: hsl(30, 50%, 96%);
		border: 1px solid hsl(30, 50%, 85%);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.dark .alert-section {
		background: hsl(30, 30%, 22%);
		border-color: hsl(30, 40%, 35%);
	}

	.alert-description {
		margin: 0 0 1rem 0;
		color: hsl(30, 30%, 30%);
		font-size: 0.95rem;
		line-height: 1.5;
		text-align: center;
	}

	.dark .alert-description {
		color: hsl(30, 30%, 75%);
	}

	.send-alerts-button {
		width: 100%;
		padding: 0.875rem 1.5rem;
		background: hsl(30, 70%, 50%);
		color: white;
		border: none;
		border-radius: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.send-alerts-button:hover:not(:disabled) {
		background: hsl(30, 70%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(200, 100, 0, 0.3);
	}

	.send-alerts-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	.button-icon {
		font-size: 1.2rem;
	}

	.button-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.success-message,
	.error-message {
		padding: 0.875rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.95rem;
	}

	.success-message {
		background: hsl(140, 50%, 95%);
		border: 1px solid hsl(140, 50%, 80%);
		color: hsl(140, 60%, 30%);
	}

	.dark .success-message {
		background: hsl(140, 30%, 22%);
		border-color: hsl(140, 40%, 35%);
		color: hsl(140, 60%, 70%);
	}

	.success-icon {
		font-size: 1.3rem;
	}

	.error-message {
		background: hsl(0, 60%, 95%);
		border: 1px solid hsl(0, 60%, 80%);
		color: hsl(0, 65%, 35%);
	}

	.dark .error-message {
		background: hsl(0, 40%, 22%);
		border-color: hsl(0, 50%, 35%);
		color: hsl(0, 65%, 70%);
	}

	.error-icon {
		font-size: 1.3rem;
	}

	.alternative-help {
		background: hsl(200, 30%, 95%);
		border: 1px solid hsl(200, 30%, 85%);
		border-radius: 0.75rem;
		padding: 1rem;
		text-align: center;
	}

	.dark .alternative-help {
		background: hsl(200, 20%, 22%);
		border-color: hsl(200, 30%, 35%);
	}

	.alternative-text {
		margin: 0 0 0.75rem 0;
		font-size: 0.9rem;
		color: hsl(200, 20%, 45%);
		font-weight: 500;
	}

	.dark .alternative-text {
		color: hsl(200, 20%, 70%);
	}

	.crisis-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: hsl(0, 65%, 50%);
		color: white;
		text-decoration: none;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 0.95rem;
		transition: all 0.2s;
	}

	.crisis-link:hover {
		background: hsl(0, 65%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(200, 50, 50, 0.3);
	}

	.link-icon {
		font-size: 1.1rem;
	}

	.modal-footer {
		padding: 1.25rem 1.5rem;
		border-top: 1px solid hsl(200, 20%, 85%);
		display: flex;
		justify-content: center;
	}

	.dark .modal-footer {
		border-top-color: hsl(200, 20%, 35%);
	}

	.close-footer-button {
		padding: 0.75rem 2rem;
		background: hsl(200, 20%, 88%);
		color: hsl(200, 30%, 25%);
		border: none;
		border-radius: 0.75rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-footer-button:hover:not(:disabled) {
		background: hsl(200, 20%, 83%);
		transform: translateY(-1px);
	}

	.close-footer-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.dark .close-footer-button {
		background: hsl(200, 20%, 28%);
		color: hsl(200, 20%, 85%);
	}

	.dark .close-footer-button:hover:not(:disabled) {
		background: hsl(200, 20%, 33%);
	}

	@media (max-width: 640px) {
		.modal {
			width: 95%;
			max-height: 95vh;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding: 1.25rem;
		}

		.modal-header h2 {
			font-size: 1.2rem;
		}

		.contacts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
