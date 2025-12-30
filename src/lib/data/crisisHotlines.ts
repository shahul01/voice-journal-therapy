/**
 * Crisis hotlines data - works completely offline
 * All numbers are hardcoded for immediate access without network
 */

export interface CrisisHotline {
	id: string;
	name: string;
	phone?: string;
	text?: string;
	textCode?: string;
	description: string;
	available: string;
	url?: string;
	country?: string;
}

export interface CrisisHotlinesByCountry {
	country: string;
	countryCode: string;
	hotlines: CrisisHotline[];
}

/**
 * Get user's country code from browser locale/timezone
 */
export function detectUserCountry(): string {
	if (typeof window === 'undefined') return 'US';

	// Try timezone first (most reliable)
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// Common timezone to country mappings
	const timezoneMap: Record<string, string> = {
		'America/New_York': 'US',
		'America/Chicago': 'US',
		'America/Denver': 'US',
		'America/Los_Angeles': 'US',
		'America/Toronto': 'CA',
		'Europe/London': 'GB',
		'Europe/Paris': 'FR',
		'Europe/Berlin': 'DE',
		'Asia/Tokyo': 'JP',
		'Asia/Shanghai': 'CN',
		'Australia/Sydney': 'AU',
		'Australia/Melbourne': 'AU',
		'Asia/Kolkata': 'IN',
		'America/Mexico_City': 'MX',
		'America/Sao_Paulo': 'BR',
		'Europe/Madrid': 'ES',
		'Europe/Rome': 'IT'
	};

	if (timezoneMap[timezone]) {
		return timezoneMap[timezone];
	}

	// Fallback to locale
	const locale = navigator.language || 'en-US';
	const countryCode = locale.split('-')[1]?.toUpperCase() || 'US';

	return countryCode || 'US';
}

/**
 * All crisis hotlines organized by country
 */
export const CRISIS_HOTLINES: CrisisHotlinesByCountry[] = [
	{
		country: 'United States',
		countryCode: 'US',
		hotlines: [
			{
				id: '988',
				name: '988 Suicide & Crisis Lifeline',
				phone: '988',
				text: '988',
				textCode: 'HOME',
				description: 'Free, confidential 24/7 support for anyone in crisis',
				available: '24/7',
				url: 'https://988lifeline.org'
			},
			{
				id: 'crisis-text',
				name: 'Crisis Text Line',
				phone: '',
				text: '741741',
				textCode: 'HOME',
				description: 'Text support for any crisis',
				available: '24/7',
				url: 'https://www.crisistextline.org'
			},
			{
				id: 'veterans',
				name: 'Veterans Crisis Line',
				phone: '988',
				text: '838255',
				textCode: '',
				description: 'Press 1 after calling 988, or text 838255',
				available: '24/7',
				url: 'https://www.veteranscrisisline.net'
			},
			{
				id: 'trevor',
				name: 'Trevor Project (LGBTQ+)',
				phone: '1-866-488-7386',
				text: '678678',
				textCode: 'START',
				description: 'Crisis support for LGBTQ+ youth',
				available: '24/7',
				url: 'https://www.thetrevorproject.org'
			}
		]
	},
	{
		country: 'Canada',
		countryCode: 'CA',
		hotlines: [
			{
				id: '988-ca',
				name: '988 Suicide Crisis Helpline',
				phone: '988',
				description: 'Free, confidential 24/7 support',
				available: '24/7',
				url: 'https://988.ca'
			},
			{
				id: 'kids-help',
				name: 'Kids Help Phone',
				phone: '1-800-668-6868',
				text: '686868',
				description: 'Support for youth under 20',
				available: '24/7',
				url: 'https://kidshelpphone.ca'
			}
		]
	},
	{
		country: 'United Kingdom',
		countryCode: 'GB',
		hotlines: [
			{
				id: 'samaritans',
				name: 'Samaritans',
				phone: '116 123',
				description: 'Free, confidential support',
				available: '24/7',
				url: 'https://www.samaritans.org'
			},
			{
				id: 'shout',
				name: 'Shout',
				text: '85258',
				description: 'Text support for any crisis',
				available: '24/7',
				url: 'https://www.giveusashout.org'
			}
		]
	},
	{
		country: 'Australia',
		countryCode: 'AU',
		hotlines: [
			{
				id: 'lifeline-au',
				name: 'Lifeline Australia',
				phone: '13 11 14',
				description: '24/7 crisis support and suicide prevention',
				available: '24/7',
				url: 'https://www.lifeline.org.au'
			},
			{
				id: 'kids-helpline-au',
				name: 'Kids Helpline',
				phone: '1800 55 1800',
				description: 'Free, confidential support for young people',
				available: '24/7',
				url: 'https://kidshelpline.com.au'
			}
		]
	},
	{
		country: 'International',
		countryCode: 'INT',
		hotlines: [
			{
				id: 'iasp',
				name: 'International Association for Suicide Prevention',
				description: 'Find local crisis resources in your country',
				available: 'Varies',
				url: 'https://www.iasp.info/resources/Crisis_Centres/'
			},
			{
				id: 'befrienders',
				name: 'Befrienders Worldwide',
				description: 'Global directory of emotional support services',
				available: 'Varies',
				url: 'https://www.befrienders.org'
			}
		]
	}
];

/**
 * Get hotlines for a specific country
 */
export function getHotlinesForCountry(countryCode: string): CrisisHotline[] {
	const countryData = CRISIS_HOTLINES.find((c) => c.countryCode === countryCode);
	if (countryData) {
		return countryData.hotlines;
	}

	// Default to US hotlines if country not found
	const usData = CRISIS_HOTLINES.find((c) => c.countryCode === 'US');
	return usData?.hotlines || [];
}

/**
 * Get all primary hotlines (US + user's country)
 */
export function getPrimaryHotlines(userCountryCode?: string): CrisisHotline[] {
	const detectedCountry = userCountryCode || detectUserCountry();
	const userHotlines = getHotlinesForCountry(detectedCountry);
	const usHotlines = getHotlinesForCountry('US');

	// Combine, prioritizing user's country, then US, then international
	const combined = [...userHotlines];

	// Add US hotlines if different country (avoid duplicates)
	if (detectedCountry !== 'US') {
		combined.push(...usHotlines);
	}

	// Add international resources
	const intlData = CRISIS_HOTLINES.find((c) => c.countryCode === 'INT');
	if (intlData) {
		combined.push(...intlData.hotlines);
	}

	return combined;
}
