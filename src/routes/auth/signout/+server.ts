import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Signout endpoint that clears the session and redirects.
 */
export const POST: RequestHandler = async ({ locals: { supabase }, url }) => {
	await supabase.auth.signOut();

	// Redirect to home or signin page
	const redirectTo = url.searchParams.get('redirectTo') || '/auth/signin';
	throw redirect(303, redirectTo);
};

