-- Migration: Add Discount category
INSERT INTO public.categories (name, icon, color)
SELECT 'Discount', 'Percent', '#10b981'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE user_id IS NULL AND name = 'Discount'
);
