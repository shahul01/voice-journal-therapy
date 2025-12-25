import { supabaseServerClientBasic } from '$lib/supabase/server';
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { Handle } from '@sveltejs/kit';

/**
 * Auth middleware: Refreshes expired auth tokens automatically.
 * This ensures seamless session management without requiring user re-authentication.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = supabaseServerClientBasic(event);

	/**
	 * Safely get session by validating JWT signature.
	 * Never trust getSession() alone on server - always validate with getUser().
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		// Validate JWT signature against project's public keys
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	// Refresh session if needed (handles token refresh automatically)
	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	// If session exists, ensure it's refreshed
	if (session) {
		await event.locals.supabase.auth.getUser();
	}

	const withParaglideMiddleware = paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			},
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

	return withParaglideMiddleware;
};;
