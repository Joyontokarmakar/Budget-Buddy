-- Create deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    time TIME WITHOUT TIME ZONE DEFAULT CURRENT_TIME NOT NULL,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    source TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Deposits
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Deposits Policies
CREATE POLICY "Users can view own deposits" ON public.deposits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deposits" ON public.deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deposits" ON public.deposits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deposits" ON public.deposits
  FOR DELETE USING (auth.uid() = user_id);


-- Create loans table
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('taken', 'provided')),
    person TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    remaining_amount NUMERIC(10, 2) NOT NULL CHECK (remaining_amount >= 0),
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    notes TEXT,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'settled')),
    payments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Loans Policies
CREATE POLICY "Users can view own loans" ON public.loans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" ON public.loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans" ON public.loans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans" ON public.loans
  FOR DELETE USING (auth.uid() = user_id);


-- =========================================================================
-- DATABASE TRIGGERS FOR BALANCES
-- =========================================================================

-- A. Deposit Balance Triggers
CREATE OR REPLACE FUNCTION public.adjust_balance_on_deposit_insert()
RETURNS trigger AS $$
BEGIN
  UPDATE public.accounts
  SET balance = balance + NEW.amount
  WHERE id = NEW.to_account_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_deposit_insert
  AFTER INSERT ON public.deposits
  FOR EACH ROW EXECUTE PROCEDURE public.adjust_balance_on_deposit_insert();

CREATE OR REPLACE FUNCTION public.adjust_balance_on_deposit_update()
RETURNS trigger AS $$
BEGIN
  IF OLD.to_account_id = NEW.to_account_id THEN
    UPDATE public.accounts
    SET balance = balance - OLD.amount + NEW.amount
    WHERE id = NEW.to_account_id;
  ELSE
    UPDATE public.accounts
    SET balance = balance - OLD.amount
    WHERE id = OLD.to_account_id;
    UPDATE public.accounts
    SET balance = balance + NEW.amount
    WHERE id = NEW.to_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_deposit_update
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE PROCEDURE public.adjust_balance_on_deposit_update();

CREATE OR REPLACE FUNCTION public.adjust_balance_on_deposit_delete()
RETURNS trigger AS $$
BEGIN
  UPDATE public.accounts
  SET balance = balance - OLD.amount
  WHERE id = OLD.to_account_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_deposit_delete
  AFTER DELETE ON public.deposits
  FOR EACH ROW EXECUTE PROCEDURE public.adjust_balance_on_deposit_delete();


-- B. Loan Balance Triggers
CREATE OR REPLACE FUNCTION public.adjust_balance_on_loan_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'taken' THEN
    UPDATE public.accounts
    SET balance = balance + NEW.amount
    WHERE id = NEW.account_id;
  ELSE
    UPDATE public.accounts
    SET balance = balance - NEW.amount
    WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_loan_insert
  AFTER INSERT ON public.loans
  FOR EACH ROW EXECUTE PROCEDURE public.adjust_balance_on_loan_insert();

CREATE OR REPLACE FUNCTION public.adjust_balance_on_loan_update()
RETURNS trigger AS $$
DECLARE
  old_factor NUMERIC;
  new_factor NUMERIC;
BEGIN
  IF OLD.type = 'taken' THEN old_factor := 1; ELSE old_factor := -1; END IF;
  IF NEW.type = 'taken' THEN new_factor := 1; ELSE new_factor := -1; END IF;

  IF OLD.account_id = NEW.account_id THEN
    UPDATE public.accounts
    SET balance = balance - (OLD.amount * old_factor) + (NEW.amount * new_factor)
    WHERE id = NEW.account_id;
  ELSE
    UPDATE public.accounts
    SET balance = balance - (OLD.amount * old_factor)
    WHERE id = OLD.account_id;
    UPDATE public.accounts
    SET balance = balance + (NEW.amount * new_factor)
    WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_loan_update
  AFTER UPDATE ON public.loans
  FOR EACH ROW EXECUTE PROCEDURE public.adjust_balance_on_loan_update();

CREATE OR REPLACE FUNCTION public.adjust_balance_on_loan_delete()
RETURNS trigger AS $$
DECLARE
  factor NUMERIC;
  payment_rec RECORD;
BEGIN
  IF OLD.type = 'taken' THEN factor := 1; ELSE factor := -1; END IF;
  
  UPDATE public.accounts
  SET balance = balance - (OLD.amount * factor)
  WHERE id = OLD.account_id;
  
  IF OLD.payments IS NOT NULL AND jsonb_array_length(OLD.payments) > 0 THEN
    FOR payment_rec IN 
      SELECT (value->>'amount')::NUMERIC AS amt, (value->>'account_id')::UUID AS acc_id
      FROM jsonb_array_elements(OLD.payments)
    LOOP
      IF OLD.type = 'taken' THEN
        UPDATE public.accounts
        SET balance = balance + payment_rec.amt
        WHERE id = payment_rec.acc_id;
      ELSE
        UPDATE public.accounts
        SET balance = balance - payment_rec.amt
        WHERE id = payment_rec.acc_id;
      END IF;
    END LOOP;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_loan_delete
  AFTER DELETE ON public.loans
  FOR EACH ROW EXECUTE PROCEDURE public.adjust_balance_on_loan_delete();
