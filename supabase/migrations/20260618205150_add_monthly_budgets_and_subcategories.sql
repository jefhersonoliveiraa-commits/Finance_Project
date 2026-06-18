/*
# Monthly Budget Limits + Subcategories

## Changes to budget_limits
- Add year and month columns to make limits per-month
- Drop old unique constraint on category_id alone
- Add new unique constraint on (category_id, year, month)
- Backfill existing rows with current year/month

## New table: subcategories
- Allows categories to have sub-groupings (e.g. Alimentação > Supermercado, Delivery)
- Each subcategory belongs to one parent category

## Changes to transactions
- Add subcategory_id column for optional finer categorization
*/

-- Add year/month to budget_limits
ALTER TABLE budget_limits
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS month integer;

-- Backfill existing rows with current year/month
UPDATE budget_limits
  SET year = EXTRACT(YEAR FROM now())::integer,
      month = EXTRACT(MONTH FROM now())::integer
  WHERE year IS NULL;

-- Make year/month NOT NULL after backfill
ALTER TABLE budget_limits
  ALTER COLUMN year SET NOT NULL,
  ALTER COLUMN month SET NOT NULL;

-- Drop old unique constraint and add new one
ALTER TABLE budget_limits DROP CONSTRAINT IF EXISTS budget_limits_category_id_key;
ALTER TABLE budget_limits ADD CONSTRAINT budget_limits_category_year_month_key UNIQUE(category_id, year, month);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);

-- Add subcategory_id to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES subcategories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_subcategory ON transactions(subcategory_id)
  WHERE subcategory_id IS NOT NULL;

-- RLS for subcategories (single-tenant, open access)
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_subcategories" ON subcategories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_subcategories" ON subcategories FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_subcategories" ON subcategories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_subcategories" ON subcategories FOR DELETE TO anon, authenticated USING (true);
