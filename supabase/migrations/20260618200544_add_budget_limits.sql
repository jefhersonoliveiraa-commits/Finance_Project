CREATE TABLE budget_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monthly_limit numeric(12, 2) NOT NULL CHECK (monthly_limit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_budget_limits" ON budget_limits FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_budget_limits" ON budget_limits FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_budget_limits" ON budget_limits FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_budget_limits" ON budget_limits FOR DELETE
  TO authenticated USING (true);
