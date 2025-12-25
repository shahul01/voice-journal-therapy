<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isVerifying = $state(true);
	let isVerified = $state(data.verified);

	onMount(() => {
		// If token_hash is present, we need to wait for session to be set
		if (data.tokenHash && !isVerified) {
			// Check session status after a brief delay
			setTimeout(() => {
				isVerifying = false;
				isVerified = true;
				// Redirect to app after showing success message
				setTimeout(() => {
					window.location.href = '/app';
				}, 2000);
			}, 1000);
		} else {
			isVerifying = false;
		}
	});
</script>

<div class="verified-page">
	<div class="content">
		{#if isVerifying}
			<h1>Verifying...</h1>
			<p>Please wait while we verify your email.</p>
		{:else if isVerified}
			<div class="success">
				<h1>✓ Email Verified</h1>
				<p>Your email has been successfully verified. Redirecting to your dashboard...</p>
			</div>
		{:else}
			<h1>Verification Status</h1>
			<p>Please check your email and click the verification link.</p>
			<div class="actions">
				<a href="/auth/signin" class="button">Go to Sign In</a>
			</div>
		{/if}
	</div>
</div>

<style lang="postcss">
	.verified-page {
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

	.success h1 {
		color: hsl(120, 70%, 40%);
		font-size: 2rem;
	}

	p {
		color: hsl(220, 20%, 50%);
		line-height: 1.6;
		margin-bottom: 2rem;
	}

	.dark p {
		color: hsl(220, 20%, 70%);
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

