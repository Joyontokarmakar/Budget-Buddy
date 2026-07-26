ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS estimated_pay_day INTEGER;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS estimated_pay_date DATE;
