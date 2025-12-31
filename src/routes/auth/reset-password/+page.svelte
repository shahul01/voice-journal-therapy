<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { form, enhance, errors, submitting, message: formMessage } = superForm(data.form);
</script>

<div class="reset-password-page">
	<h1>Reset Password</h1>
	<p class="description">Enter your email address and we'll send you a link to reset your password.</p>

	{#if $formMessage}
		<div class="success-message">{$formMessage}</div>
	{/if}

	<form method="post" use:enhance action="?/reset" class="form">
		<div class="form-group">
			<input
				type="email"
				name="email"
				autocomplete="email"
				placeholder="Enter your email"
				bind:value={$form.email}
				class:error={$errors.email}
			/>
			{#if $errors.email}
				<span class="error-message">{$errors.email}</span>
			{/if}
		</div>

		<button type="submit" disabled={$submitting} class="submit-button">
			{$submitting ? 'Sending...' : 'Send Reset Link'}
		</button>

		<div class="auth-links">
			<a href="/auth/signin">Back to Sign In</a>
		</div>
	</form>
</div>

<style lang="postcss">
	.reset-password-page {
		max-width: 400px;
		margin: 2rem auto;
		padding: 2rem;
	}

	h1 {
		text-align: center;
		margin-bottom: 1rem;
		color: hsl(220, 30%, 60%);
	}

	.dark h1 {
		color: hsl(220, 20%, 85%);
	}

	.description {
		text-align: center;
		color: hsl(220, 20%, 70%);
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.dark .description {
		color: hsl(220, 20%, 70%);
	}

	.success-message {
		padding: 1rem;
		background: hsl(120, 40%, 95%);
		border: 1px solid hsl(120, 40%, 80%);
		border-radius: 0.5rem;
		color: hsl(120, 60%, 30%);
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.dark .success-message {
		background: hsl(120, 30%, 20%);
		border-color: hsl(120, 40%, 40%);
		color: hsl(120, 60%, 70%);
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	input {
		padding: 0.75rem;
		border: 1px solid hsl(220, 20%, 80%);
		border-radius: 0.5rem;
		font-size: 1rem;
		transition: border-color 0.2s;
		background: hsl(220, 20%, 98%);
		color: hsl(220, 30%, 20%);
	}

	.dark input {
		background: hsl(220, 15%, 15%);
		color: hsl(220, 20%, 85%);
		border-color: hsl(220, 20%, 40%);
	}

	input:focus {
		outline: none;
		border-color: hsl(220, 70%, 50%);
	}

	input.error {
		border-color: hsl(0, 70%, 50%);
	}

	.error-message {
		font-size: 0.875rem;
		color: hsl(0, 70%, 50%);
	}

	.submit-button {
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

	.submit-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.auth-links {
		text-align: center;
		margin-top: 1rem;
	}

	.auth-links a {
		color: hsl(220, 70%, 50%);
		text-decoration: none;
		font-size: 0.875rem;
		transition: color 0.2s;
	}

	.auth-links a:hover {
		color: hsl(220, 70%, 40%);
		text-decoration: underline;
	}
</style>

