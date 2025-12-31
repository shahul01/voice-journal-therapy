export type NotificationMethod = 'email' | 'sms' | 'both';

export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DeliveryStatus = 'pending' | 'sent' | 'failed';

export interface EmergencyContact {
	id: string;
	user_id: string;
	name: string;
	phone_number: string | null;
	email: string | null;
	relation: string;
	default_message: string | null;
	notification_method: NotificationMethod;
	is_active: boolean;
	priority: number;
	created_at: string;
	updated_at: string;
}

export interface CreateEmergencyContactInput {
	name: string;
	phone_number?: string | null;
	email?: string | null;
	relation: string;
	default_message?: string | null;
	notification_method?: NotificationMethod;
	priority?: number;
}

export interface UpdateEmergencyContactInput {
	name?: string;
	phone_number?: string | null;
	email?: string | null;
	relation?: string;
	default_message?: string | null;
	notification_method?: NotificationMethod;
	is_active?: boolean;
	priority?: number;
}

export interface CrisisAlert {
	id: string;
	crisis_event_id: string;
	emergency_contact_id: string;
	user_id: string;
	message_sent: string;
	sent_at: string;
	delivery_status: DeliveryStatus;
	response_received_at: string | null;
}

export interface CrisisEvent {
	id: string;
	user_id: string;
	severity: CrisisSeverity;
	cause_summary: string | null;
	trigger_source: string;
	conversation_id: string | null;
	message_id: string | null;
	journal_id: string | null;
	goal_id: string | null;
	assessment_result_id: string | null;
	detection_details: Record<string, unknown>;
	solution_provided: string | null;
	follow_up_required: boolean;
	follow_up_completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface AlertMessageTemplate {
	greeting: string;
	body: string;
	closing: string;
}

