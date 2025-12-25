import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession }, url }) => {
	const { session } = await safeGetSession();
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');

	// If token_hash is present, the user is coming from email confirmation
	// The session should be automatically created by Supabase
	if (!session && tokenHash) {
		// Wait a bit for session to be set, then redirect
		return {
			tokenHash,
			type,
			verified: false
		};
	}

	if (session) {
		// Already verified, redirect to app
		throw redirect(303, '/app');
	}

	return {
		verified: false
	};
};

