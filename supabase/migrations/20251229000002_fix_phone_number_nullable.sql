-- Fix phone_number to be nullable in emergency_contacts table
-- Migration: 2025-12-29

-- Make phone_number nullable
ALTER TABLE public.emergency_contacts
ALTER COLUMN phone_number DROP NOT NULL;

