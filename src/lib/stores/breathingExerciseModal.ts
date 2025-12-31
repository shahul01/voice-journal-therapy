import { writable } from 'svelte/store';
import type { CrisisLevel } from '$lib/types/crisis';

interface BreathingExerciseModalState {
	isOpen: boolean;
	crisisLevel: 1 | 2 | null;
}

/**
 * Store for managing breathing/grounding exercise modal state
 */
export const breathingExerciseModal = writable<BreathingExerciseModalState>({
	isOpen: false,
	crisisLevel: null
});

/**
 * Open the breathing exercise modal for a specific crisis level
 */
export function openBreathingExerciseModal(level: 1 | 2): void {
	breathingExerciseModal.set({
		isOpen: true,
		crisisLevel: level
	});
}

/**
 * Close the breathing exercise modal
 */
export function closeBreathingExerciseModal(): void {
	breathingExerciseModal.set({
		isOpen: false,
		crisisLevel: null
	});
}

