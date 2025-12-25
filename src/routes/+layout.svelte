<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';
	import './layout.css';

	let { data, children } = $props();

	const session = data.session;
	const user = data.user;
	const isAuthenticated = !!session && !!user;
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<nav class="main-nav">
	<div class="nav-content">
		<a href="/" class="logo">VoiceGuard AI</a>
		<div class="nav-links">
			{#if isAuthenticated}
				<a href="/app">App</a>
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
<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
