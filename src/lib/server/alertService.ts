import type { EmergencyContact } from '$lib/types/emergency';

interface SendEmailAlertInput {
	to: string;
	contactName: string;
	userName: string;
	message?: string;
}

interface SendSMSAlertInput {
	to: string;
	contactName: string;
	userName: string;
	message?: string;
}

const DEFAULT_ALERT_MESSAGE = `Hi {contactName}, this is an automated alert from VoiceGuard.

{userName} may need support right now.

If possible, please check in with them. This is not an emergency service - if immediate help is needed, call 988 (Suicide & Crisis Lifeline).

- VoiceGuard Support Network`;

/**
 * Generates alert message from template
 */
function generateAlertMessage(
	contactName: string,
	userName: string,
	customMessage?: string | null
): string {
	const template = customMessage || DEFAULT_ALERT_MESSAGE;
	return template.replace('{contactName}', contactName).replace('{userName}', userName);
}

/**
 * Sends email alert using Resend API
 */
export async function sendEmailAlert({
	to,
	contactName,
	userName,
	message,
	apiKey
}: SendEmailAlertInput & { apiKey?: string }): Promise<{ success: boolean; error?: string }> {
	const RESEND_API_KEY = apiKey || process.env.RESEND_API_KEY;

	if (!RESEND_API_KEY) {
		console.error('[AlertService] RESEND_API_KEY not configured');
		return { success: false, error: 'Email service not configured' };
	}

	try {
		const alertMessage = generateAlertMessage(contactName, userName, message);

		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'VoiceGuard <alerts@voice-therapy.shahul01.com>',
				to: [to],
				subject: 'URGENT: VoiceGuard Support Network Alert',
				text: alertMessage
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[AlertService] Email send failed:', {
				status: response.status,
				error: errorData
			});
			return {
				success: false,
				error: `Email delivery failed: ${response.status}`
			};
		}

		const result = await response.json();
		console.log('[AlertService] Email sent successfully:', result.id);

		return { success: true };
	} catch (err) {
		console.error('[AlertService] Email send error:', err);
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

/**
 * Sends SMS alert using Twilio API
 */
export async function sendSMSAlert({
	to,
	contactName,
	userName,
	message,
	credentials
}: SendSMSAlertInput & {
	credentials?: {
		accountSid: string;
		authToken: string;
		phoneNumber: string;
	};
}): Promise<{ success: boolean; error?: string }> {
	if (!credentials) {
		return { success: false, error: 'Twilio credentials not provided' };
	}

	const TWILIO_ACCOUNT_SID = credentials.accountSid;
	const TWILIO_AUTH_TOKEN = credentials.authToken;
	const TWILIO_PHONE_NUMBER = credentials.phoneNumber;

	try {
		const alertMessage = generateAlertMessage(contactName, userName, message);

		const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
		const body = new URLSearchParams({
			To: to,
			From: TWILIO_PHONE_NUMBER,
			Body: alertMessage
		});

		const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': `Basic ${auth}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: body.toString()
		});

		if (!response.ok) {
			const errorData = await response.text();
			console.error('[AlertService] SMS send failed:', {
				status: response.status,
				error: errorData
			});
			return {
				success: false,
				error: `SMS delivery failed: ${response.status}`
			};
		}

		const result = await response.json();
		console.log('[AlertService] SMS sent successfully:', result.sid);

		return { success: true };
	} catch (err) {
		console.error('[AlertService] SMS send error:', err);
		return {
			success: false,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}

/**
 * Sends alert to emergency contact based on their notification preferences
 */
export async function sendAlertToContact(
	contact: EmergencyContact,
	userName: string,
	options?: {
		resendApiKey?: string;
		twilioCredentials?: {
			accountSid: string;
			authToken: string;
			phoneNumber: string;
		};
	}
): Promise<{ success: boolean; error?: string; method?: 'email' | 'sms' }> {
	const { notification_method, email, phone_number, name, default_message } = contact;

	let result: { success: boolean; error?: string; method?: 'email' | 'sms' } | undefined;

	if (notification_method === 'email' || notification_method === 'both') {
		if (!email) {
			return { success: false, error: 'Email address not provided for contact' };
		}

		result = await sendEmailAlert({
			to: email,
			contactName: name,
			userName,
			message: default_message || undefined,
			apiKey: options?.resendApiKey
		});

		if (result.success) {
			return { ...result, method: 'email' };
		}
	}

	if (notification_method === 'sms' || (notification_method === 'both' && result && !result.success)) {
		if (!phone_number) {
			return { success: false, error: 'Phone number not provided for contact' };
		}

		if (!options?.twilioCredentials) {
			return { success: false, error: 'SMS service not configured' };
		}

		result = await sendSMSAlert({
			to: phone_number,
			contactName: name,
			userName,
			message: default_message || undefined,
			credentials: options.twilioCredentials
		});

		if (result.success) {
			return { ...result, method: 'sms' };
		}
	}

	return result || { success: false, error: 'No valid notification method' };
}

