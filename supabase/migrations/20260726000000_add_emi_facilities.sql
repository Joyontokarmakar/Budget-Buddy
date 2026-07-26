-- Migration: Add EMI Facilities Support
CREATE TABLE IF NOT EXISTS public.emis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_name TEXT NOT NULL,
    buy_date DATE NOT NULL DEFAULT CURRENT_DATE,
    emi_months INT NOT NULL CHECK (emi_months > 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    installment_amount NUMERIC(10, 2) NOT NULL CHECK (installment_amount >= 0),
    interest_rate NUMERIC(5, 2) NOT NULL CHECK (interest_rate >= 0),
    actual_price NUMERIC(10, 2) NOT NULL CHECK (actual_price >= 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.emis ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can view own emis" ON public.emis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emis" ON public.emis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emis" ON public.emis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emis" ON public.emis FOR DELETE USING (auth.uid() = user_id);

-- Alter public.expenses to add emi_id column
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS emi_id UUID REFERENCES public.emis(id) ON DELETE SET NULL;
