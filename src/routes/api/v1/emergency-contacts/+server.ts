import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type {
	CreateEmergencyContactInput,
	UpdateEmergencyContactInput,
	EmergencyContact
} from '$lib/types/emergency';

export const GET: RequestHandler = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const { data, error: dbError } = await locals.supabase
		.from('emergency_contacts')
		.select('*')
		.eq('user_id', user.id)
		.eq('is_active', url.searchParams.get('include_inactive') !== 'true')
		.order('priority', { ascending: true })
		.order('created_at', { ascending: false });

	if (dbError) {
		console.error('[EmergencyContacts API] GET error:', dbError);
		throw error(500, 'Failed to fetch emergency contacts');
	}

	return json({ success: true, data: data || [] });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body: CreateEmergencyContactInput = await request.json();

	// Validate required fields
	if (!body.name || !body.relation) {
		throw error(400, 'Name and relation are required');
	}

	// Normalize empty strings to null
	const email = body.email?.trim() || null;
	const phoneNumber = body.phone_number?.trim() || null;

	// Validate at least one contact method
	if (!email && !phoneNumber) {
		throw error(400, 'Either email or phone_number is required');
	}

	// Validate email format if provided
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw error(400, 'Invalid email format');
	}

	// Get sender name from user metadata or email
	const { data: userMetadata } = await locals.supabase.auth.getUser();
	const senderName =
		userMetadata?.user?.user_metadata?.full_name ||
		userMetadata?.user?.user_metadata?.name ||
		userMetadata?.user?.email?.split('@')[0] ||
		user.email?.split('@')[0] ||
		'A user';

	const { data, error: dbError } = await locals.supabase
		.from('emergency_contacts')
		.insert({
			user_id: user.id,
			name: body.name.trim(),
			phone_number: phoneNumber,
			email: email,
			relation: body.relation.trim(),
			default_message: body.default_message?.trim() || null,
			notification_method: body.notification_method || 'email',
			priority: body.priority ?? 0,
			sender_name: senderName
		})
		.select()
		.single();

	if (dbError) {
		console.error('[EmergencyContacts API] POST error:', dbError);
		// Return more detailed error message
		const errorMessage = dbError.message || 'Failed to create emergency contact';
		throw error(500, `Failed to create emergency contact: ${errorMessage}`);
	}

	return json({ success: true, data });
};;;;

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body: UpdateEmergencyContactInput & { id: string } = await request.json();

	if (!body.id) {
		throw error(400, 'Contact ID is required');
	}

	// Validate email format if provided
	if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
		throw error(400, 'Invalid email format');
	}

	// Validate at least one contact method if both are being cleared
	if (
		(body.email === null && body.phone_number === null) ||
		(body.email === '' && body.phone_number === '')
	) {
		const { data: existing } = await locals.supabase
			.from('emergency_contacts')
			.select('email, phone_number')
			.eq('id', body.id)
			.eq('user_id', user.id)
			.single();

		if (existing && !existing.email && !existing.phone_number) {
			throw error(400, 'At least one contact method (email or phone) is required');
		}
	}

	// First verify ownership
	const { data: existing, error: checkError } = await locals.supabase
		.from('emergency_contacts')
		.select('id')
		.eq('id', body.id)
		.eq('user_id', user.id)
		.single();

	if (checkError || !existing) {
		throw error(404, 'Emergency contact not found');
	}

	// Normalize empty strings to null
	const email = body.email !== undefined ? body.email?.trim() || null : undefined;
	const phoneNumber =
		body.phone_number !== undefined ? body.phone_number?.trim() || null : undefined;

	// Get sender name from user metadata or email (update if not set)
	const { data: contactData } = await locals.supabase
		.from('emergency_contacts')
		.select('sender_name')
		.eq('id', body.id)
		.eq('user_id', user.id)
		.single();

	let senderName = contactData?.sender_name;

	// If sender_name is not set, populate it now
	if (!senderName) {
		const { data: userMetadata } = await locals.supabase.auth.getUser();
		senderName =
			userMetadata?.user?.user_metadata?.full_name ||
			userMetadata?.user?.user_metadata?.name ||
			userMetadata?.user?.email?.split('@')[0] ||
			user.email?.split('@')[0] ||
			'A user';
	}

	const updateData: Partial<EmergencyContact> = {};
	if (body.name !== undefined) updateData.name = body.name.trim();
	if (phoneNumber !== undefined) updateData.phone_number = phoneNumber;
	if (email !== undefined) updateData.email = email;
	if (body.relation !== undefined) updateData.relation = body.relation.trim();
	if (body.default_message !== undefined)
		updateData.default_message = body.default_message?.trim() || null;
	if (body.notification_method !== undefined)
		updateData.notification_method = body.notification_method;
	if (body.is_active !== undefined) updateData.is_active = body.is_active;
	if (body.priority !== undefined) updateData.priority = body.priority;
	// Always ensure sender_name is set
	updateData.sender_name = senderName;

	const { data, error: dbError } = await locals.supabase
		.from('emergency_contacts')
		.update(updateData)
		.eq('id', body.id)
		.eq('user_id', user.id)
		.select()
		.single();

	if (dbError) {
		console.error('[EmergencyContacts API] PATCH error:', dbError);
		throw error(500, 'Failed to update emergency contact');
	}

	return json({ success: true, data });
};;;

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body: { id: string } = await request.json();

	if (!body.id) {
		throw error(400, 'Contact ID is required');
	}

	// Soft delete by setting is_active to false
	const { error: dbError } = await locals.supabase
		.from('emergency_contacts')
		.update({ is_active: false })
		.eq('id', body.id)
		.eq('user_id', user.id);

	if (dbError) {
		console.error('[EmergencyContacts API] DELETE error:', dbError);
		throw error(500, 'Failed to delete emergency contact');
	}

	return json({ success: true });
};

