import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Protects /app routes by checking authentication status.
 * Redirects to signin if user is not authenticated.
 */
export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, url }) => {
	const { session, user } = await safeGetSession();

	if (!session || !user) {
		const redirectTo = url.pathname + url.search;
		throw redirect(303, `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	return {
		session,
		user
	};
};

