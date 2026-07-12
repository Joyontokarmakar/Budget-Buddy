-- Migration: Make stores dynamic and add show_shop_name to profiles
-- 1. Add rendering_name column to public.stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS rendering_name TEXT;

-- 2. Add show_shop_name column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_shop_name BOOLEAN DEFAULT true;

-- 3. Seed user-specific copies of default stores for all existing profiles
INSERT INTO public.stores (user_id, name)
SELECT p.id, s.name
FROM public.profiles p
CROSS JOIN (
    SELECT name FROM public.stores WHERE user_id IS NULL
) s
ON CONFLICT (user_id, name) DO NOTHING;

-- 4. Remap all existing expenses referencing global stores to user-specific stores
DO $$
DECLARE
    r RECORD;
    new_store_id UUID;
BEGIN
    FOR r IN 
        SELECT e.id AS expense_id, e.user_id, s.name 
        FROM public.expenses e
        JOIN public.stores s ON e.store_id = s.id
        WHERE s.user_id IS NULL
    LOOP
        SELECT id INTO new_store_id 
        FROM public.stores 
        WHERE user_id = r.user_id AND name = r.name;
        
        IF new_store_id IS NOT NULL THEN
            UPDATE public.expenses 
            SET store_id = new_store_id 
            WHERE id = r.expense_id;
        END IF;
    END LOOP;
END $$;

-- 5. Create trigger function to automatically seed a new user's stores from defaults when a profile is created
CREATE OR REPLACE FUNCTION public.seed_new_user_stores()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.stores (user_id, name)
  SELECT new.id, name
  FROM public.stores
  WHERE user_id IS NULL
  ON CONFLICT (user_id, name) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the trigger
DROP TRIGGER IF EXISTS on_profile_created_seed_stores ON public.profiles;
CREATE TRIGGER on_profile_created_seed_stores
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_new_user_stores();
