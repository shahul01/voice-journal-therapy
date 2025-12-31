/**
 * Voice guidance scripts for breathing and grounding exercises
 * These will be converted to speech using the user's selected voice profile
 */

export interface GuidanceStep {
	text: string;
	duration: number; // milliseconds to wait after speaking
	action?: 'intro' | 'inhale' | 'hold' | 'exhale' | 'rest' | 'transition' | 'complete';
	visual?: boolean; // whether to show visual animation
}

/**
 * Breathing exercise guidance (3 cycles of 4-4-6-2)
 */
export const BREATHING_GUIDANCE: GuidanceStep[] = [
	{
		text: "I'm here with you. Let's take a moment together to calm your mind.",
		duration: 2000,
		action: 'intro'
	},
	{
		text: "We'll do a simple breathing exercise. Just follow my voice and breathe with me.",
		duration: 2000,
		action: 'intro'
	},
	// Cycle 1
	{
		text: "Breathe in slowly through your nose. Two. Three. Four.",
		duration: 4500,
		action: 'inhale',
		visual: true
	},
	{
		text: "Hold that breath. Two. Three. Four.",
		duration: 4500,
		action: 'hold',
		visual: true
	},
	{
		text: "Now breathe out slowly through your mouth. Two. Three. Four. Five. Six.",
		duration: 6500,
		action: 'exhale',
		visual: true
	},
	{
		text: "Rest and relax.",
		duration: 2500,
		action: 'rest',
		visual: true
	},
	// Cycle 2
	{
		text: "Breathe in. Two. Three. Four.",
		duration: 4500,
		action: 'inhale',
		visual: true
	},
	{
		text: "Hold. Two. Three. Four.",
		duration: 4500,
		action: 'hold',
		visual: true
	},
	{
		text: "Breathe out. Two. Three. Four. Five. Six.",
		duration: 6500,
		action: 'exhale',
		visual: true
	},
	{
		text: "Rest.",
		duration: 2500,
		action: 'rest',
		visual: true
	},
	// Cycle 3
	{
		text: "One more time. Breathe in. Two. Three. Four.",
		duration: 4500,
		action: 'inhale',
		visual: true
	},
	{
		text: "Hold. Two. Three. Four.",
		duration: 4500,
		action: 'hold',
		visual: true
	},
	{
		text: "Breathe out. Two. Three. Four. Five. Six.",
		duration: 6500,
		action: 'exhale',
		visual: true
	},
	{
		text: "And rest.",
		duration: 3000,
		action: 'rest',
		visual: true
	},
	{
		text: "You did wonderfully. Take a moment to notice how you feel.",
		duration: 3000,
		action: 'complete'
	}
];

/**
 * Grounding exercise guidance (5-4-3-2-1 technique)
 */
export const GROUNDING_GUIDANCE: GuidanceStep[] = [
	{
		text: "Great job with the breathing. Now let's ground ourselves in the present moment.",
		duration: 2000,
		action: 'intro'
	},
	{
		text: "Look around you and notice five things you can see. Take your time.",
		duration: 8000,
		action: 'transition'
	},
	{
		text: "What colors, shapes, or objects catch your eye?",
		duration: 7000,
		action: 'transition'
	},
	{
		text: "Now, feel four things you can touch.",
		duration: 7000,
		action: 'transition'
	},
	{
		text: "Maybe the chair beneath you, the fabric of your clothes, or the floor under your feet.",
		duration: 6000,
		action: 'transition'
	},
	{
		text: "Listen for three sounds around you. They can be close or far away.",
		duration: 8000,
		action: 'transition'
	},
	{
		text: "Notice two things you can smell. Or think of your two favorite scents.",
		duration: 7000,
		action: 'transition'
	},
	{
		text: "Finally, notice one thing you can taste. Or think of your favorite flavor.",
		duration: 6000,
		action: 'transition'
	},
	{
		text: "Take a deep breath. You're here. You're present. You're safe.",
		duration: 4000,
		action: 'complete'
	}
];

/**
 * Level 2 additional support message
 */
export const LEVEL_2_SUPPORT: GuidanceStep[] = [
	{
		text: "I'm here to listen if you'd like to talk more. You don't have to go through this alone.",
		duration: 3000,
		action: 'complete'
	}
];

