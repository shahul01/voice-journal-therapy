export interface Profile {
	id: string;
	name: string;
	config: {
		voice_id: string;
		name: string;
		Model: string;
		Speed: string;
		Stability: string;
		'Similarity boost': string;
		Style: string;
		'Speaker boost': string;
	};
	description: string;
}
