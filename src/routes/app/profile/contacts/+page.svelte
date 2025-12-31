<script lang="ts">
	import EmergencyContactList from '$lib/components/EmergencyContactList.svelte';
	import AlertConfirmationModal from '$lib/components/AlertConfirmationModal.svelte';
	import type { EmergencyContact, CrisisSeverity } from '$lib/types/emergency';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let contacts = $state<EmergencyContact[]>(data.contacts);
	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);
	let showTestModal = $state(false);
	let testSeverity = $state<CrisisSeverity>('high');
	let testResult = $state<string | null>(null);

	async function refreshContacts() {
		isLoading = true;
		errorMessage = null;

		try {
			const response = await fetch('/api/v1/emergency-contacts');

			if (!response.ok) {
				throw new Error('Failed to fetch contacts');
			}

			const result = await response.json();
			contacts = result.data || [];
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to load contacts';
			console.error('[Contacts Page] Refresh error:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleContactUpdate() {
		refreshContacts();
	}

	function openTestModal() {
		testResult = null;
		testSeverity = 'high';
		showTestModal = true;
	}

	function closeTestModal() {
		showTestModal = false;
		testResult = null;
	}

	async function handleTestAlert() {
		isLoading = true;
		errorMessage = null;
		testResult = null;

		try {
			const response = await fetch('/api/v1/crisis/test-alert', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ severity: testSeverity })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to send test alert');
			}

			testResult = result.message || 'Test alert sent successfully!';
			showTestModal = false;

			// Show success for 5 seconds
			setTimeout(() => {
				testResult = null;
			}, 5000);
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to send test alert';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Emergency Contacts - VoiceGuard</title>
</svelte:head>

<div class="contacts-page">
	<div class="page-header">
		<div class="header-content">
			<h1>Emergency Contacts</h1>
			<p class="description">
				Manage your support network. These contacts will be notified when you need support
				during high or critical crisis situations.
			</p>
		</div>
		{#if contacts.length > 0}
			<div class="contact-count-badge">
				{contacts.length} contact{contacts.length !== 1 ? 's' : ''} configured
			</div>
		{/if}
	</div>

	{#if errorMessage}
		<div class="error-banner" role="alert">
			<span class="error-icon">⚠️</span>
			<span class="error-text">{errorMessage}</span>
			<button type="button" class="retry-button" onclick={refreshContacts}>Retry</button>
		</div>
	{/if}

	<div class="help-box">
		<strong>How it works:</strong>
		<ul>
			<li>Add trusted contacts who can provide support during difficult times</li>
			<li>Contacts will be notified via email or SMS when you experience high (level 3) or
				critical (level 4) crisis situations</li>
			<li>Alerts include a generic message - no sensitive therapy details are shared</li>
			<li>Each contact can only receive one alert per hour to prevent spam</li>
		</ul>
	</div>

	{#if contacts.length > 0}
		<div class="test-section">
			<h3>Test Alert System</h3>
			<p>Test the alert system by sending a test notification to your emergency contacts.</p>
			<button type="button" class="test-button" onclick={openTestModal} disabled={isLoading}>
				🧪 Send Test Alert
			</button>
			{#if testResult}
				<div class="success-message">{testResult}</div>
			{/if}
		</div>
	{/if}

	{#if isLoading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading contacts...</p>
		</div>
	{:else}
		<EmergencyContactList {contacts} onContactUpdate={handleContactUpdate} />
	{/if}
</div>

<AlertConfirmationModal
	isOpen={showTestModal}
	contacts={contacts}
	severity={testSeverity}
	onConfirm={handleTestAlert}
	onCancel={closeTestModal}
/>

<style lang="postcss">
	.contacts-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid hsl(220, 20%, 85%);
	}

	.dark .page-header {
		border-bottom-color: hsl(220, 20%, 35%);
	}

	.header-content {
		margin-bottom: 1rem;
	}

	.page-header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
		font-weight: 600;
		color: hsl(220, 30%, 60%);
	}

	.dark .page-header h1 {
		color: hsl(220, 20%, 85%);
	}

	.description {
		margin: 0;
		color: hsl(220, 20%, 70%);
		line-height: 1.6;
		font-size: 1rem;
	}

	.dark .description {
		color: hsl(220, 20%, 70%);
	}

	.contact-count-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: hsl(220, 70%, 50%);
		color: white;
		border-radius: 1.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		margin-top: 1rem;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.5rem;
		background: hsl(0, 70%, 95%);
		border: 1px solid hsl(0, 70%, 80%);
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.dark .error-banner {
		background: hsl(0, 50%, 20%);
		border-color: hsl(0, 50%, 40%);
	}

	.error-icon {
		font-size: 1.5rem;
	}

	.error-text {
		flex: 1;
		color: hsl(0, 70%, 30%);
		font-weight: 500;
	}

	.dark .error-text {
		color: hsl(0, 70%, 80%);
	}

	.retry-button {
		padding: 0.5rem 1rem;
		background: hsl(220, 70%, 50%);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.retry-button:hover {
		background: hsl(220, 70%, 45%);
	}

	.help-box {
		background: hsl(220, 20%, 96%);
		border: 1px solid hsl(220, 20%, 85%);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.dark .help-box {
		background: hsl(220, 15%, 20%);
		border-color: hsl(220, 20%, 35%);
	}

	.help-box strong {
		display: block;
		margin-bottom: 0.75rem;
		color: hsl(220, 30%, 20%);
		font-size: 1rem;
	}

	.dark .help-box strong {
		color: hsl(220, 20%, 85%);
	}

	.help-box ul {
		margin: 0;
		padding-left: 1.5rem;
		color: hsl(220, 20%, 40%);
		line-height: 1.8;
	}

	.dark .help-box ul {
		color: hsl(220, 20%, 70%);
	}

	.help-box li {
		margin-bottom: 0.5rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		gap: 1rem;
	}

	.loading-state p {
		color: hsl(220, 20%, 50%);
		font-size: 1rem;
	}

	.dark .loading-state p {
		color: hsl(220, 20%, 70%);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid hsl(220, 20%, 90%);
		border-top-color: hsl(220, 70%, 50%);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.dark .spinner {
		border-color: hsl(220, 20%, 30%);
		border-top-color: hsl(220, 70%, 50%);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.test-section {
		background: hsl(220, 20%, 96%);
		border: 1px solid hsl(220, 20%, 85%);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.dark .test-section {
		background: hsl(220, 15%, 20%);
		border-color: hsl(220, 20%, 35%);
	}

	.test-section h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: hsl(220, 30%, 20%);
	}

	.dark .test-section h3 {
		color: hsl(220, 20%, 85%);
	}

	.test-section p {
		margin: 0 0 1rem 0;
		color: hsl(220, 20%, 50%);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.dark .test-section p {
		color: hsl(220, 20%, 70%);
	}

	.test-button {
		padding: 0.75rem 1.5rem;
		background: hsl(30, 80%, 50%);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.test-button:hover:not(:disabled) {
		background: hsl(30, 80%, 45%);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.test-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.success-message {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background: hsl(120, 40%, 95%);
		border: 1px solid hsl(120, 40%, 80%);
		border-radius: 0.5rem;
		color: hsl(120, 60%, 30%);
		font-size: 0.9rem;
	}

	.dark .success-message {
		background: hsl(120, 30%, 20%);
		border-color: hsl(120, 40%, 40%);
		color: hsl(120, 60%, 70%);
	}

	@media (max-width: 640px) {
		.contacts-page {
			padding: 1rem;
		}

		.page-header h1 {
			font-size: 1.5rem;
		}

		.error-banner {
			flex-direction: column;
			align-items: flex-start;
		}

		.retry-button {
			width: 100%;
		}

		.test-button {
			width: 100%;
		}
	}
</style>

