-- ============================================================================
-- QUICK FIX: Reload PostgREST Schema Cache
-- ============================================================================
-- Copy this entire file and run it in Supabase Dashboard → SQL Editor
-- This forces PostgREST to recognize newly added columns
-- ============================================================================

-- Verify columns exist
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'emergency_contacts' AND column_name IN ('email', 'notification_method'))
    OR (table_name = 'crisis_events' AND column_name = 'cause_summary')
  )
ORDER BY table_name, column_name;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE '✅ Schema cache reload triggered!';
    RAISE NOTICE '⏱️  Wait 2-3 seconds, then try your API call again.';
END $$;

