<script lang="ts">
	import type {
		EmergencyContact,
		CreateEmergencyContactInput,
		UpdateEmergencyContactInput,
		NotificationMethod
	} from '$lib/types/emergency';

	interface Props {
		isOpen: boolean;
		contact?: EmergencyContact | null;
		onClose: () => void;
		onSave: (contact: EmergencyContact) => void;
	}

	let { isOpen, contact = null, onClose, onSave }: Props = $props();

	let formData = $state({
		name: '',
		email: '',
		phone_number: '',
		relation: '',
		default_message: '',
		notification_method: 'email' as NotificationMethod,
		priority: 0
	});

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (contact) {
			formData.name = contact.name;
			formData.email = contact.email || '';
			formData.phone_number = contact.phone_number || '';
			formData.relation = contact.relation;
			formData.default_message = contact.default_message || '';
			formData.notification_method = contact.notification_method;
			formData.priority = contact.priority;
		} else {
			formData.name = '';
			formData.email = '';
			formData.phone_number = '';
			formData.relation = '';
			formData.default_message = '';
			formData.notification_method = 'email';
			formData.priority = 0;
		}
		errorMessage = null;
	});

	function validateForm(): boolean {
		if (!formData.name.trim()) {
			errorMessage = 'Name is required';
			return false;
		}

		if (!formData.relation.trim()) {
			errorMessage = 'Relation is required';
			return false;
		}

		if (!formData.email.trim() && !formData.phone_number.trim()) {
			errorMessage = 'Either email or phone number is required';
			return false;
		}

		if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errorMessage = 'Invalid email format';
			return false;
		}

		return true;
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		isSubmitting = true;
		errorMessage = null;

		try {
			const url = contact
				? '/api/v1/emergency-contacts'
				: '/api/v1/emergency-contacts';

			const method = contact ? 'PATCH' : 'POST';
			const payload: any = contact
				? { id: contact.id, ...formData }
				: formData;

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to save contact');
			}

			onSave(result.data);
			onClose();
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to save contact';
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="modal-backdrop"
		onclick={onClose}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
		aria-label="Close modal"
	></div>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<div class="modal-header">
			<h2 id="modal-title">{contact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}</h2>
			<button
				type="button"
				class="close-button"
				onclick={onClose}
				aria-label="Close modal"
			>
				×
			</button>
		</div>

		<div class="modal-body">
			{#if errorMessage}
				<div class="error-message" role="alert">{errorMessage}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-group">
					<label for="name">Name *</label>
					<input
						id="name"
						type="text"
						bind:value={formData.name}
						required
						placeholder="John Doe"
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="relation">Relation *</label>
					<input
						id="relation"
						type="text"
						bind:value={formData.relation}
						required
						placeholder="Friend, Family, Therapist..."
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="email">Email</label>
					<input
						id="email"
						type="email"
						bind:value={formData.email}
						placeholder="john@example.com"
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="phone">Phone Number</label>
					<input
						id="phone"
						type="tel"
						bind:value={formData.phone_number}
						placeholder="+1234567890"
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-group">
					<label for="notification_method">Notification Method *</label>
					<select
						id="notification_method"
						bind:value={formData.notification_method}
						disabled={isSubmitting}
					>
						<option value="email">Email</option>
						<option value="sms">SMS</option>
						<option value="both">Both</option>
					</select>
				</div>

				<div class="form-group">
					<label for="default_message">Default Message (Optional)</label>
					<textarea
						id="default_message"
						bind:value={formData.default_message}
						placeholder="Custom message template (use {'{'}contactName{'}'} and {'{'}userName{'}'} as placeholders)"
						rows="4"
						disabled={isSubmitting}
					></textarea>
				</div>

				<div class="form-group">
					<label for="priority">Priority (Lower number = higher priority)</label>
					<input
						id="priority"
						type="number"
						bind:value={formData.priority}
						min="0"
						max="100"
						disabled={isSubmitting}
					/>
				</div>

				<div class="form-actions">
					<button
						type="button"
						class="cancel-button"
						onclick={onClose}
						disabled={isSubmitting}
						aria-label="Cancel and close form"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="submit-button"
						disabled={isSubmitting}
						aria-label={contact ? 'Update emergency contact' : 'Add new emergency contact'}
					>
						{isSubmitting ? 'Saving...' : contact ? 'Update' : 'Add Contact'}
					</button>
				</div>
			</form>
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
		background: rgba(0, 0, 0, 0.5);
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
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		z-index: 9999;
		width: 90%;
		max-width: 600px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.dark .modal {
		background: hsl(220, 15%, 15%);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
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

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		line-height: 1;
		cursor: pointer;
		color: hsl(220, 20%, 50%);
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
		background: hsl(220, 20%, 90%);
		color: hsl(220, 30%, 20%);
	}

	.dark .close-button {
		color: hsl(220, 20%, 65%);
	}

	.dark .close-button:hover {
		background: hsl(220, 20%, 25%);
		color: hsl(220, 20%, 85%);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.error-message {
		padding: 0.75rem 1rem;
		background: hsl(0, 70%, 95%);
		border: 1px solid hsl(0, 70%, 80%);
		border-radius: 0.5rem;
		color: hsl(0, 70%, 30%);
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.dark .error-message {
		background: hsl(0, 50%, 20%);
		border-color: hsl(0, 50%, 40%);
		color: hsl(0, 70%, 80%);
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: hsl(220, 30%, 20%);
		font-size: 0.95rem;
	}

	.dark .form-group label {
		color: hsl(220, 20%, 75%);
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid hsl(220, 20%, 80%);
		border-radius: 0.5rem;
		font-size: 1rem;
		background: hsl(220, 20%, 98%);
		color: hsl(220, 30%, 20%);
		transition: border-color 0.2s;
		font-family: inherit;
	}

	.dark .form-group input,
	.dark .form-group select,
	.dark .form-group textarea {
		background: hsl(220, 15%, 15%);
		color: hsl(220, 20%, 85%);
		border-color: hsl(220, 20%, 40%);
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: hsl(220, 70%, 50%);
	}

	.form-group input:disabled,
	.form-group select:disabled,
	.form-group textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid hsl(220, 20%, 85%);
	}

	.dark .form-actions {
		border-top-color: hsl(220, 20%, 35%);
	}

	.cancel-button,
	.submit-button {
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

	.submit-button {
		background: hsl(220, 70%, 50%);
		color: white;
	}

	.submit-button:hover:not(:disabled) {
		background: hsl(220, 70%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.submit-button:disabled,
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
		.modal-body {
			padding: 1rem;
		}

		.form-actions {
			flex-direction: column;
		}

		.cancel-button,
		.submit-button {
			width: 100%;
		}
	}
</style>

