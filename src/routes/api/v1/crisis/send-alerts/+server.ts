import { RESEND_API_KEY } from '$env/static/private';
import { json, error } from '@sveltejs/kit';
import { sendAlertToContact } from '$lib/server/alertService';
import type { RequestHandler } from './$types';
import type { CrisisSeverity } from '$lib/types/emergency';

interface SendAlertsInput {
	crisis_event_id: string;
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
		console.error('[SendAlerts API] Cooldown check error:', dbError);
		// On error, allow alert (fail open for safety)
		return false;
	}

	return (data?.length || 0) > 0;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Unauthorized');
	}

	const body: SendAlertsInput = await request.json();

	if (!body.crisis_event_id || !body.severity) {
		throw error(400, 'crisis_event_id and severity are required');
	}

	// Only send alerts for level 3 (high) or level 4 (critical)
	if (body.severity !== 'high' && body.severity !== 'critical') {
		return json({
			success: true,
			message: 'Alerts only sent for high or critical severity',
			sent: []
		});
	}

	// Check if crisis event exists in database
	const { data: existingEvent } = await locals.supabase
		.from('crisis_events')
		.select('id, user_id, severity')
		.eq('id', body.crisis_event_id)
		.single();

	if (!existingEvent) {
		// Crisis event doesn't exist - create it (manual alert trigger)
		const { error: insertError } = await locals.supabase.from('crisis_events').insert({
			id: body.crisis_event_id,
			user_id: user.id,
			severity: body.severity,
			cause_summary: 'Manual alert triggered by user',
			trigger_source: 'manual_alert',
			detection_details: {
				source: 'emergency_contact_modal',
				timestamp: new Date().toISOString()
			},
			solution_provided: null,
			follow_up_required: false
		});

		if (insertError) {
			console.error('[SendAlerts API] Failed to create crisis event:', insertError);
			throw error(500, 'Failed to create crisis event record');
		}
	} else {
		// Crisis event exists - verify it belongs to this user
		if (existingEvent.user_id !== user.id) {
			throw error(403, 'Unauthorized access to crisis event');
		}
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
		console.error('[SendAlerts API] Failed to fetch contacts:', contactsError);
		throw error(500, 'Failed to fetch emergency contacts');
	}

	if (!contacts || contacts.length === 0) {
		return json({
			success: true,
			message: 'No active emergency contacts found',
			sent: []
		});
	}

	// Send alerts to each contact (with cooldown check)
	const results = [];

	for (const contact of contacts) {
		// Check cooldown
		const hasRecent = await hasRecentAlert(locals.supabase, user.id, contact.id, COOLDOWN_HOURS);

		if (hasRecent) {
			console.log(`[SendAlerts API] Skipping contact ${contact.id} - within cooldown period`);
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
				crisis_event_id: body.crisis_event_id,
				emergency_contact_id: contact.id,
				user_id: user.id,
				message_sent: message,
				delivery_status: alertResult.success ? 'sent' : 'failed'
			})
			.select()
			.single();

		if (logError) {
			console.error('[SendAlerts API] Failed to log alert:', logError);
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
		message: `Alerts processed: ${sentCount} sent, ${results.length - sentCount} skipped/failed`,
		sent: results
	});
};
