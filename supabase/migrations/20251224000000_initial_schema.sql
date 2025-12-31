-- VoiceGuard AI - Initial Database Schema
-- Voice Journal Therapy Application
-- Created: 2025-12-24

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Note: We use Supabase's auth.users directly (no public.users table)
-- Additional user data stored in user_profiles

-- User profiles - personal information and metadata
CREATE TABLE IF NOT EXISTS public.user_profiles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	about TEXT,
	therapy_preferences JSONB DEFAULT '{}',
	last_active_at TIMESTAMPTZ,
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(user_id)
);

-- User uploaded documents
CREATE TABLE IF NOT EXISTS public.user_documents (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	filename TEXT NOT NULL,
	content_type TEXT NOT NULL,
	file_size INTEGER NOT NULL,
	storage_path TEXT NOT NULL, -- Supabase storage path
	content TEXT, -- Extracted text content for search
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- VOICE & AI CONFIGURATION
-- ============================================================================

-- ElevenLabs voice profiles
CREATE TABLE IF NOT EXISTS public.voice_profiles (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	elevenlabs_voice_id TEXT NOT NULL,
	voice_name TEXT NOT NULL,
	settings JSONB DEFAULT '{"stability": 0.75, "similarity_boost": 0.85}',
	is_default BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: API keys should be stored in Supabase Vault or environment variables
-- If user provides their own keys, encrypt them using pgcrypto
CREATE TABLE IF NOT EXISTS public.user_api_keys (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	provider TEXT NOT NULL CHECK (provider IN ('gemini', 'elevenlabs')),
	is_vertex_ai BOOLEAN NOT NULL DEFAULT FALSE,
	encrypted_key TEXT NOT NULL, -- Encrypted using pgcrypto
	key_hash TEXT NOT NULL, -- Hash for verification
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	last_used_at TIMESTAMPTZ,
	UNIQUE(user_id, provider, is_vertex_ai)
);

-- ============================================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================================

-- Conversation sessions (replaces confusing "messages" table)
CREATE TABLE IF NOT EXISTS public.conversations (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	title TEXT,
	started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	ended_at TIMESTAMPTZ,
	duration_seconds INTEGER,
	message_count INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual messages within conversations
CREATE TABLE IF NOT EXISTS public.messages (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
	content TEXT NOT NULL,
	ai_model TEXT, -- e.g., "gemini-1.5-flash", "gemini-1.5-pro"
	vertex_ai_used BOOLEAN NOT NULL DEFAULT FALSE,
	voice_profile_id UUID REFERENCES public.voice_profiles(id) ON DELETE SET NULL,
	audio_url TEXT, -- Supabase storage path for audio
	audio_duration_ms INTEGER,
	timestamp_in_session INTEGER NOT NULL DEFAULT 0, -- milliseconds from session start
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Message reviews (user feedback)
CREATE TABLE IF NOT EXISTS public.reviews (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
	conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	rating TEXT NOT NULL CHECK (rating IN ('like', 'dislike')),
	description TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(user_id, message_id)
);

-- ============================================================================
-- JOURNALS
-- ============================================================================

-- Voice journals (separate from conversations)
CREATE TABLE IF NOT EXISTS public.journals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	title TEXT,
	content TEXT NOT NULL,
	audio_url TEXT, -- Supabase storage path
	audio_duration_ms INTEGER,
	mood_rating INTEGER CHECK (mood_rating >= 0 AND mood_rating <= 100),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MENTAL HEALTH TRACKING
-- ============================================================================

-- User goals and check-ins
CREATE TABLE IF NOT EXISTS public.goals (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT 'General', -- 'General', 'Depression Management', 'Anxiety Reduction', etc.
	target_value INTEGER CHECK (target_value >= 0 AND target_value <= 100),
	current_value INTEGER CHECK (current_value >= 0 AND current_value <= 100),
	check_in_frequency TEXT CHECK (check_in_frequency IN ('daily', 'weekly', 'monthly')),
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goal check-in entries
CREATE TABLE IF NOT EXISTS public.goal_check_ins (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 100),
	notes TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mental health assessment tests (PHQ-9, GAD-7, etc.)
CREATE TABLE IF NOT EXISTS public.assessment_templates (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL UNIQUE, -- 'PHQ-9', 'GAD-7', etc.
	version TEXT NOT NULL DEFAULT '1.0.0',
	description TEXT NOT NULL,
	category TEXT NOT NULL, -- 'depression', 'anxiety', 'general'
	content JSONB NOT NULL, -- Questions, scoring, etc.
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User assessment results
CREATE TABLE IF NOT EXISTS public.assessment_results (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	assessment_template_id UUID NOT NULL REFERENCES public.assessment_templates(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	score INTEGER NOT NULL,
	max_score INTEGER NOT NULL,
	severity_level TEXT, -- 'minimal', 'mild', 'moderate', 'severe'
	responses JSONB NOT NULL, -- User's answers
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coping methods (CBT, DBT, mindfulness, etc.)
CREATE TABLE IF NOT EXISTS public.coping_methods (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	version TEXT NOT NULL DEFAULT '1.0.0',
	description TEXT NOT NULL,
	category TEXT NOT NULL, -- 'CBT', 'DBT', 'Mindfulness', etc.
	used_for TEXT[], -- Array of conditions: ['anxiety', 'depression', 'stress']
	content JSONB NOT NULL, -- Instructions, exercises, etc.
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User's usage of coping methods
CREATE TABLE IF NOT EXISTS public.coping_method_usage (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	coping_method_id UUID NOT NULL REFERENCES public.coping_methods(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	effectiveness_rating INTEGER CHECK (effectiveness_rating >= 0 AND effectiveness_rating <= 10),
	notes TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS & SUMMARIES
-- ============================================================================

-- User mental health summaries
CREATE TABLE IF NOT EXISTS public.user_summaries (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly', 'overall')),
	period_start TIMESTAMPTZ NOT NULL,
	period_end TIMESTAMPTZ,
	current_risk_level TEXT NOT NULL CHECK (current_risk_level IN ('low', 'medium', 'high', 'critical')),
	trend_direction TEXT NOT NULL CHECK (trend_direction IN ('improving', 'stable', 'declining')),
	metrics JSONB NOT NULL DEFAULT '{}', -- Detailed metrics
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(user_id, period_type, period_start)
);

-- Tags for categorizing content
CREATE TABLE IF NOT EXISTS public.tags (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	category TEXT NOT NULL DEFAULT 'theme', -- 'theme', 'emotion', 'topic'
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(name)
);

-- Tag relationships (many-to-many)
CREATE TABLE IF NOT EXISTS public.conversation_tags (
	conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
	tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (conversation_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.journal_tags (
	journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
	tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (journal_id, tag_id)
);

-- ============================================================================
-- CRISIS MANAGEMENT
-- ============================================================================

-- Emergency contacts
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	phone_number TEXT,
	email TEXT,
	relation TEXT NOT NULL,
	default_message TEXT,
	notification_method TEXT NOT NULL DEFAULT 'email' CHECK (notification_method IN ('email', 'sms', 'both')),
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	priority INTEGER NOT NULL DEFAULT 0, -- Lower number = higher priority
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	-- Ensure at least one contact method is provided
	CHECK (phone_number IS NOT NULL OR email IS NOT NULL)
);

-- Crisis events
CREATE TABLE IF NOT EXISTS public.crisis_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
	cause_summary TEXT, -- Short description of what caused the crisis event
	trigger_source TEXT NOT NULL, -- 'conversation', 'journal', 'assessment', 'manual'
	conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
	message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
	journal_id UUID REFERENCES public.journals(id) ON DELETE SET NULL,
	goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
	assessment_result_id UUID REFERENCES public.assessment_results(id) ON DELETE SET NULL,
	detection_details JSONB NOT NULL DEFAULT '{}', -- AI analysis details
	solution_provided TEXT,
	follow_up_required BOOLEAN NOT NULL DEFAULT TRUE,
	follow_up_completed_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crisis contact alerts (when emergency contacts are notified)
CREATE TABLE IF NOT EXISTS public.crisis_alerts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	crisis_event_id UUID NOT NULL REFERENCES public.crisis_events(id) ON DELETE CASCADE,
	emergency_contact_id UUID NOT NULL REFERENCES public.emergency_contacts(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	message_sent TEXT NOT NULL,
	sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'failed')),
	response_received_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active_at ON public.user_profiles(last_active_at);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON public.conversations(started_at DESC);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender);

-- Journal indexes
CREATE INDEX IF NOT EXISTS idx_journals_user_id ON public.journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_created_at ON public.journals(created_at DESC);

-- Goal indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_is_active ON public.goals(is_active);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_goal_id ON public.goal_check_ins(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_check_ins_created_at ON public.goal_check_ins(created_at DESC);

-- Assessment indexes
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON public.assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_template_id ON public.assessment_results(assessment_template_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_created_at ON public.assessment_results(created_at DESC);

-- Summary indexes
CREATE INDEX IF NOT EXISTS idx_user_summaries_user_id ON public.user_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_summaries_period_type ON public.user_summaries(period_type);
CREATE INDEX IF NOT EXISTS idx_user_summaries_period_start ON public.user_summaries(period_start DESC);

-- Crisis indexes
CREATE INDEX IF NOT EXISTS idx_crisis_events_user_id ON public.crisis_events(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_events_severity ON public.crisis_events(severity);
CREATE INDEX IF NOT EXISTS idx_crisis_events_created_at ON public.crisis_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_crisis_event_id ON public.crisis_alerts(crisis_event_id);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_emergency_contact_id ON public.crisis_alerts(emergency_contact_id);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_user_id ON public.crisis_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_sent_at ON public.crisis_alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_is_active ON public.emergency_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority ON public.emergency_contacts(priority);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON public.messages USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_journals_content_fts ON public.journals USING gin(to_tsvector('english', content));

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_documents_updated_at ON public.user_documents;
CREATE TRIGGER update_user_documents_updated_at BEFORE UPDATE ON public.user_documents
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_voice_profiles_updated_at ON public.voice_profiles;
CREATE TRIGGER update_voice_profiles_updated_at BEFORE UPDATE ON public.voice_profiles
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_api_keys_updated_at ON public.user_api_keys;
CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON public.user_api_keys
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_journals_updated_at ON public.journals;
CREATE TRIGGER update_journals_updated_at BEFORE UPDATE ON public.journals
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_templates_updated_at ON public.assessment_templates;
CREATE TRIGGER update_assessment_templates_updated_at BEFORE UPDATE ON public.assessment_templates
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_coping_methods_updated_at ON public.coping_methods;
CREATE TRIGGER update_coping_methods_updated_at BEFORE UPDATE ON public.coping_methods
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_summaries_updated_at ON public.user_summaries;
CREATE TRIGGER update_user_summaries_updated_at BEFORE UPDATE ON public.user_summaries
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON public.emergency_contacts;
CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON public.emergency_contacts
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crisis_events_updated_at ON public.crisis_events;
CREATE TRIGGER update_crisis_events_updated_at BEFORE UPDATE ON public.crisis_events
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coping_method_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_alerts ENABLE ROW LEVEL SECURITY;

-- User profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
	FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
	FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
	FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile" ON public.user_profiles
	FOR DELETE USING (auth.uid() = user_id);

-- User documents
DROP POLICY IF EXISTS "Users can manage own documents" ON public.user_documents;
CREATE POLICY "Users can manage own documents" ON public.user_documents
	FOR ALL USING (auth.uid() = user_id);

-- Voice profiles
DROP POLICY IF EXISTS "Users can manage own voice profiles" ON public.voice_profiles;
CREATE POLICY "Users can manage own voice profiles" ON public.voice_profiles
	FOR ALL USING (auth.uid() = user_id);

-- User API keys
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.user_api_keys;
CREATE POLICY "Users can manage own API keys" ON public.user_api_keys
	FOR ALL USING (auth.uid() = user_id);

-- Conversations
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;
CREATE POLICY "Users can manage own conversations" ON public.conversations
	FOR ALL USING (auth.uid() = user_id);

-- Messages
DROP POLICY IF EXISTS "Users can manage own messages" ON public.messages;
CREATE POLICY "Users can manage own messages" ON public.messages
	FOR ALL USING (auth.uid() = user_id);

-- Reviews
DROP POLICY IF EXISTS "Users can manage own reviews" ON public.reviews;
CREATE POLICY "Users can manage own reviews" ON public.reviews
	FOR ALL USING (auth.uid() = user_id);

-- Journals
DROP POLICY IF EXISTS "Users can manage own journals" ON public.journals;
CREATE POLICY "Users can manage own journals" ON public.journals
	FOR ALL USING (auth.uid() = user_id);

-- Goals
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
CREATE POLICY "Users can manage own goals" ON public.goals
	FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own goal check-ins" ON public.goal_check_ins;
CREATE POLICY "Users can manage own goal check-ins" ON public.goal_check_ins
	FOR ALL USING (auth.uid() = user_id);

-- Assessment templates (read-only for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view assessment templates" ON public.assessment_templates;
CREATE POLICY "Authenticated users can view assessment templates" ON public.assessment_templates
	FOR SELECT USING (auth.role() = 'authenticated');

-- Assessment results
DROP POLICY IF EXISTS "Users can manage own assessment results" ON public.assessment_results;
CREATE POLICY "Users can manage own assessment results" ON public.assessment_results
	FOR ALL USING (auth.uid() = user_id);

-- Coping methods (read-only for all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view coping methods" ON public.coping_methods;
CREATE POLICY "Authenticated users can view coping methods" ON public.coping_methods
	FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage own coping method usage" ON public.coping_method_usage;
CREATE POLICY "Users can manage own coping method usage" ON public.coping_method_usage
	FOR ALL USING (auth.uid() = user_id);

-- User summaries
DROP POLICY IF EXISTS "Users can view own summaries" ON public.user_summaries;
CREATE POLICY "Users can view own summaries" ON public.user_summaries
	FOR SELECT USING (auth.uid() = user_id);

-- Tags (all authenticated users can view)
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
CREATE POLICY "Authenticated users can view tags" ON public.tags
	FOR SELECT USING (auth.role() = 'authenticated');

-- Tag relationships
DROP POLICY IF EXISTS "Users can manage own conversation tags" ON public.conversation_tags;
CREATE POLICY "Users can manage own conversation tags" ON public.conversation_tags
	FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own journal tags" ON public.journal_tags;
CREATE POLICY "Users can manage own journal tags" ON public.journal_tags
	FOR ALL USING (auth.uid() = user_id);

-- Emergency contacts
DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts
	FOR ALL USING (auth.uid() = user_id);

-- Crisis events
DROP POLICY IF EXISTS "Users can manage own crisis events" ON public.crisis_events;
CREATE POLICY "Users can manage own crisis events" ON public.crisis_events
	FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own crisis alerts" ON public.crisis_alerts;
CREATE POLICY "Users can view own crisis alerts" ON public.crisis_alerts
	FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own crisis alerts" ON public.crisis_alerts;
CREATE POLICY "Users can insert own crisis alerts" ON public.crisis_alerts
	FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function to encrypt API keys
CREATE OR REPLACE FUNCTION encrypt_api_key(key_text TEXT, user_salt TEXT)
RETURNS TEXT AS $$
BEGIN
	RETURN encode(pgp_sym_encrypt(key_text, user_salt), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt API keys (use with caution)
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key TEXT, user_salt TEXT)
RETURNS TEXT AS $$
BEGIN
	RETURN pgp_sym_decrypt(decode(encrypted_key, 'base64'), user_salt);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
	UPDATE public.conversations
	SET message_count = message_count + 1
	WHERE id = NEW.conversation_id;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_message_count ON public.messages;
CREATE TRIGGER update_message_count AFTER INSERT ON public.messages
	FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- ============================================================================
-- SEED DATA (OPTIONAL - FOR DEVELOPMENT)
-- ============================================================================

-- Insert default assessment templates
INSERT INTO public.assessment_templates (name, version, description, category, content) VALUES
('PHQ-9', '1.0.0', 'Patient Health Questionnaire-9 for depression screening', 'depression',
	'{"questions": [{"id": 1, "text": "Little interest or pleasure in doing things"}, {"id": 2, "text": "Feeling down, depressed, or hopeless"}], "scoring": {"0-4": "minimal", "5-9": "mild", "10-14": "moderate", "15-19": "moderately severe", "20-27": "severe"}}'::jsonb),
('GAD-7', '1.0.0', 'Generalized Anxiety Disorder-7 screening', 'anxiety',
	'{"questions": [{"id": 1, "text": "Feeling nervous, anxious, or on edge"}, {"id": 2, "text": "Not being able to stop or control worrying"}], "scoring": {"0-4": "minimal", "5-9": "mild", "10-14": "moderate", "15-21": "severe"}}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Insert default coping methods
INSERT INTO public.coping_methods (name, version, description, category, used_for, content) VALUES
('Deep Breathing Exercise', '1.0.0', '4-7-8 breathing technique for anxiety relief', 'Mindfulness',
	ARRAY['anxiety', 'stress', 'panic'],
	'{"steps": ["Breathe in through nose for 4 seconds", "Hold breath for 7 seconds", "Exhale through mouth for 8 seconds", "Repeat 4 times"], "duration_minutes": 5}'::jsonb),
('Cognitive Restructuring', '1.0.0', 'CBT technique to challenge negative thoughts', 'CBT',
	ARRAY['depression', 'anxiety', 'negative-thinking'],
	'{"steps": ["Identify the negative thought", "Examine the evidence", "Challenge the thought", "Replace with balanced thought"], "example": "Thought: I always fail → Evidence: I succeeded last week → Balanced: I sometimes struggle but also succeed"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert common tags
INSERT INTO public.tags (name, category) VALUES
('anxiety', 'emotion'),
('depression', 'emotion'),
('hope', 'emotion'),
('gratitude', 'emotion'),
('stress', 'emotion'),
('relaxation', 'theme'),
('work', 'topic'),
('relationships', 'topic'),
('self-care', 'theme'),
('crisis', 'theme')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.user_profiles IS 'User profile data extending Supabase auth.users';
COMMENT ON TABLE public.conversations IS 'Voice therapy conversation sessions';
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON TABLE public.crisis_events IS 'Detected mental health crisis events';
COMMENT ON TABLE public.assessment_results IS 'Results from mental health assessments (PHQ-9, GAD-7, etc.)';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

