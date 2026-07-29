-- Migration: Add Employment Income Support
CREATE TABLE IF NOT EXISTS public.employment_income (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    organization_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    destination_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.employment_income ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can view own employment_income" ON public.employment_income FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own employment_income" ON public.employment_income FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own employment_income" ON public.employment_income FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own employment_income" ON public.employment_income FOR DELETE USING (auth.uid() = user_id);
