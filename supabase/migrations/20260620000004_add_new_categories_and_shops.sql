-- Add new default categories
INSERT INTO public.categories (name, icon, color)
SELECT name, icon, color FROM (VALUES
  ('Cosmetics', 'Sparkles', '#d946ef'),
  ('Medicine', 'Activity', '#14b8a6'),
  ('Book', 'BookOpen', '#a855f7'),
  ('Electronic', 'Laptop', '#0ea5e9')
) AS new_cats(name, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE user_id IS NULL AND name = new_cats.name
);

-- Add new default stores
INSERT INTO public.stores (name)
SELECT name FROM (VALUES
  ('Netto'),
  ('Delhi Masala'),
  ('Bollywood shop'),
  ('Fleischerei'),
  ('7 days curry & Pizza'),
  ('Allan Pizza')
) AS new_stores(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.stores WHERE user_id IS NULL AND name = new_stores.name
);
