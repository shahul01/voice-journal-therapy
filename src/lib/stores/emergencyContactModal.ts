import { writable } from 'svelte/store';

/**
 * Store for managing emergency contacts modal state
 */
export const emergencyContactModalOpen = writable<boolean>(false);

/**
 * Open the emergency contacts modal
 */
export function openEmergencyContactModal(): void {
	emergencyContactModalOpen.set(true);
}

/**
 * Close the emergency contacts modal
 */
export function closeEmergencyContactModal(): void {
	emergencyContactModalOpen.set(false);
}

