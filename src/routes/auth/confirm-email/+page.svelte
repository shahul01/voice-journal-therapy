<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="confirm-email-page">
	<div class="content">
		<h1>Check Your Email</h1>
		<p class="message">
			{#if data.email}
				We've sent a confirmation email to <strong>{data.email}</strong>
			{:else}
				We've sent a confirmation email to your address.
			{/if}
		</p>
		<p class="instructions">
			Please click the link in the email to verify your account. The link will expire in 24 hours.
		</p>
		<div class="actions">
			<a href="/auth/signin" class="button">Back to Sign In</a>
		</div>
	</div>
</div>

<style lang="postcss">
	.confirm-email-page {
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
		margin-bottom: 1rem;
		color: hsl(220, 30%, 20%);
	}

	.dark h1 {
		color: hsl(220, 20%, 85%);
	}

	.message {
		margin-bottom: 1rem;
		color: hsl(220, 20%, 40%);
		font-size: 1.1rem;
	}

	.dark .message {
		color: hsl(220, 20%, 70%);
	}

	.message strong {
		color: hsl(220, 70%, 50%);
		font-weight: 600;
	}

	.instructions {
		margin-bottom: 2rem;
		color: hsl(220, 20%, 50%);
		line-height: 1.6;
	}

	.dark .instructions {
		color: hsl(220, 20%, 60%);
	}

	.actions {
		display: flex;
		justify-content: center;
	}

	.button {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, hsl(220, 70%, 50%), hsl(250, 70%, 50%));
		color: white;
		text-decoration: none;
		border-radius: 0.5rem;
		font-weight: 600;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}
</style>

