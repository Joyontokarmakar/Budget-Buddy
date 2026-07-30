-- Migration: Make loan associated account optional
ALTER TABLE public.loans ALTER COLUMN account_id DROP NOT NULL;

-- Update trigger functions to handle nullable account_id

CREATE OR REPLACE FUNCTION public.adjust_balance_on_loan_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.account_id IS NOT NULL THEN
    IF NEW.type = 'taken' THEN
      UPDATE public.accounts
      SET balance = balance + NEW.amount
      WHERE id = NEW.account_id;
    ELSE
      UPDATE public.accounts
      SET balance = balance - NEW.amount
      WHERE id = NEW.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.adjust_balance_on_loan_update()
RETURNS trigger AS $$
DECLARE
  old_factor NUMERIC;
  new_factor NUMERIC;
BEGIN
  IF OLD.type = 'taken' THEN old_factor := 1; ELSE old_factor := -1; END IF;
  IF NEW.type = 'taken' THEN new_factor := 1; ELSE new_factor := -1; END IF;

  IF (OLD.account_id IS NULL AND NEW.account_id IS NULL) THEN
    -- Do nothing
  ELSIF (OLD.account_id = NEW.account_id) THEN
    UPDATE public.accounts
    SET balance = balance - (OLD.amount * old_factor) + (NEW.amount * new_factor)
    WHERE id = NEW.account_id;
  ELSE
    IF OLD.account_id IS NOT NULL THEN
      UPDATE public.accounts
      SET balance = balance - (OLD.amount * old_factor)
      WHERE id = OLD.account_id;
    END IF;
    IF NEW.account_id IS NOT NULL THEN
      UPDATE public.accounts
      SET balance = balance + (NEW.amount * new_factor)
      WHERE id = NEW.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.adjust_balance_on_loan_delete()
RETURNS trigger AS $$
DECLARE
  factor NUMERIC;
  payment_rec RECORD;
BEGIN
  IF OLD.type = 'taken' THEN factor := 1; ELSE factor := -1; END IF;
  
  IF OLD.account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance - (OLD.amount * factor)
    WHERE id = OLD.account_id;
  END IF;
  
  IF OLD.payments IS NOT NULL AND jsonb_array_length(OLD.payments) > 0 THEN
    FOR payment_rec IN 
      SELECT (value->>'amount')::NUMERIC AS amt, (value->>'account_id')::UUID AS acc_id
      FROM jsonb_array_elements(OLD.payments)
    LOOP
      IF payment_rec.acc_id IS NOT NULL THEN
        IF OLD.type = 'taken' THEN
          UPDATE public.accounts
          SET balance = balance + payment_rec.amt
          WHERE id = payment_rec.acc_id;
        ELSE
          UPDATE public.accounts
          SET balance = balance - payment_rec.amt
          WHERE id = payment_rec.acc_id;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
