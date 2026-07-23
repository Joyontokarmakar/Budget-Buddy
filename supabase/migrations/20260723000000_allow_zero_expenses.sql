-- Migration: Allow €0.00 expenses (useful for waived recurring bills)
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_amount_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_check CHECK (amount >= 0);
