#!/bin/bash
# Re-create the file up to line 584, then append the fixed lines, then the rest
head -n 584 supabase_schema.sql > temp.sql
cat << 'INNER_EOF' >> temp.sql
DROP POLICY IF EXISTS "Public sign pending agreements" ON agreements;
CREATE POLICY "Public sign pending agreements" ON agreements
  FOR UPDATE USING (status = 'pending') WITH CHECK (status IN ('pending', 'signed', 'completed'));
-- 7. Digital Forms
-- 8. Expenses
INNER_EOF
tail -n +592 supabase_schema.sql >> temp.sql
mv temp.sql supabase_schema.sql
