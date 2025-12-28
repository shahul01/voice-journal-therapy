import { PUBLIC_APP_URL } from '$env/static/public';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setError, superValidate } from 'sveltekit-superforms';
import type { PageServerLoad, Actions } from './$types';

const signupSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters long')
});

export const load: PageServerLoad = async ({ locals: { safeGetSession }, url }) => {
	const { session } = await safeGetSession();

	// If already authenticated, redirect to app or return URL
	if (session) {
		const redirectTo = url.searchParams.get('redirectTo') || '/app';
		throw redirect(303, redirectTo);
	}

	const form = await superValidate(zod4(signupSchema));
	return { form };
};

export const actions: Actions = {
	signup: async ({ request, locals: { supabase }, url }) => {
		const form = await superValidate(request, zod4(signupSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { data, error } = await supabase.auth.signUp({
			email: form.data.email,
			password: form.data.password,
			options: {
				emailRedirectTo: `${PUBLIC_APP_URL}/auth/verified`,
				data: {
					display_name: form.data.name
				}
			}
		});

		if (error) {
			console.error(`Signup failed for ${form.data.email}: ${error.message}`);
			setError(form, 'password', error.message);
			return fail(401, { form });
		}

		// If session exists (email confirmation disabled in Supabase), redirect to app
		if (data.session) {
			const redirectTo = url.searchParams.get('redirectTo') || '/app';
			throw redirect(303, redirectTo);
		}

		// Otherwise, redirect to email confirmation page
		throw redirect(303, `/auth/confirm-email?email=${encodeURIComponent(form.data.email)}`);
	}
	// signupWithGoogle
};
