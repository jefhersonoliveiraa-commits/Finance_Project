-- Import memory for auto-categorization suggestions
CREATE TABLE IF NOT EXISTS import_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description_pattern text NOT NULL,
  method text NOT NULL CHECK (method IN ('credit_card', 'pix', 'debit', 'cash')),
  type text NOT NULL CHECK (type IN ('mine', 'repasse', 'rateado')),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  credit_card_id uuid REFERENCES credit_cards(id) ON DELETE SET NULL,
  use_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE import_memory ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "select_own_import_memory" ON import_memory FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_own_import_memory" ON import_memory FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_own_import_memory" ON import_memory FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_own_import_memory" ON import_memory FOR DELETE
  TO authenticated USING (true);

-- Index for faster pattern matching
CREATE INDEX idx_import_memory_description ON import_memory USING gin (to_tsvector('simple', description_pattern));
