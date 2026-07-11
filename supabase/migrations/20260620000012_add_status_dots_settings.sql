-- Migration: Add status dots settings to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_status_dots BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_dots_count INT DEFAULT 40;
