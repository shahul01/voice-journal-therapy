<script lang="ts">
	import type { EmergencyContact, CrisisSeverity } from '$lib/types/emergency';

	interface Props {
		isOpen: boolean;
		contacts: EmergencyContact[];
		severity: CrisisSeverity;
		onConfirm: () => Promise<void>;
		onCancel: () => void;
	}

	let { isOpen, contacts, severity, onConfirm, onCancel }: Props = $props();

	let isSending = $state(false);
	let errorMessage = $state<string | null>(null);

	function getSeverityLabel(sev: CrisisSeverity): string {
		const labels: Record<CrisisSeverity, string> = {
			low: 'Low',
			medium: 'Medium',
			high: 'High',
			critical: 'Critical'
		};
		return labels[sev];
	}

	function getSeverityColor(sev: CrisisSeverity): string {
		const colors: Record<CrisisSeverity, string> = {
			low: 'hsl(120, 60%, 40%)',
			medium: 'hsl(45, 80%, 50%)',
			high: 'hsl(30, 80%, 50%)',
			critical: 'hsl(0, 70%, 50%)'
		};
		return colors[sev];
	}

	async function handleConfirm() {
		isSending = true;
		errorMessage = null;

		try {
			await onConfirm();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to send alerts';
		} finally {
			isSending = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isSending) {
			onCancel();
		}
	}
</script>

{#if isOpen}
	<div class="modal-backdrop" onclick={() => { if (!isSending) onCancel(); }} onkeydown={handleKeydown}></div>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<div class="modal-header">
			<h2 id="modal-title">Confirm Support Network Alert</h2>
		</div>

		<div class="modal-body">
			<div class="alert-info">
				<div class="severity-badge" style="background-color: {getSeverityColor(severity)}20; border-color: {getSeverityColor(severity)}">
					<span class="severity-label">Severity: {getSeverityLabel(severity)}</span>
				</div>
				<p class="info-text">
					You're about to notify your emergency contacts that you may need support right now.
					This will send an alert to {contacts.length} contact{contacts.length !== 1 ? 's' : ''}.
				</p>
			</div>

			{#if contacts.length > 0}
				<div class="contacts-list">
					<h3>Contacts to be notified:</h3>
					<ul>
						{#each contacts as contact (contact.id)}
							<li class="contact-item">
								<span class="contact-name">{contact.name}</span>
								<span class="contact-relation">{contact.relation}</span>
								<span class="contact-method">
									({contact.notification_method === 'email' ? 'Email' : contact.notification_method === 'sms' ? 'SMS' : 'Email & SMS'})
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if errorMessage}
				<div class="error-message" role="alert">{errorMessage}</div>
			{/if}

			<div class="warning-box">
				<strong>Note:</strong> This is not an emergency service. If you need immediate help,
				please call 988 (Suicide & Crisis Lifeline) or your local emergency number.
			</div>
		</div>

		<div class="modal-footer">
			<button
				type="button"
				class="cancel-button"
				onclick={onCancel}
				disabled={isSending}
			>
				Cancel
			</button>
			<button
				type="button"
				class="confirm-button"
				onclick={handleConfirm}
				disabled={isSending}
			>
				{isSending ? 'Sending...' : 'Send Alert'}
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
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: hsl(220, 20%, 98%);
		border-radius: 1rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		z-index: 9999;
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.dark .modal {
		background: hsl(220, 15%, 15%);
	}

	.modal-header {
		padding: 1.5rem;
		border-bottom: 1px solid hsl(220, 20%, 85%);
	}

	.dark .modal-header {
		border-bottom-color: hsl(220, 20%, 35%);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(220, 30%, 20%);
	}

	.dark .modal-header h2 {
		color: hsl(220, 20%, 85%);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.alert-info {
		margin-bottom: 1.5rem;
	}

	.severity-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 2px solid;
		margin-bottom: 1rem;
	}

	.severity-label {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.info-text {
		color: hsl(220, 20%, 40%);
		line-height: 1.6;
		margin: 0;
	}

	.dark .info-text {
		color: hsl(220, 20%, 70%);
	}

	.contacts-list {
		margin-bottom: 1.5rem;
	}

	.contacts-list h3 {
		font-size: 1.1rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: hsl(220, 30%, 20%);
	}

	.dark .contacts-list h3 {
		color: hsl(220, 20%, 85%);
	}

	.contacts-list ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.contact-item {
		padding: 0.75rem;
		background: hsl(220, 20%, 95%);
		border-radius: 0.5rem;
		margin-bottom: 0.5rem;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.dark .contact-item {
		background: hsl(220, 15%, 20%);
	}

	.contact-name {
		font-weight: 500;
		color: hsl(220, 30%, 20%);
	}

	.dark .contact-name {
		color: hsl(220, 20%, 85%);
	}

	.contact-relation {
		color: hsl(220, 20%, 50%);
		font-size: 0.9rem;
	}

	.dark .contact-relation {
		color: hsl(220, 20%, 65%);
	}

	.contact-method {
		color: hsl(220, 70%, 50%);
		font-size: 0.85rem;
		font-weight: 500;
	}

	.error-message {
		padding: 0.75rem 1rem;
		background: hsl(0, 70%, 95%);
		border: 1px solid hsl(0, 70%, 80%);
		border-radius: 0.5rem;
		color: hsl(0, 70%, 30%);
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.dark .error-message {
		background: hsl(0, 50%, 20%);
		border-color: hsl(0, 50%, 40%);
		color: hsl(0, 70%, 80%);
	}

	.warning-box {
		padding: 1rem;
		background: hsl(45, 40%, 95%);
		border: 1px solid hsl(45, 40%, 80%);
		border-radius: 0.5rem;
		color: hsl(45, 60%, 30%);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.dark .warning-box {
		background: hsl(45, 30%, 20%);
		border-color: hsl(45, 40%, 40%);
		color: hsl(45, 60%, 70%);
	}

	.modal-footer {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding: 1.5rem;
		border-top: 1px solid hsl(220, 20%, 85%);
	}

	.dark .modal-footer {
		border-top-color: hsl(220, 20%, 35%);
	}

	.cancel-button,
	.confirm-button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.cancel-button {
		background: hsl(220, 20%, 90%);
		color: hsl(220, 30%, 20%);
	}

	.cancel-button:hover:not(:disabled) {
		background: hsl(220, 20%, 85%);
	}

	.dark .cancel-button {
		background: hsl(220, 20%, 25%);
		color: hsl(220, 20%, 75%);
	}

	.dark .cancel-button:hover:not(:disabled) {
		background: hsl(220, 20%, 30%);
	}

	.confirm-button {
		background: hsl(30, 80%, 50%);
		color: white;
	}

	.confirm-button:hover:not(:disabled) {
		background: hsl(30, 80%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.confirm-button:disabled,
	.cancel-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.modal {
			width: 95%;
			max-height: 95vh;
		}

		.modal-header,
		.modal-body,
		.modal-footer {
			padding: 1rem;
		}

		.modal-footer {
			flex-direction: column;
		}

		.cancel-button,
		.confirm-button {
			width: 100%;
		}
	}
</style>

