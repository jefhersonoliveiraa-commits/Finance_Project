DROP POLICY IF EXISTS "select_budget_limits" ON budget_limits;
DROP POLICY IF EXISTS "insert_budget_limits" ON budget_limits;
DROP POLICY IF EXISTS "update_budget_limits" ON budget_limits;
DROP POLICY IF EXISTS "delete_budget_limits" ON budget_limits;

CREATE POLICY "anon_select_budget_limits" ON budget_limits FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_budget_limits" ON budget_limits FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_budget_limits" ON budget_limits FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_budget_limits" ON budget_limits FOR DELETE
  TO anon, authenticated USING (true);
