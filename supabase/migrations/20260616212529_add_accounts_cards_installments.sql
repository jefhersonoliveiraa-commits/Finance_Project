/*
# Add Bank Accounts, Credit Cards, Transfers, and Installment Support

## Summary
Extends the finance schema to support multiple bank accounts, multiple credit cards with
their own billing cycles, internal transfers between accounts, and installment (parcelamento)
purchases that spread across multiple billing months.

## New Tables

### bank_accounts
User's bank accounts (checking, savings, etc.), each with an auto-tracked balance.
- id, name, color, initial_balance, current_balance, created_at

### credit_cards
Credit card profiles with their billing cycle parameters.
- id, name, color, closing_day (1-31), due_day (1-31)
- bank_account_id: which account pays this card's bill
- credit_limit (optional)

### transfers
Internal transfers between user's own accounts. NOT counted as income or expense.
- id, date, description, amount, from_account_id, to_account_id

## Modified Tables

### transactions (new columns)
- bank_account_id: which bank account paid (for debit/pix/cash)
- credit_card_id: which credit card was used (for card purchases)
- purchase_date: when the item was actually bought (may differ from billing date)
- billing_year + billing_month: explicit billing cycle for card transactions
- installment_count: total number of installments (1 = no installments)
- installment_number: which installment this row represents (1-based)
- installment_group_id: UUID linking all installments of the same purchase

### incomes (new column)
- bank_account_id: which account received this income

## Security
All new tables use single-tenant RLS (anon + authenticated, USING true).
Consistent with the existing tables in this project.

## Important Notes
1. For credit card transactions: `date` field is set to the billing due date
   so existing date-range queries naturally group them by billing month.
2. `purchase_date` captures when the actual purchase occurred.
3. `current_balance` on bank_accounts is updated incrementally via application logic.
4. Transfers explicitly exclude themselves from income/expense totals.
*/

-- BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  initial_balance numeric(12,2) NOT NULL DEFAULT 0,
  current_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- CREDIT CARDS
CREATE TABLE IF NOT EXISTS credit_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#8b5cf6',
  closing_day integer NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  credit_limit numeric(12,2),
  created_at timestamptz DEFAULT now()
);

-- INTERNAL TRANSFERS
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  description text NOT NULL DEFAULT 'Transferência interna',
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  from_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  to_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CHECK (from_account_id <> to_account_id)
);

-- ALTER TRANSACTIONS
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_card_id uuid REFERENCES credit_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_date date,
  ADD COLUMN IF NOT EXISTS billing_year integer,
  ADD COLUMN IF NOT EXISTS billing_month integer,
  ADD COLUMN IF NOT EXISTS installment_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_group_id uuid;

-- ALTER INCOMES
ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_billing ON transactions(billing_year, billing_month)
  WHERE billing_year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_installment_group ON transactions(installment_group_id)
  WHERE installment_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account_id)
  WHERE bank_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_credit_card ON transactions(credit_card_id)
  WHERE credit_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);

-- RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bank_accounts" ON bank_accounts;
CREATE POLICY "anon_select_bank_accounts" ON bank_accounts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bank_accounts" ON bank_accounts;
CREATE POLICY "anon_insert_bank_accounts" ON bank_accounts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bank_accounts" ON bank_accounts;
CREATE POLICY "anon_update_bank_accounts" ON bank_accounts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_bank_accounts" ON bank_accounts;
CREATE POLICY "anon_delete_bank_accounts" ON bank_accounts FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_credit_cards" ON credit_cards;
CREATE POLICY "anon_select_credit_cards" ON credit_cards FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_credit_cards" ON credit_cards;
CREATE POLICY "anon_insert_credit_cards" ON credit_cards FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_credit_cards" ON credit_cards;
CREATE POLICY "anon_update_credit_cards" ON credit_cards FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_credit_cards" ON credit_cards;
CREATE POLICY "anon_delete_credit_cards" ON credit_cards FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_transfers" ON transfers;
CREATE POLICY "anon_select_transfers" ON transfers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transfers" ON transfers;
CREATE POLICY "anon_insert_transfers" ON transfers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transfers" ON transfers;
CREATE POLICY "anon_update_transfers" ON transfers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transfers" ON transfers;
CREATE POLICY "anon_delete_transfers" ON transfers FOR DELETE TO anon, authenticated USING (true);
