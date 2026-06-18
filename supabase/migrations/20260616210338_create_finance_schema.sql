/*
# Personal Finance App Schema

## Summary
Creates the full schema for a single-user personal finance tracker with BRL currency.

## New Tables

### categories
Spending categories with name and color for visual grouping.
- id (uuid, pk)
- name (text) — display name
- color (text) — hex color string
- created_at (timestamptz)

### people
People involved in repasse/rateado transactions.
- id (uuid, pk)
- name (text) — person's name
- created_at (timestamptz)

### incomes
Income entries (salary and other revenue) with optional monthly recurrence.
- id (uuid, pk)
- date (date) — income date
- description (text) — income source description
- amount (numeric 10,2) — income value in BRL
- is_recurring (boolean) — if true, repeats monthly
- recurring_day (integer) — day of month for recurring
- recurring_group_id (uuid) — links all instances of the same recurring income
- created_at (timestamptz)

### transactions
Expense entries. Each has a total amount and a "my_amount" (the portion the user actually bears).
- id (uuid, pk)
- date (date) — transaction date
- description (text)
- amount (numeric 10,2) — total paid (regardless of who owes what)
- my_amount (numeric 10,2) — only the user's actual expense
- method (text) — one of: credit_card, pix, debit, cash
- type (text) — one of: mine (100% user), repasse (0% user, full reimbursed), rateado (split)
- category_id (uuid, fk → categories) — nullable
- is_recurring (boolean)
- recurring_day (integer)
- recurring_group_id (uuid) — links all instances of the same recurring transaction
- notes (text) — optional notes
- created_at (timestamptz)

### transaction_people
Tracks which people owe money for repasse/rateado transactions.
- id (uuid, pk)
- transaction_id (uuid, fk → transactions, cascade delete)
- person_id (uuid, fk → people, cascade delete)
- amount (numeric 10,2) — how much this person owes
- reimbursement_status (text) — pending or received
- received_at (timestamptz) — when marked as received
- created_at (timestamptz)

## Security
Single-tenant app (no auth). RLS enabled on all tables with open anon + authenticated policies.
All data is owned by the single user of this personal finance tool.

## Seed Data
Default categories are inserted for immediate usability.
*/

-- TABLES

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_day integer,
  recurring_group_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL,
  my_amount numeric(10,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('credit_card', 'pix', 'debit', 'cash')),
  type text NOT NULL CHECK (type IN ('mine', 'repasse', 'rateado')),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  recurring_day integer,
  recurring_group_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  reimbursement_status text NOT NULL DEFAULT 'pending' CHECK (reimbursement_status IN ('pending', 'received')),
  received_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- INDEXES

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_group ON transactions(recurring_group_id) WHERE recurring_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transaction_people_transaction ON transaction_people(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_people_person ON transaction_people(person_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_incomes_recurring_group ON incomes(recurring_group_id) WHERE recurring_group_id IS NOT NULL;

-- RLS (single-tenant: open access for anon + authenticated)

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_people" ON people;
CREATE POLICY "anon_select_people" ON people FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_people" ON people;
CREATE POLICY "anon_insert_people" ON people FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_people" ON people;
CREATE POLICY "anon_update_people" ON people FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_people" ON people;
CREATE POLICY "anon_delete_people" ON people FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_incomes" ON incomes;
CREATE POLICY "anon_select_incomes" ON incomes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_incomes" ON incomes;
CREATE POLICY "anon_insert_incomes" ON incomes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_incomes" ON incomes;
CREATE POLICY "anon_update_incomes" ON incomes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_incomes" ON incomes;
CREATE POLICY "anon_delete_incomes" ON incomes FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_transaction_people" ON transaction_people;
CREATE POLICY "anon_select_transaction_people" ON transaction_people FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transaction_people" ON transaction_people;
CREATE POLICY "anon_insert_transaction_people" ON transaction_people FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transaction_people" ON transaction_people;
CREATE POLICY "anon_update_transaction_people" ON transaction_people FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transaction_people" ON transaction_people;
CREATE POLICY "anon_delete_transaction_people" ON transaction_people FOR DELETE TO anon, authenticated USING (true);

-- SEED DATA: default categories
INSERT INTO categories (name, color) VALUES
  ('Alimentação', '#f97316'),
  ('Transporte', '#3b82f6'),
  ('Saúde', '#22c55e'),
  ('Moradia', '#8b5cf6'),
  ('Lazer', '#ec4899'),
  ('Educação', '#14b8a6'),
  ('Vestuário', '#f59e0b'),
  ('Outros', '#6b7280');
