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
	}
];

export default profiles;
