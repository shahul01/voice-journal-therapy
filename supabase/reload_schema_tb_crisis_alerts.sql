-- Verify crisis_alerts INSERT policy exists
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'crisis_alerts'
ORDER BY policyname;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Schema cache reloaded! Try test alert again.';
END $$;

