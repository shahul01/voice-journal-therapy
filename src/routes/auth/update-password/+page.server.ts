import { redirect } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setError, superValidate, message } from 'sveltekit-superforms';
import type { PageServerLoad, Actions } from './$types';

const updatePasswordSchema = z
	.object({
		password: z.string().min(6, 'Password must be at least 6 characters long'),
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	});

export const load: PageServerLoad = async ({ locals: { safeGetSession }, url }) => {
	const { session } = await safeGetSession();

	// Verify that user came from password reset email (token_hash should be present)
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');

	if (!tokenHash || type !== 'recovery') {
		// If no token, redirect to reset password page
		throw redirect(303, '/auth/reset-password');
	}

	// If no session, user needs to complete the password reset flow
	if (!session) {
		return {
			requiresSession: true,
			tokenHash,
			type
		};
	}

	const form = await superValidate(zod4(updatePasswordSchema));
	return { form, requiresSession: false };
};

export const actions: Actions = {
	update: async ({ request, locals: { supabase } }) => {
		const form = await superValidate(request, zod4(updatePasswordSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { error } = await supabase.auth.updateUser({
			password: form.data.password
		});

		if (error) {
			console.error(`Password update failed: ${error.message}`);
			setError(form, 'password', error.message);
			return fail(400, { form });
		}

		// Success - redirect to app or signin
		return message(form, 'Password updated successfully! Redirecting...');
	}
};

