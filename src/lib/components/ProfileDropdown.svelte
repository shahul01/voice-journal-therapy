<script lang="ts">
	import { selectedProfile, getProfiles } from '$lib/stores/profile';
	import { get } from 'svelte/store';
	import type { Profile } from '$lib/types/profile';

	interface Props {
		disabled?: boolean;
		onProfileChange?: (profile: Profile) => void;
	}

	let { disabled = false, onProfileChange }: Props = $props();

	let isOpen = $state(false);
	let profiles = $derived(getProfiles());
	let currentProfile = $state(get(selectedProfile));

	let unsubscribe: (() => void) | null = null;

	$effect(() => {
		unsubscribe = selectedProfile.subscribe((profile) => {
			currentProfile = profile;
		});

		return () => {
			if (unsubscribe) unsubscribe();
		};
	});

	function toggleDropdown() {
		if (disabled) return;
		isOpen = !isOpen;
	}

	function selectProfile(profile: Profile) {
		if (disabled || profile.id === currentProfile.id) {
			isOpen = false;
			return;
		}

		selectedProfile.set(profile);
		onProfileChange?.(profile);
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;

		if (event.key === 'Escape') {
			isOpen = false;
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleDropdown();
		}
	}

	function handleOptionKeydown(event: KeyboardEvent, profile: Profile) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectProfile(profile);
		}
	}
</script>

<div class="profile-dropdown" class:disabled>
	<button
		type="button"
		class="dropdown-trigger"
		onclick={toggleDropdown}
		onkeydown={handleKeydown}
		{disabled}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		aria-label="Select AI voice profile"
	>
		<span class="trigger-label">Voice Profile:</span>
		<span class="trigger-value">{currentProfile.name}</span>
		<span class="trigger-icon" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
	</button>

	{#if isOpen}
		<div class="dropdown-menu" role="listbox">
			{#each profiles as profile (profile.id)}
				<button
					type="button"
					class="dropdown-option"
					class:selected={profile.id === currentProfile.id}
					onclick={() => selectProfile(profile)}
					onkeydown={(e) => handleOptionKeydown(e, profile)}
					role="option"
					aria-selected={profile.id === currentProfile.id}
				>
					<div class="option-content">
						<span class="option-name">{profile.name}</span>
						{#if profile.description}
							<span class="option-description">{profile.description}</span>
						{/if}
					</div>
					{#if profile.id === currentProfile.id}
						<span class="option-check" aria-hidden="true">✓</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

{#if isOpen}
	<div class="dropdown-backdrop" onclick={() => (isOpen = false)} aria-hidden="true"></div>
{/if}

<style lang="postcss">
	.profile-dropdown {
		position: relative;
		display: inline-block;
		width: 100%;
		max-width: 400px;
	}

	.profile-dropdown.disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	.dropdown-trigger {
		width: 100%;
		padding: 0.75rem 1rem;
		background: hsl(220, 20%, 98%);
		border: 1px solid hsl(220, 20%, 85%);
		border-radius: 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		transition: all 0.2s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		font-size: 0.95rem;
		min-height: 44px;
	}

	.dark .dropdown-trigger {
		background: hsl(220, 15%, 20%);
		border-color: hsl(220, 20%, 35%);
	}

	.dropdown-trigger:hover:not(:disabled) {
		border-color: hsl(220, 50%, 60%);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		transform: translateY(-1px);
	}

	.dropdown-trigger:focus {
		outline: 2px solid hsl(220, 70%, 50%);
		outline-offset: 2px;
	}

	.dropdown-trigger:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.trigger-label {
		color: hsl(220, 20%, 50%);
		font-weight: 500;
		font-size: 0.85rem;
	}

	.dark .trigger-label {
		color: hsl(220, 20%, 70%);
	}

	.trigger-value {
		flex: 1;
		color: hsl(220, 30%, 20%);
		font-weight: 600;
		text-align: left;
	}

	.dark .trigger-value {
		color: hsl(220, 20%, 85%);
	}

	.trigger-icon {
		color: hsl(220, 30%, 50%);
		font-size: 0.75rem;
		transition: transform 0.2s ease;
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 2rem;
		right: 0;
		background: hsl(220, 20%, 98%);
		border: 1px solid hsl(220, 20%, 85%);
		border-radius: 0.75rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		overflow: hidden;
		max-height: 300px;
		overflow-y: auto;
	}

	.dark .dropdown-menu {
		background: hsl(220, 15%, 20%);
		border-color: hsl(220, 20%, 35%);
	}

	.dropdown-option {
		width: calc(100% - 2rem);
		padding: 0.875rem 1rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid hsl(220, 20%, 92%);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		transition: all 0.15s ease;
		text-align: left;
		min-height: 44px;
	}

	.dark .dropdown-option {
		border-bottom-color: hsl(220, 20%, 30%);
	}

	.dropdown-option:last-child {
		border-bottom: none;
	}

	.dropdown-option:hover:not(.selected) {
		background: hsl(220, 30%, 95%);
	}

	.dark .dropdown-option:hover:not(.selected) {
		background: hsl(220, 20%, 25%);
	}

	.dropdown-option.selected {
		background: hsl(220, 50%, 95%);
		font-weight: 600;
	}

	.dark .dropdown-option.selected {
		background: hsl(220, 40%, 30%);
	}

	.dropdown-option:focus {
		outline: 2px solid hsl(220, 70%, 50%);
		outline-offset: -2px;
	}

	.option-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.option-name {
		color: hsl(220, 30%, 20%);
		font-size: 0.95rem;
		font-weight: 500;
	}

	.dark .option-name {
		color: hsl(220, 20%, 85%);
	}

	.option-description {
		color: hsl(220, 20%, 50%);
		font-size: 0.8rem;
		font-weight: 400;
	}

	.dark .option-description {
		color: hsl(220, 20%, 65%);
	}

	.option-check {
		color: hsl(220, 70%, 50%);
		font-size: 1rem;
		font-weight: bold;
	}

	.dropdown-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 999;
		background: transparent;
	}

	@media (max-width: 640px) {
		.profile-dropdown {
			max-width: 100%;
		}

		.dropdown-trigger {
			padding: 0.875rem 1rem;
			font-size: 0.9rem;
		}

		.dropdown-option {
			padding: 1rem;
		}
	}
</style>
