import { writable } from 'svelte/store';
import type { CrisisDetectionResult } from '$lib/types/crisis';

interface CrisisDetectionState {
	latestResult: CrisisDetectionResult | null;
	history: CrisisDetectionResult[];
	isAnalyzing: boolean;
}

/**
 * Store for tracking crisis detection state across conversations
 */
export const crisisDetectionState = writable<CrisisDetectionState>({
	latestResult: null,
	history: [],
	isAnalyzing: false
});

/**
 * Update crisis detection with new result
 */
export function updateCrisisDetection(result: CrisisDetectionResult): void {
	crisisDetectionState.update((state) => ({
		...state,
		latestResult: result,
		history: [...state.history, result].slice(-10), // Keep last 10 detections
		isAnalyzing: false
	}));
}

/**
 * Set analyzing state
 */
export function setAnalyzing(isAnalyzing: boolean): void {
	crisisDetectionState.update((state) => ({
		...state,
		isAnalyzing
	}));
}

/**
 * Reset crisis detection state
 */
export function resetCrisisDetection(): void {
	crisisDetectionState.set({
		latestResult: null,
		history: [],
		isAnalyzing: false
	});
}

/**
 * Get highest crisis level from history
 */
export function getHighestCrisisLevel(history: CrisisDetectionResult[]): number {
	if (history.length === 0) return 0;
	return Math.max(...history.map((r) => r.level));
}

