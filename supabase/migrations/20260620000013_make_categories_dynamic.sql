-- Migration: Make categories dynamic and add country of residence to profiles
-- 1. Add new columns to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_monthly_bill BOOLEAN DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS preferred_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS residence_country TEXT;

-- 3. Set existing profiles to onboarded = true so they do not see the onboarding wizard
UPDATE public.profiles SET onboarded = true;

-- 4. Seed user-specific copies of default categories for all existing profiles
INSERT INTO public.categories (user_id, name, icon, color)
SELECT p.id, c.name, c.icon, c.color
FROM public.profiles p
CROSS JOIN (
    SELECT name, icon, color FROM public.categories WHERE user_id IS NULL
) c
ON CONFLICT (user_id, name) DO NOTHING;

-- 5. Migrate rent & bills values from profiles to user-specific categories
UPDATE public.categories c
SET is_monthly_bill = true,
    monthly_amount = COALESCE(p.house_rent, 264.50),
    preferred_account_id = p.house_rent_account_id
FROM public.profiles p
WHERE c.user_id = p.id AND LOWER(c.name) = 'house rent';

UPDATE public.categories c
SET is_monthly_bill = true,
    monthly_amount = COALESCE(p.health_insurance, 151.42),
    preferred_account_id = p.health_insurance_account_id
FROM public.profiles p
WHERE c.user_id = p.id AND LOWER(c.name) = 'health insurance';

UPDATE public.categories c
SET is_monthly_bill = true,
    monthly_amount = COALESCE(p.radio_bill, 18.36),
    preferred_account_id = p.radio_bill_account_id
FROM public.profiles p
WHERE c.user_id = p.id AND LOWER(c.name) = 'radio bill';

UPDATE public.categories c
SET is_monthly_bill = true,
    monthly_amount = COALESCE(p.mobile_bill, 10.00),
    preferred_account_id = p.mobile_bill_account_id
FROM public.profiles p
WHERE c.user_id = p.id AND LOWER(c.name) = 'mobile bill';

UPDATE public.categories c
SET is_monthly_bill = true,
    monthly_amount = COALESCE(p.semester_fee, 350.00),
    preferred_account_id = p.semester_fee_account_id,
    is_active = COALESCE(p.show_semester_fee, false)
FROM public.profiles p
WHERE c.user_id = p.id AND LOWER(c.name) = 'education';

-- Disable categories that were in profiles.disabled_categories
UPDATE public.categories c
SET is_active = false
FROM public.profiles p
WHERE c.user_id = p.id 
  AND (
    (LOWER(c.name) = 'house rent' AND 'house_rent' = ANY(p.disabled_categories)) OR
    (LOWER(c.name) = 'health insurance' AND 'health_insurance' = ANY(p.disabled_categories)) OR
    (LOWER(c.name) = 'radio bill' AND 'radio_bill' = ANY(p.disabled_categories)) OR
    (LOWER(c.name) = 'mobile bill' AND 'mobile_bill' = ANY(p.disabled_categories)) OR
    (LOWER(c.name) = 'education' AND 'semester_fee' = ANY(p.disabled_categories))
  );

-- 6. Re-define handle_new_user trigger function to capture residence_country
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, preferred_language, theme_preference, monthly_budget, residence_country, onboarded)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Student'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'de'),
    COALESCE(new.raw_user_meta_data->>'theme_preference', 'system'),
    700.00,
    new.raw_user_meta_data->>'residence_country',
    false -- New users need to onboard!
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger to automatically seed a new user's categories from defaults when a profile is created
CREATE OR REPLACE FUNCTION public.seed_new_user_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Copy global defaults to user's categories
  INSERT INTO public.categories (user_id, name, icon, color)
  SELECT new.id, name, icon, color
  FROM public.categories
  WHERE user_id IS NULL
  ON CONFLICT (user_id, name) DO NOTHING;
  
  -- Set default amounts/flags for the standard bills
  UPDATE public.categories
  SET is_monthly_bill = true,
      monthly_amount = CASE 
        WHEN LOWER(name) = 'house rent' THEN 264.50
        WHEN LOWER(name) = 'health insurance' THEN 151.42
        WHEN LOWER(name) = 'radio bill' THEN 18.36
        WHEN LOWER(name) = 'mobile bill' THEN 10.00
        ELSE 0.00
      END
  WHERE user_id = new.id AND LOWER(name) IN ('house rent', 'health insurance', 'radio bill', 'mobile bill');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if exists
DROP TRIGGER IF EXISTS on_profile_created_seed_categories ON public.profiles;
CREATE TRIGGER on_profile_created_seed_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_new_user_categories();

-- 8. Drop deprecated columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS house_rent;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS health_insurance;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS radio_bill;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS mobile_bill;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS semester_fee;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS house_rent_account_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS health_insurance_account_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS radio_bill_account_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS mobile_bill_account_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS semester_fee_account_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS show_semester_fee;
