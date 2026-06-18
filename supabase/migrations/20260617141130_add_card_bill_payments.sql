-- Table to track credit card bill payments
-- When a user pays a card bill, it records the payment and deducts from the linked bank account.

CREATE TABLE IF NOT EXISTS card_bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id uuid NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  billing_year integer NOT NULL,
  billing_month integer NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  paid_at timestamptz DEFAULT now(),
  UNIQUE (credit_card_id, billing_year, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_card_bill_payments_card ON card_bill_payments(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_card_bill_payments_period ON card_bill_payments(billing_year, billing_month);

ALTER TABLE card_bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_card_bill_payments" ON card_bill_payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_card_bill_payments" ON card_bill_payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_card_bill_payments" ON card_bill_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_card_bill_payments" ON card_bill_payments FOR DELETE TO anon, authenticated USING (true);
