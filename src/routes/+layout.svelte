<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';
	import CrisisHotlinesModal from '$lib/components/CrisisHotlinesModal.svelte';
	import { openCrisisModal } from '$lib/stores/crisisModal';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import './layout.css';

	let { data, children } = $props();

	const session = data.session;
	const user = data.user;
	const isAuthenticated = !!session && !!user;

	// Global keyboard shortcut: Ctrl+H or Cmd+H to open crisis modal
	onMount(() => {
		if (!browser) return;

		function handleKeydown(event: KeyboardEvent) {
			if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
				event.preventDefault();
				openCrisisModal();
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="layout">
	<nav class="main-nav" aria-label="Main navigation">
		<div class="nav-content">
			<a href="/app" class="logo" aria-label="VoiceGuard AI home">VoiceGuard AI</a>
			<div class="nav-links">
				{#if isAuthenticated}
					<a href="/app/profile/contacts" aria-label="Manage emergency contacts"
						>Emergency Contacts</a
					>
					<form method="post" action="/auth/signout" class="signout-form">
						<button type="submit" class="signout-button" aria-label="Sign out of your account"
							>Sign Out</button
						>
					</form>
				{:else}
					<a href="/auth/signin" aria-label="Sign in to your account">Sign In</a>
					<a href="/auth/signup" class="signup-link" aria-label="Create a new account">Sign Up</a>
				{/if}
			</div>
		</div>
	</nav>

	<div class="child-content">
		{@render children()}
	</div>
	<CrisisHotlinesModal />

	<div style="display:none">
		{#each locales as locale}
			<a href={localizeHref(page.url.pathname, { locale })}>
				{locale}
			</a>
		{/each}
	</div>
</div>

<style>
	.layout {
		width: 100%;
	}

	.main-nav {
		width: 100%;
		background: hsl(220, 20%, 98%);
		border-bottom: 1px solid hsl(220, 20%, 90%);
		padding: 1rem 0;
		margin-bottom: 2rem;
	}

	.dark .main-nav {
		background: hsl(220, 15%, 12%);
		border-bottom-color: hsl(220, 20%, 30%);
	}

	.nav-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.5rem;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 clamp(1rem, 2vw, 2rem);
	}

	.logo {
		font-size: 1.5rem;
		font-weight: 700;
		color: hsl(220, 70%, 50%);
		text-decoration: none;
		transition: color 0.2s;
	}

	.logo:hover {
		color: hsl(220, 70%, 40%);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.nav-links a {
		color: hsl(220, 30%, 40%);
		text-decoration: none;
		font-size: 1rem;
		transition: color 0.2s;
	}

	.dark .nav-links a {
		color: hsl(220, 20%, 70%);
	}

	.nav-links a:hover {
		color: hsl(220, 70%, 50%);
	}

	.child-content {
		margin: 0 auto;
		max-width: 1200px;
		padding: 0 clamp(1rem, 2vw, 2rem);
	}

	.signout-form {
		margin: 0;
	}

	.signout-button {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid hsl(220, 20%, 70%);
		min-width: 7rem;
		color: hsl(220, 30%, 40%);
		border-radius: 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 500;
	}

	.dark .signout-button {
		border-color: hsl(220, 20%, 50%);
		color: hsl(220, 20%, 70%);
	}

	.signout-button:hover {
		background: hsl(0, 50%, 95%);
		border-color: hsl(0, 50%, 70%);
		color: hsl(0, 60%, 40%);
	}

	.dark .signout-button:hover {
		background: hsl(0, 40%, 20%);
		border-color: hsl(0, 50%, 50%);
		color: hsl(0, 60%, 70%);
	}

	.signup-link {
		padding: 0.5rem 1rem;
		background: linear-gradient(135deg, hsl(220, 70%, 50%), hsl(250, 70%, 50%));
		color: white !important;
		border-radius: 0.5rem;
		font-weight: 600;
	}

	.signup-link:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}
</style>
