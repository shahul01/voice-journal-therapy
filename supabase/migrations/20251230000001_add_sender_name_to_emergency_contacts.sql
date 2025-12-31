-- Add sender_name column to emergency_contacts table
-- This will store the name of the person who created the emergency contact
-- Used in alert messages to identify who needs support

ALTER TABLE public.emergency_contacts
ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.emergency_contacts.sender_name IS 'Name of the person who needs support (automatically populated from user profile or email)';

