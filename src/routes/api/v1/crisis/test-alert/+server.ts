import { RESEND_API_KEY } from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import { sendAlertToContact } from '$lib/server/alertService';
import type { RequestHandler } from './$types';
import type { CrisisSeverity } from '$lib/types/emergency';

interface TestAlertInput {
	severity: CrisisSeverity;
	user_name?: string;
}

const COOLDOWN_HOURS = 1; // Max 1 alert per hour per contact

/**
 * Check if contact has recent alert (cooldown check)
 */
async function hasRecentAlert(
	supabase: any,
	userId: string,
	contactId: string,
	cooldownHours: number
): Promise<boolean> {
	const cooldownTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();

	const { data, error: dbError } = await supabase
		.from('crisis_alerts')
		.select('id')
		.eq('user_id', userId)
		.eq('emergency_contact_id', contactId)
		.eq('delivery_status', 'sent')
		.gte('sent_at', cooldownTime)
		.limit(1);

	if (dbError) {
		console.error('[TestAlert API] Cooldown check error:', dbError);
		return false;
	}

	return (data?.length || 0) > 0;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body: TestAlertInput = await request.json();

	if (!body.severity) {
		throw error(400, 'severity is required');
	}

	// Only send alerts for level 3 (high) or level 4 (critical)
	if (body.severity !== 'high' && body.severity !== 'critical') {
		throw error(400, 'Test alerts can only be triggered for high or critical severity');
	}

	// Create a test crisis event
	const { data: crisisEvent, error: crisisError } = await locals.supabase
		.from('crisis_events')
		.insert({
			user_id: user.id,
			severity: body.severity,
			cause_summary: 'Test alert trigger from UI',
			trigger_source: 'manual',
			detection_details: { test: true }
		})
		.select()
		.single();

	if (crisisError || !crisisEvent) {
		console.error('[TestAlert API] Failed to create crisis event:', crisisError);
		throw error(500, 'Failed to create test crisis event');
	}

	// Get user profile for name
	const { data: userProfile } = await locals.supabase
		.from('user_profiles')
		.select('*')
		.eq('user_id', user.id)
		.single();

	const userName = body.user_name || userProfile?.about || user.email || 'A user';

	// Get active emergency contacts
	const { data: contacts, error: contactsError } = await locals.supabase
		.from('emergency_contacts')
		.select('*')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.order('priority', { ascending: true });

	if (contactsError) {
		console.error('[TestAlert API] Failed to fetch contacts:', contactsError);
		throw error(500, 'Failed to fetch emergency contacts');
	}

	if (!contacts || contacts.length === 0) {
		throw error(400, 'No active emergency contacts found. Please add at least one contact first.');
	}

	// Send alerts to each contact (with cooldown check)
	const results = [];

	for (const contact of contacts) {
		// Check cooldown
		const hasRecent = await hasRecentAlert(locals.supabase, user.id, contact.id, COOLDOWN_HOURS);

		if (hasRecent) {
			console.log(`[TestAlert API] Skipping contact ${contact.id} - within cooldown period`);
			results.push({
				contact_id: contact.id,
				contact_name: contact.name,
				status: 'skipped',
				reason: 'cooldown'
			});
			continue;
		}

		// Send alert
		const alertResult = await sendAlertToContact(
			contact,
			userName,
			RESEND_API_KEY ? { resendApiKey: RESEND_API_KEY } : undefined
		);

		// Determine message to log
		const message =
			contact.default_message ||
			`Hi ${contact.name}, this is an automated alert from VoiceGuard. ${userName} may need support right now. If possible, please check in with them. This is not an emergency service - if immediate help is needed, call 988 (Suicide & Crisis Lifeline). - VoiceGuard Support Network`;

		// Log alert in database
		const { data: alertLog, error: logError } = await locals.supabase
			.from('crisis_alerts')
			.insert({
				crisis_event_id: crisisEvent.id,
				emergency_contact_id: contact.id,
				user_id: user.id,
				message_sent: message,
				delivery_status: alertResult.success ? 'sent' : 'failed'
			})
			.select()
			.single();

		if (logError) {
			console.error('[TestAlert API] Failed to log alert:', logError);
		}

		results.push({
			contact_id: contact.id,
			contact_name: contact.name,
			status: alertResult.success ? 'sent' : 'failed',
			method: alertResult.method,
			error: alertResult.error,
			alert_id: alertLog?.id
		});
	}

	const sentCount = results.filter((r) => r.status === 'sent').length;

	return json({
		success: true,
		message: `Test alerts processed: ${sentCount} sent, ${results.length - sentCount} skipped/failed`,
		crisis_event_id: crisisEvent.id,
		sent: results
	});
};
