// TODO: user specific profiles based on db

import type { Profile } from '$lib/types/profile';

const profiles: Profile[] = [
	{
		id: '1',
		name: 'Calming 1 - Brittney',
		config: {
			voice_id: 'pjcYQlDFKMbcOUp6F5GD',
			name: 'Brittney - Relaxing, Calm and Meditative',
			Model: 'Eleven Flash v2.5',
			Speed: '0.95',
			Stability: '50%',
			'Similarity boost': '75%',
			Style: '0%',
			'Speaker boost': 'Enabled'
		},
		description: 'A calming voice for meditation and relaxation.'
	},
	{
		id: '2',
		name: 'Soothing 1 - Daniel',
		config: {
			voice_id: 'onwK4e9ZLuTAKqWW03F9',
			name: 'Daniel - Soothing and Calming',
			Model: 'Eleven Flash v2.5',
			Speed: '0.93',
			Stability: '45%',
			'Similarity boost': '76%',
			Style: '0%',
			'Speaker boost': 'Enabled'
		},
		description: 'A soothing voice to relax to.'
	},
	{
		id: '3',
		name: 'Empathetic 1 - Jessica',
		config: {
			voice_id: 'g6xIsTj2HwM6VR4iXFCw',
			name: 'Jessica Anne Bogart - Empathetic and expressive',
			Model: 'Eleven Flash v2.5',
			Speed: '0.94',
			Stability: '45%',
			'Similarity boost': '76%',
			Style: '0%',
			'Speaker boost': 'Enabled'
		},
		description: 'Empathetic and expressive, great as a wellness coach.'
	},
	{
		id: '4',
		name: 'Relaxing 1 - Mark',
		config: {
			voice_id: '1SM7GgM6IMuvQlz2BwM3',
			name: 'Mark - Relaxed and laid back',
			Model: 'Eleven Flash v2.5',
			Speed: '0.94',
			Stability: '45%',
			'Similarity boost': '76%',
			Style: '0%',
			'Speaker boost': 'Enabled'
		},
		description: 'Relaxed and laid back, suitable for non chalant chats.'
	}
];

export default profiles;
