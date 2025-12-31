<script lang="ts">
	import EmergencyContactModal from './EmergencyContactModal.svelte';
	import type { EmergencyContact } from '$lib/types/emergency';

	interface Props {
		contacts: EmergencyContact[];
		onContactUpdate: () => void;
	}

	let { contacts, onContactUpdate }: Props = $props();

	let isModalOpen = $state(false);
	let editingContact = $state<EmergencyContact | null>(null);
	let isDeleting = $state<string | null>(null);

	async function handleDelete(contactId: string) {
		if (!confirm('Are you sure you want to remove this emergency contact?')) {
			return;
		}

		isDeleting = contactId;

		try {
			const response = await fetch('/api/v1/emergency-contacts', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: contactId })
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to delete contact');
			}

			onContactUpdate();
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed to delete contact');
		} finally {
			isDeleting = null;
		}
	}

	function handleEdit(contact: EmergencyContact) {
		editingContact = contact;
		isModalOpen = true;
	}

	function handleAdd() {
		editingContact = null;
		isModalOpen = true;
	}

	function handleSave(contact: EmergencyContact) {
		isModalOpen = false;
		editingContact = null;
		onContactUpdate();
	}

	function handleClose() {
		isModalOpen = false;
		editingContact = null;
	}

	function getNotificationMethodLabel(method: string): string {
		const labels: Record<string, string> = {
			email: 'Email',
			sms: 'SMS',
			both: 'Email & SMS'
		};
		return labels[method] || method;
	}
</script>

<div class="contact-list">
	<div class="list-header">
		<h3>Emergency Contacts</h3>
		<button type="button" class="add-button" onclick={handleAdd}>
			+ Add Contact
		</button>
	</div>

	{#if contacts.length === 0}
		<div class="empty-state">
			<p>No emergency contacts yet. Add one to enable support network alerts.</p>
		</div>
	{:else}
		<div class="contacts-grid">
			{#each contacts as contact (contact.id)}
				<div class="contact-card">
					<div class="contact-header">
						<div class="contact-info">
							<h4 class="contact-name">{contact.name}</h4>
							<span class="contact-relation">{contact.relation}</span>
						</div>
						<div class="contact-priority">Priority: {contact.priority}</div>
					</div>

					<div class="contact-details">
						{#if contact.email}
							<div class="contact-detail">
								<span class="detail-label">Email:</span>
								<span class="detail-value">{contact.email}</span>
							</div>
						{/if}
						{#if contact.phone_number}
							<div class="contact-detail">
								<span class="detail-label">Phone:</span>
								<span class="detail-value">{contact.phone_number}</span>
							</div>
						{/if}
						<div class="contact-detail">
							<span class="detail-label">Method:</span>
							<span class="detail-value">{getNotificationMethodLabel(contact.notification_method)}</span>
						</div>
					</div>

					{#if contact.default_message}
						<div class="contact-message">
							<strong>Message:</strong> {contact.default_message}
						</div>
					{/if}

					<div class="contact-actions">
						<button
							type="button"
							class="edit-button"
							onclick={() => handleEdit(contact)}
							disabled={isDeleting === contact.id}
						>
							Edit
						</button>
						<button
							type="button"
							class="delete-button"
							onclick={() => handleDelete(contact.id)}
							disabled={isDeleting === contact.id}
						>
							{isDeleting === contact.id ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<EmergencyContactModal
	isOpen={isModalOpen}
	contact={editingContact}
	onClose={handleClose}
	onSave={handleSave}
/>

<style lang="postcss">
	.contact-list {
		width: 100%;
	}

	.list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.list-header h3 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(220, 30%, 20%);
	}

	.dark .list-header h3 {
		color: hsl(220, 20%, 85%);
	}

	.add-button {
		padding: 0.75rem 1.5rem;
		background: hsl(220, 70%, 50%);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-button:hover {
		background: hsl(220, 70%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.empty-state {
		padding: 3rem 2rem;
		text-align: center;
		color: hsl(220, 20%, 50%);
		background: hsl(220, 20%, 96%);
		border-radius: 0.75rem;
		border: 2px dashed hsl(220, 20%, 80%);
	}

	.dark .empty-state {
		background: hsl(220, 15%, 20%);
		border-color: hsl(220, 20%, 35%);
		color: hsl(220, 20%, 65%);
	}

	.contacts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.contact-card {
		background: hsl(220, 20%, 98%);
		border: 1px solid hsl(220, 20%, 85%);
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		transition: all 0.2s;
	}

	.contact-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.dark .contact-card {
		background: hsl(220, 15%, 20%);
		border-color: hsl(220, 20%, 35%);
	}

	.contact-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		gap: 1rem;
	}

	.contact-info {
		flex: 1;
	}

	.contact-name {
		margin: 0 0 0.25rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(220, 30%, 20%);
	}

	.dark .contact-name {
		color: hsl(220, 20%, 85%);
	}

	.contact-relation {
		font-size: 0.9rem;
		color: hsl(220, 20%, 50%);
	}

	.dark .contact-relation {
		color: hsl(220, 20%, 65%);
	}

	.contact-priority {
		font-size: 0.85rem;
		color: hsl(220, 20%, 50%);
		padding: 0.25rem 0.5rem;
		background: hsl(220, 20%, 95%);
		border-radius: 0.25rem;
	}

	.dark .contact-priority {
		background: hsl(220, 15%, 25%);
		color: hsl(220, 20%, 70%);
	}

	.contact-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.contact-detail {
		display: flex;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.detail-label {
		font-weight: 500;
		color: hsl(220, 20%, 50%);
	}

	.dark .detail-label {
		color: hsl(220, 20%, 65%);
	}

	.detail-value {
		color: hsl(220, 30%, 20%);
	}

	.dark .detail-value {
		color: hsl(220, 20%, 85%);
	}

	.contact-message {
		padding: 0.75rem;
		background: hsl(220, 20%, 95%);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		color: hsl(220, 20%, 40%);
		line-height: 1.5;
	}

	.dark .contact-message {
		background: hsl(220, 15%, 25%);
		color: hsl(220, 20%, 70%);
	}

	.contact-actions {
		display: flex;
		gap: 0.75rem;
	}

	.edit-button,
	.delete-button {
		flex: 1;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.edit-button {
		background: hsl(220, 40%, 60%);
		color: white;
	}

	.edit-button:hover:not(:disabled) {
		background: hsl(220, 40%, 55%);
	}

	.delete-button {
		background: hsl(0, 60%, 90%);
		color: hsl(0, 70%, 40%);
	}

	.delete-button:hover:not(:disabled) {
		background: hsl(0, 60%, 85%);
	}

	.dark .delete-button {
		background: hsl(0, 40%, 25%);
		color: hsl(0, 70%, 70%);
	}

	.dark .delete-button:hover:not(:disabled) {
		background: hsl(0, 40%, 30%);
	}

	.edit-button:disabled,
	.delete-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.contacts-grid {
			grid-template-columns: 1fr;
		}

		.list-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.add-button {
			width: 100%;
		}
	}
</style>

