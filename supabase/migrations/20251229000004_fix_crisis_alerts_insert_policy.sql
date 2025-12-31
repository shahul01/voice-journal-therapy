-- Fix RLS policy for crisis_alerts to allow INSERT
-- Migration: 2024-12-24

-- Add INSERT policy for crisis_alerts
DROP POLICY IF EXISTS "Users can insert own crisis alerts" ON public.crisis_alerts;
CREATE POLICY "Users can insert own crisis alerts" ON public.crisis_alerts
	FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

