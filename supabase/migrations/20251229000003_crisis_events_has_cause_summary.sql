-- Migration: 2025-12-29

-- Add cause_summary column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'crisis_events'
        AND column_name = 'cause_summary'
    ) THEN
        ALTER TABLE public.crisis_events ADD COLUMN cause_summary TEXT;
    END IF;
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';