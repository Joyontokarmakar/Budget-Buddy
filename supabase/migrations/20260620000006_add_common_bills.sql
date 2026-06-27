-- Migration: Add common bills columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS house_rent NUMERIC(10,2) DEFAULT 264.50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS health_insurance NUMERIC(10,2) DEFAULT 151.42;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS radio_bill NUMERIC(10,2) DEFAULT 18.36;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_bill NUMERIC(10,2) DEFAULT 10.00;
