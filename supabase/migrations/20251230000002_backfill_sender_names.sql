-- Migration script to populate sender_name for existing emergency contacts
-- Run this AFTER applying the main migration (20251230000001_add_sender_name_to_emergency_contacts.sql)
-- This is optional - sender_name will be auto-populated on next contact update

-- Update existing contacts with sender_name from user metadata
UPDATE public.emergency_contacts ec
SET sender_name = COALESCE(
  -- Try to get full_name from user metadata
  (SELECT u.raw_user_meta_data->>'full_name'
   FROM auth.users u
   WHERE u.id = ec.user_id),

  -- Fallback to name from user metadata
  (SELECT u.raw_user_meta_data->>'name'
   FROM auth.users u
   WHERE u.id = ec.user_id),

  -- Fallback to email username (before @)
  (SELECT split_part(u.email, '@', 1)
   FROM auth.users u
   WHERE u.id = ec.user_id),

  -- Final fallback
  'A user'
)
WHERE sender_name IS NULL OR sender_name = '';

-- Verify the update
SELECT
  id,
  user_id,
  name as contact_name,
  sender_name,
  created_at
FROM public.emergency_contacts
ORDER BY created_at DESC;


