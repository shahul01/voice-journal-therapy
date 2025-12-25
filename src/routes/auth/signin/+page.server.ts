import { PUBLIC_APP_URL } from '$env/static/public';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setError, superValidate } from 'sveltekit-superforms';
import type { PageServerLoad, Actions } from './$types';

const signinSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(1, 'Password is required')
});

export const load: PageServerLoad = async ({ locals: { safeGetSession }, url }) => {
	const { session } = await safeGetSession();

	// If already authenticated, redirect to app or return URL
	if (session) {
		const redirectTo = url.searchParams.get('redirectTo') || '/app';
		throw redirect(303, redirectTo);
	}

	const form = await superValidate(zod4(signinSchema));

	return { form };
};

export const actions: Actions = {
	signin: async ({ request, locals: { supabase }, url }) => {
		const form = await superValidate(request, zod4(signinSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { data, error } = await supabase.auth.signInWithPassword({
			email: form.data.email,
			password: form.data.password
		});

		if (error) {
			console.error(`Signin failed for ${form.data.email}: ${error.message}`);
			setError(form, 'password', error.message);
			return fail(401, { form });
		}

		if (data.session) {
			const redirectTo = url.searchParams.get('redirectTo') || '/app';
			throw redirect(303, redirectTo);
		}
	}
};

