<script lang="ts">
	import profiles from '$lib/utils/profile';

	let isListening = $state(false);
	let journalEntry = $state('');
	let selectedProfile = $state(profiles[0]);

	function toggleListening() {
		isListening = !isListening;
	}
</script>

<div class="home">
	<h1>Voice Journal Therapy App</h1>
	<p>Selected Profile: {selectedProfile.name}</p>
	<div class="voice">
		{#if isListening}
			<p>Listening to your voice...</p>
		{:else}
			<p>Click the button to start listening to your voice...</p>
		{/if}

		<button onclick={toggleListening}>
			{isListening ? 'Stop listening' : 'Start listening'}
		</button>
	</div>
	<div class="journal-display">
		<p>Journal entry:</p>
		<p>{journalEntry}</p>
	</div>
	<div></div>
</div>

<style lang="postcss">
</style>
