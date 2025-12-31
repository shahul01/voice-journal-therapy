/**
 * Crisis level definitions for graduated intervention system
 */
export type CrisisLevel = 0 | 1 | 2 | 3 | 4;

export interface CrisisDetectionResult {
	level: CrisisLevel;
	confidence: number;
	indicators: string[];
	reasoning: string;
	detectedPatterns: string[];
}

export interface CrisisLevelDefinition {
	level: CrisisLevel;
	name: string;
	description: string;
	userPatterns: string[];
	primarySolution: string;
	action: CrisisAction;
}

export type CrisisAction =
	| 'continue_normal'
	| 'offer_breathing_grounding'
	| 'proper_conversation_and_breathing'
	| 'show_emergency_contacts'
	| 'show_crisis_hotlines';

/**
 * Crisis level definitions mapping
 */
export const CRISIS_LEVELS: Record<CrisisLevel, CrisisLevelDefinition> = {
	0: {
		level: 0,
		name: 'Not Suicidal',
		description: 'No suicidal risk detected',
		userPatterns: ['non-suicidal', 'general conversation', 'daily life topics'],
		primarySolution: 'Continue as normal',
		action: 'continue_normal'
	},
	1: {
		level: 1,
		name: 'At Risk',
		description: 'Suicidal thoughts detected',
		userPatterns: [
			'passive suicidal ideation',
			'thoughts of death',
			'life meaninglessness',
			'wishing to not exist',
			'feeling hopeless about future'
		],
		primarySolution: 'Offer breathing and grounding exercises with guidance',
		action: 'offer_breathing_grounding'
	},
	2: {
		level: 2,
		name: 'Moderate',
		description: 'Suicidal method mentioned (non-detailed)',
		userPatterns: [
			'vague method mentions',
			'considering ways to die',
			'researching methods',
			'active ideation without plan',
			'thinking about suicide frequently'
		],
		primarySolution: 'Proper empathetic conversation and/or offer breathing and grounding',
		action: 'proper_conversation_and_breathing'
	},
	3: {
		level: 3,
		name: 'High',
		description: 'Suicidal intent expressed',
		userPatterns: [
			'expressed intent to act',
			'preparing to die',
			'saying goodbye',
			'giving away possessions',
			'sense of urgency',
			'feeling trapped'
		],
		primarySolution: 'Show emergency contact modal - connect with trusted support',
		action: 'show_emergency_contacts'
	},
	4: {
		level: 4,
		name: 'Critical',
		description: 'Detailed suicidal plans',
		userPatterns: [
			'specific method described',
			'detailed plan',
			'time and place decided',
			'access to means',
			'imminent risk',
			'final preparations'
		],
		primarySolution: 'Show crisis hotline modal - immediate professional intervention',
		action: 'show_crisis_hotlines'
	}
};
