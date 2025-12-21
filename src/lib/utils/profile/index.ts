// TODO: user specific profiles based on db

import type { Profile } from '$lib/types/profile';

const profiles: Profile[] = [
	{
		id: '1',
		name: 'Calming 1',
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
		name: 'Soothing 1',
		config: {
			voice_id: 'onwK4e9ZLuTAKqWW03F9',
			name: 'Daniel - Soothing and Calming',
			Model: 'Eleven Flash v2.5',
			Speed: '0.94',
			Stability: '45%',
			'Similarity boost': '76%',
			Style: '0%',
			'Speaker boost': 'Enabled'
		},
		description: 'A soothing voice to relax to.'
	}
];

export default profiles;
