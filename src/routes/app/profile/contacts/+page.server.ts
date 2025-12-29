import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return {
			contacts: []
		};
	}

	try {
		const { data, error: dbError } = await locals.supabase
			.from('emergency_contacts')
			.select('*')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.order('priority', { ascending: true })
			.order('created_at', { ascending: false });

		if (dbError) {
			console.error('[Contacts Page] Failed to load contacts:', dbError);
			return {
				contacts: []
			};
		}

		return {
			contacts: data || []
		};
	} catch (err) {
		console.error('[Contacts Page] Failed to load contacts:', err);
		return {
			contacts: []
		};
	}
};

