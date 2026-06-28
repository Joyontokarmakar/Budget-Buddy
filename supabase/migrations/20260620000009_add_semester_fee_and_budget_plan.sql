-- Migration: Add semester fee and budget planner columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_semester_fee BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester_fee NUMERIC(10,2) DEFAULT 350.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester_fee_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS food_budget NUMERIC(10,2) DEFAULT 200.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS other_budget NUMERIC(10,2) DEFAULT 100.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled_categories TEXT[] DEFAULT '{}';
