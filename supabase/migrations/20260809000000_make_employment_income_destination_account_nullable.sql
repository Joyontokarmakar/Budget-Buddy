-- Migration: Make employment income destination account optional
ALTER TABLE public.employment_income ALTER COLUMN destination_account_id DROP NOT NULL;
