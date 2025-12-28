import { PUBLIC_APP_URL } from '$env/static/public';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { zod4 } from 'sveltekit-superforms/adapters';
import { setError, superValidate, message } from 'sveltekit-superforms';
import type { PageServerLoad, Actions } from './$types';

const resetPasswordSchema = z.object({
	email: z.string().email('Invalid email address')
});

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(resetPasswordSchema));
	return { form };
};

export const actions: Actions = {
	reset: async ({ request, locals: { supabase } }) => {
		const form = await superValidate(request, zod4(resetPasswordSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { error } = await supabase.auth.resetPasswordForEmail(form.data.email, {
			redirectTo: `${PUBLIC_APP_URL}/auth/update-password`
		});

		if (error) {
			console.error(`Password reset failed for ${form.data.email}: ${error.message}`);
			setError(form, 'email', error.message);
			return fail(400, { form });
		}

		return message(form, 'Password reset email sent. Please check your inbox.');
	}
};

