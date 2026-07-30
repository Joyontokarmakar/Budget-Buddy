-- Migration: Add default account setting
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE NOT NULL;

-- Trigger to enforce only one default account per user
CREATE OR REPLACE FUNCTION public.enforce_single_default_account()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.accounts
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it already exists
DROP TRIGGER IF EXISTS on_account_default_change ON public.accounts;

CREATE TRIGGER on_account_default_change
  BEFORE INSERT OR UPDATE OF is_default ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_default_account();
