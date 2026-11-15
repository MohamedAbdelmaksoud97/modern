BEGIN;
CREATE OR REPLACE FUNCTION modern.check_finance() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE contract numeric; total numeric;
BEGIN
 SELECT contract_value INTO contract FROM modern.projects WHERE id=NEW.project_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Project is inaccessible' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='payments' THEN
  SELECT coalesce(sum(amount),0) INTO total FROM modern.payments WHERE project_id=NEW.project_id;
  IF total+NEW.amount>contract THEN RAISE EXCEPTION 'Payment exceeds contract' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='quotations' THEN
  SELECT coalesce(sum(amount),0) INTO total FROM modern.payments WHERE project_id=NEW.project_id;
  IF NEW.amount<total THEN RAISE EXCEPTION 'Quotation is below received payments' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='allocations' THEN
  SELECT coalesce(sum(percentage),0) INTO total FROM modern.allocations WHERE project_id=NEW.project_id;
  IF total+NEW.percentage>100 THEN RAISE EXCEPTION 'Allocations exceed 100 percent' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION modern.check_finance() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER payments_integrity BEFORE INSERT ON modern.payments FOR EACH ROW EXECUTE FUNCTION modern.check_finance();
CREATE TRIGGER quotations_integrity BEFORE INSERT ON modern.quotations FOR EACH ROW EXECUTE FUNCTION modern.check_finance();
CREATE TRIGGER allocations_integrity BEFORE INSERT ON modern.allocations FOR EACH ROW EXECUTE FUNCTION modern.check_finance();
COMMIT;
