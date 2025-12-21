import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import profiles from '$lib/utils/profile';
import type { Profile } from '$lib/types/profile';

const STORAGE_KEY = 'voice-journal-selected-profile';

/**
 * Loads the selected profile from localStorage or returns the default profile.
 */
function loadProfileFromStorage(): Profile {
	if (!browser) {
		return profiles[0];
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const profileId = JSON.parse(stored);
			const profile = profiles.find((p) => p.id === profileId);
			if (profile) {
				return profile;
			}
		}
	} catch (err) {
		console.error('[ProfileStore] Failed to load profile from storage:', err);
	}

	return profiles[0];
}

/**
 * Saves the selected profile ID to localStorage.
 */
function saveProfileToStorage(profileId: string): void {
	if (!browser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(profileId));
	} catch (err) {
		console.error('[ProfileStore] Failed to save profile to storage:', err);
	}
}

function createProfileStore() {
	const { subscribe, set, update } = writable<Profile>(loadProfileFromStorage());

	return {
		subscribe,
		/**
		 * Sets the selected profile and persists it to localStorage.
		 */
		set: (profile: Profile) => {
			set(profile);
			saveProfileToStorage(profile.id);
		},
		/**
		 * Updates the profile using a function.
		 */
		update
	};
}

export const selectedProfile = createProfileStore();

/**
 * Gets all available profiles.
 */
export function getProfiles(): Profile[] {
	return profiles;
}
