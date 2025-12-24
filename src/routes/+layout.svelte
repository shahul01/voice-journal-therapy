<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import favicon from '$lib/assets/favicon.svg';
	import './layout.css';

	let { data, children } = $props();

	// $effect(() => {
	// 	console.log(`data: `, data);
	// });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}
<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
