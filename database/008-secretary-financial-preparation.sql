BEGIN;
DROP POLICY finance_insert ON modern.quotations;
CREATE POLICY finance_insert ON modern.quotations FOR INSERT TO modern_app WITH CHECK(modern.actor_role() IN ('manager','secretary','accountant'));
DROP POLICY finance_insert ON modern.allocations;
CREATE POLICY finance_insert ON modern.allocations FOR INSERT TO modern_app WITH CHECK(modern.actor_role() IN ('manager','secretary','accountant'));
DROP POLICY allocations_delete ON modern.allocations;
CREATE POLICY allocations_delete ON modern.allocations FOR DELETE TO modern_app USING(modern.actor_role() IN ('manager','secretary','accountant'));
COMMIT;
