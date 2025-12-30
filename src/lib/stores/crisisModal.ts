import { writable } from 'svelte/store';

/**
 * Store for managing crisis hotlines modal state
 */
export const crisisModalOpen = writable<boolean>(false);

/**
 * Open the crisis hotlines modal
 */
export function openCrisisModal(): void {
	crisisModalOpen.set(true);
}

/**
 * Close the crisis hotlines modal
 */
export function closeCrisisModal(): void {
	crisisModalOpen.set(false);
}

