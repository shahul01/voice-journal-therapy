<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let errorCode = $derived($page.url.searchParams.get('error_code') || 'unknown');
	let errorMessage = $derived($page.url.searchParams.get('error_description') || 'An authentication error occurred.');

	function getErrorMessage(code: string): string {
		switch (code) {
			case 'invalid_request':
				return 'Invalid authentication request. Please try again.';
			case 'unauthorized':
				return 'You are not authorized to access this resource.';
			case 'access_denied':
				return 'Access denied. Please check your credentials.';
			case 'server_error':
				return 'A server error occurred. Please try again later.';
			default:
				return errorMessage;
		}
	}
</script>

<div class="error-page">
	<div class="content">
		<h1>Authentication Error</h1>
		<div class="error-details">
			<p class="error-message">{getErrorMessage(errorCode)}</p>
			{#if errorCode !== 'unknown'}
				<p class="error-code">Error code: {errorCode}</p>
			{/if}
		</div>
		<div class="actions">
			<button onclick={() => goto('/auth/signin')} class="button">Go to Sign In</button>
			<button onclick={() => goto('/')} class="button secondary">Go Home</button>
		</div>
	</div>
</div>

<style lang="postcss">
	.error-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.content {
		max-width: 500px;
		text-align: center;
		padding: 2rem;
		background: hsl(220, 20%, 98%);
		border-radius: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.dark .content {
		background: hsl(220, 15%, 15%);
	}

	h1 {
		margin-bottom: 1.5rem;
		color: hsl(0, 70%, 50%);
	}

	.error-details {
		margin-bottom: 2rem;
	}

	.error-message {
		color: hsl(220, 30%, 30%);
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
		line-height: 1.6;
	}

	.dark .error-message {
		color: hsl(220, 20%, 80%);
	}

	.error-code {
		color: hsl(220, 20%, 60%);
		font-size: 0.875rem;
		font-family: monospace;
	}

	.dark .error-code {
		color: hsl(220, 20%, 50%);
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.button {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, hsl(220, 70%, 50%), hsl(250, 70%, 50%));
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.button.secondary {
		background: hsl(220, 20%, 80%);
	}

	.dark .button.secondary {
		background: hsl(220, 30%, 30%);
	}

	.button.secondary:hover {
		background: hsl(220, 20%, 70%);
	}

	.dark .button.secondary:hover {
		background: hsl(220, 30%, 40%);
	}
</style>

