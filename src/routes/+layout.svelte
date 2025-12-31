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

<nav class="main-nav">
	<div class="nav-content">
		<a href="/" class="logo">VoiceGuard AI</a>
		<div class="nav-links">
			{#if isAuthenticated}
				<a href="/app">App</a>
				<a href="/app/profile/contacts">Emergency Contacts</a>
				<form method="post" action="/auth/signout" class="signout-form">
					<button type="submit" class="signout-button">Sign Out</button>
				</form>
			{:else}
				<a href="/auth/signin">Sign In</a>
				<a href="/auth/signup" class="signup-link">Sign Up</a>
			{/if}
		</div>
	</div>
</nav>

{@render children()}
<CrisisHotlinesModal />

<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
