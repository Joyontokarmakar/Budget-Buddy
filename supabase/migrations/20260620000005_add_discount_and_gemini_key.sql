-- Migration: Add discount column to expenses and gemini_api_key to profiles
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
