
/*
# Fix RLS: Add user_id ownership to all tables

Replaces all always-true anon/authenticated policies with owner-scoped policies.
Adds user_id to every table, backfills existing rows to the first auth user,
then enforces NOT NULL. Recreates 4-policy sets scoped to authenticated only.
*/

-- ── Helper: backfill + NOT NULL in two steps ──────────────────────────────

DO $$ DECLARE v_uid uuid; BEGIN
  SELECT id INTO v_uid FROM auth.users LIMIT 1;

  -- bank_accounts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bank_accounts' AND column_name='user_id') THEN
    ALTER TABLE bank_accounts ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE bank_accounts SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE bank_accounts ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE bank_accounts ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- credit_cards
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='credit_cards' AND column_name='user_id') THEN
    ALTER TABLE credit_cards ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE credit_cards SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE credit_cards ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE credit_cards ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- categories
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='user_id') THEN
    ALTER TABLE categories ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE categories SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE categories ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE categories ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- subcategories
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subcategories' AND column_name='user_id') THEN
    ALTER TABLE subcategories ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE subcategories SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE subcategories ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE subcategories ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- people
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='people' AND column_name='user_id') THEN
    ALTER TABLE people ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE people SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE people ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE people ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- transactions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_id') THEN
    ALTER TABLE transactions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE transactions SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE transactions ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- incomes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incomes' AND column_name='user_id') THEN
    ALTER TABLE incomes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE incomes SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE incomes ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE incomes ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- transfers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transfers' AND column_name='user_id') THEN
    ALTER TABLE transfers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE transfers SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE transfers ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE transfers ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- card_bill_payments
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='card_bill_payments' AND column_name='user_id') THEN
    ALTER TABLE card_bill_payments ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE card_bill_payments SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE card_bill_payments ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE card_bill_payments ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- budget_limits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='budget_limits' AND column_name='user_id') THEN
    ALTER TABLE budget_limits ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE budget_limits SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE budget_limits ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE budget_limits ALTER COLUMN user_id SET DEFAULT auth.uid();

  -- import_memory
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_memory' AND column_name='user_id') THEN
    ALTER TABLE import_memory ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  UPDATE import_memory SET user_id = v_uid WHERE user_id IS NULL;
  ALTER TABLE import_memory ALTER COLUMN user_id SET NOT NULL;
  ALTER TABLE import_memory ALTER COLUMN user_id SET DEFAULT auth.uid();
END $$;

-- ── Drop all existing permissive policies ─────────────────────────────────

DROP POLICY IF EXISTS "anon_select_bank_accounts"       ON bank_accounts;
DROP POLICY IF EXISTS "anon_insert_bank_accounts"       ON bank_accounts;
DROP POLICY IF EXISTS "anon_update_bank_accounts"       ON bank_accounts;
DROP POLICY IF EXISTS "anon_delete_bank_accounts"       ON bank_accounts;
DROP POLICY IF EXISTS "select_own_bank_accounts"        ON bank_accounts;
DROP POLICY IF EXISTS "insert_own_bank_accounts"        ON bank_accounts;
DROP POLICY IF EXISTS "update_own_bank_accounts"        ON bank_accounts;
DROP POLICY IF EXISTS "delete_own_bank_accounts"        ON bank_accounts;

DROP POLICY IF EXISTS "anon_select_credit_cards"        ON credit_cards;
DROP POLICY IF EXISTS "anon_insert_credit_cards"        ON credit_cards;
DROP POLICY IF EXISTS "anon_update_credit_cards"        ON credit_cards;
DROP POLICY IF EXISTS "anon_delete_credit_cards"        ON credit_cards;
DROP POLICY IF EXISTS "select_own_credit_cards"         ON credit_cards;
DROP POLICY IF EXISTS "insert_own_credit_cards"         ON credit_cards;
DROP POLICY IF EXISTS "update_own_credit_cards"         ON credit_cards;
DROP POLICY IF EXISTS "delete_own_credit_cards"         ON credit_cards;

DROP POLICY IF EXISTS "anon_select_categories"          ON categories;
DROP POLICY IF EXISTS "anon_insert_categories"          ON categories;
DROP POLICY IF EXISTS "anon_update_categories"          ON categories;
DROP POLICY IF EXISTS "anon_delete_categories"          ON categories;
DROP POLICY IF EXISTS "select_own_categories"           ON categories;
DROP POLICY IF EXISTS "insert_own_categories"           ON categories;
DROP POLICY IF EXISTS "update_own_categories"           ON categories;
DROP POLICY IF EXISTS "delete_own_categories"           ON categories;

DROP POLICY IF EXISTS "anon_select_subcategories"       ON subcategories;
DROP POLICY IF EXISTS "anon_insert_subcategories"       ON subcategories;
DROP POLICY IF EXISTS "anon_update_subcategories"       ON subcategories;
DROP POLICY IF EXISTS "anon_delete_subcategories"       ON subcategories;
DROP POLICY IF EXISTS "select_own_subcategories"        ON subcategories;
DROP POLICY IF EXISTS "insert_own_subcategories"        ON subcategories;
DROP POLICY IF EXISTS "update_own_subcategories"        ON subcategories;
DROP POLICY IF EXISTS "delete_own_subcategories"        ON subcategories;

DROP POLICY IF EXISTS "anon_select_people"              ON people;
DROP POLICY IF EXISTS "anon_insert_people"              ON people;
DROP POLICY IF EXISTS "anon_update_people"              ON people;
DROP POLICY IF EXISTS "anon_delete_people"              ON people;
DROP POLICY IF EXISTS "select_own_people"               ON people;
DROP POLICY IF EXISTS "insert_own_people"               ON people;
DROP POLICY IF EXISTS "update_own_people"               ON people;
DROP POLICY IF EXISTS "delete_own_people"               ON people;

DROP POLICY IF EXISTS "anon_select_transactions"        ON transactions;
DROP POLICY IF EXISTS "anon_insert_transactions"        ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions"        ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions"        ON transactions;
DROP POLICY IF EXISTS "select_own_transactions"         ON transactions;
DROP POLICY IF EXISTS "insert_own_transactions"         ON transactions;
DROP POLICY IF EXISTS "update_own_transactions"         ON transactions;
DROP POLICY IF EXISTS "delete_own_transactions"         ON transactions;

DROP POLICY IF EXISTS "anon_select_transaction_people"  ON transaction_people;
DROP POLICY IF EXISTS "anon_insert_transaction_people"  ON transaction_people;
DROP POLICY IF EXISTS "anon_update_transaction_people"  ON transaction_people;
DROP POLICY IF EXISTS "anon_delete_transaction_people"  ON transaction_people;
DROP POLICY IF EXISTS "select_own_transaction_people"   ON transaction_people;
DROP POLICY IF EXISTS "insert_own_transaction_people"   ON transaction_people;
DROP POLICY IF EXISTS "update_own_transaction_people"   ON transaction_people;
DROP POLICY IF EXISTS "delete_own_transaction_people"   ON transaction_people;

DROP POLICY IF EXISTS "anon_select_incomes"             ON incomes;
DROP POLICY IF EXISTS "anon_insert_incomes"             ON incomes;
DROP POLICY IF EXISTS "anon_update_incomes"             ON incomes;
DROP POLICY IF EXISTS "anon_delete_incomes"             ON incomes;
DROP POLICY IF EXISTS "select_own_incomes"              ON incomes;
DROP POLICY IF EXISTS "insert_own_incomes"              ON incomes;
DROP POLICY IF EXISTS "update_own_incomes"              ON incomes;
DROP POLICY IF EXISTS "delete_own_incomes"              ON incomes;

DROP POLICY IF EXISTS "anon_select_transfers"           ON transfers;
DROP POLICY IF EXISTS "anon_insert_transfers"           ON transfers;
DROP POLICY IF EXISTS "anon_update_transfers"           ON transfers;
DROP POLICY IF EXISTS "anon_delete_transfers"           ON transfers;
DROP POLICY IF EXISTS "select_own_transfers"            ON transfers;
DROP POLICY IF EXISTS "insert_own_transfers"            ON transfers;
DROP POLICY IF EXISTS "update_own_transfers"            ON transfers;
DROP POLICY IF EXISTS "delete_own_transfers"            ON transfers;

DROP POLICY IF EXISTS "anon_select_card_bill_payments"  ON card_bill_payments;
DROP POLICY IF EXISTS "anon_insert_card_bill_payments"  ON card_bill_payments;
DROP POLICY IF EXISTS "anon_update_card_bill_payments"  ON card_bill_payments;
DROP POLICY IF EXISTS "anon_delete_card_bill_payments"  ON card_bill_payments;
DROP POLICY IF EXISTS "select_own_card_bill_payments"   ON card_bill_payments;
DROP POLICY IF EXISTS "insert_own_card_bill_payments"   ON card_bill_payments;
DROP POLICY IF EXISTS "update_own_card_bill_payments"   ON card_bill_payments;
DROP POLICY IF EXISTS "delete_own_card_bill_payments"   ON card_bill_payments;

DROP POLICY IF EXISTS "anon_select_budget_limits"       ON budget_limits;
DROP POLICY IF EXISTS "anon_insert_budget_limits"       ON budget_limits;
DROP POLICY IF EXISTS "anon_update_budget_limits"       ON budget_limits;
DROP POLICY IF EXISTS "anon_delete_budget_limits"       ON budget_limits;
DROP POLICY IF EXISTS "select_own_budget_limits"        ON budget_limits;
DROP POLICY IF EXISTS "insert_own_budget_limits"        ON budget_limits;
DROP POLICY IF EXISTS "update_own_budget_limits"        ON budget_limits;
DROP POLICY IF EXISTS "delete_own_budget_limits"        ON budget_limits;

DROP POLICY IF EXISTS "select_own_import_memory"        ON import_memory;
DROP POLICY IF EXISTS "insert_own_import_memory"        ON import_memory;
DROP POLICY IF EXISTS "update_own_import_memory"        ON import_memory;
DROP POLICY IF EXISTS "delete_own_import_memory"        ON import_memory;

-- ── Recreate owner-scoped policies ───────────────────────────────────────

CREATE POLICY "select_own_bank_accounts" ON bank_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bank_accounts" ON bank_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bank_accounts" ON bank_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_bank_accounts" ON bank_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_credit_cards" ON credit_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_credit_cards" ON credit_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_credit_cards" ON credit_cards FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_credit_cards" ON credit_cards FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_categories" ON categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_categories" ON categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_categories" ON categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_categories" ON categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_subcategories" ON subcategories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_subcategories" ON subcategories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_subcategories" ON subcategories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_subcategories" ON subcategories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_people" ON people FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_people" ON people FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_people" ON people FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_people" ON people FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_transactions" ON transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_transaction_people" ON transaction_people FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()));
CREATE POLICY "insert_own_transaction_people" ON transaction_people FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()));
CREATE POLICY "update_own_transaction_people" ON transaction_people FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()));
CREATE POLICY "delete_own_transaction_people" ON transaction_people FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()));

CREATE POLICY "select_own_incomes" ON incomes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_incomes" ON incomes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_incomes" ON incomes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_incomes" ON incomes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_transfers" ON transfers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_transfers" ON transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_transfers" ON transfers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_transfers" ON transfers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_card_bill_payments" ON card_bill_payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_card_bill_payments" ON card_bill_payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_card_bill_payments" ON card_bill_payments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_card_bill_payments" ON card_bill_payments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_budget_limits" ON budget_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_budget_limits" ON budget_limits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_budget_limits" ON budget_limits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_budget_limits" ON budget_limits FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "select_own_import_memory" ON import_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_import_memory" ON import_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_import_memory" ON import_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_import_memory" ON import_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);
