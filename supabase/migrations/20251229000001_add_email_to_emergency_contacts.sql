-- Add email and notification_method columns to emergency_contacts table
-- Migration: 2025-12-29

-- Make phone_number nullable if it's currently NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'emergency_contacts'
        AND column_name = 'phone_number'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.emergency_contacts ALTER COLUMN phone_number DROP NOT NULL;
    END IF;
END $$;

-- Add email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'emergency_contacts'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.emergency_contacts ADD COLUMN email TEXT;
    END IF;
END $$;

-- Add notification_method column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'emergency_contacts'
        AND column_name = 'notification_method'
    ) THEN
        ALTER TABLE public.emergency_contacts
        ADD COLUMN notification_method TEXT NOT NULL DEFAULT 'email';

        -- Add check constraint
        ALTER TABLE public.emergency_contacts
        ADD CONSTRAINT emergency_contacts_notification_method_check
        CHECK (notification_method IN ('email', 'sms', 'both'));
    END IF;
END $$;

-- Update existing CHECK constraint to include email
-- Drop old constraint if it exists
ALTER TABLE public.emergency_contacts
DROP CONSTRAINT IF EXISTS emergency_contacts_phone_number_email_check;

-- Add new constraint that allows email OR phone_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
        AND table_name = 'emergency_contacts'
        AND constraint_name = 'emergency_contacts_phone_number_email_check'
    ) THEN
        ALTER TABLE public.emergency_contacts
        ADD CONSTRAINT emergency_contacts_phone_number_email_check
        CHECK (phone_number IS NOT NULL OR email IS NOT NULL);
    END IF;
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
