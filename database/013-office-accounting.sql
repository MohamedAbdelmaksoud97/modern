BEGIN;

CREATE TABLE modern.ledger_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  opening_date date,
  closed_through date CHECK (closed_through >= opening_date)
);
INSERT INTO modern.ledger_settings DEFAULT VALUES;

CREATE TABLE modern.office_identity (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  name_ar text NOT NULL DEFAULT 'مودرن للاستشارات الهندسية',
  name_en text NOT NULL DEFAULT 'Modern Engineering Consultants',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '+965 5176 4655',
  email text NOT NULL DEFAULT '',
  registration text NOT NULL DEFAULT '',
  payment_instructions text NOT NULL DEFAULT ''
);
INSERT INTO modern.office_identity DEFAULT VALUES;

CREATE TABLE modern.ledger_accounts (
  code text PRIMARY KEY CHECK (code ~ '^[0-9]{4,8}$'),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('cash','bank','receivable','payable','advance','asset','liability','equity','income','expense'))
);
INSERT INTO modern.ledger_accounts VALUES
  ('1010','الخزنة الرئيسية','Main cash account','cash'),
  ('1020','البنك الرئيسي','Main bank account','bank'),
  ('1100','ذمم العملاء','Accounts receivable','receivable'),
  ('2100','ذمم الموردين','Accounts payable','payable'),
  ('2200','مقدمات العملاء','Customer advances','advance'),
  ('3000','الأرصدة الافتتاحية','Opening equity','equity'),
  ('4000','إيرادات الخدمات الهندسية','Engineering service income','income'),
  ('5000','تكاليف المشاريع','Project costs','expense'),
  ('5100','مصروفات المكتب','Office expenses','expense'),
  ('5200','الرواتب والأجور','Payroll expense','expense'),
  ('2210','رواتب مستحقة','Payroll payable','liability');

CREATE TABLE modern.ledger_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT ''
);
CREATE TABLE modern.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  accounting_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('opening','invoice','vendor_bill','receipt','allocation','vendor_payment','expense','transfer','payroll','adjustment','credit','reversal','refund')),
  description text NOT NULL,
  reference text NOT NULL DEFAULT '',
  actor_id uuid NOT NULL REFERENCES modern.users(id),
  reverses_id uuid UNIQUE REFERENCES modern.ledger_entries(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind='reversal')=(reverses_id IS NOT NULL))
);
CREATE INDEX ledger_entries_date_idx ON modern.ledger_entries(accounting_date,entry_no);
CREATE TABLE modern.ledger_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES modern.ledger_entries(id),
  account_code text NOT NULL REFERENCES modern.ledger_accounts(code),
  amount numeric(14,3) NOT NULL CHECK (amount<>0),
  project_id uuid REFERENCES modern.projects(id),
  client_id uuid REFERENCES modern.clients(id),
  vendor_id uuid REFERENCES modern.ledger_vendors(id),
  CHECK (client_id IS NULL OR vendor_id IS NULL)
);
CREATE INDEX ledger_lines_entry_idx ON modern.ledger_lines(entry_id);
CREATE INDEX ledger_lines_account_idx ON modern.ledger_lines(account_code,entry_id);
CREATE INDEX ledger_lines_project_idx ON modern.ledger_lines(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX ledger_lines_client_idx ON modern.ledger_lines(client_id,account_code) WHERE client_id IS NOT NULL;
CREATE INDEX ledger_lines_vendor_idx ON modern.ledger_lines(vendor_id,account_code) WHERE vendor_id IS NOT NULL;

CREATE TABLE modern.ledger_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('sale','purchase')),
  client_id uuid REFERENCES modern.clients(id),
  vendor_id uuid REFERENCES modern.ledger_vendors(id),
  project_id uuid REFERENCES modern.projects(id),
  allocation_stage integer CHECK (allocation_stage BETWEEN 0 AND 9),
  account_code text NOT NULL REFERENCES modern.ledger_accounts(code),
  issue_date date NOT NULL,
  due_date date NOT NULL,
  number text UNIQUE,
  external_ref text NOT NULL DEFAULT '',
  party_name text NOT NULL,
  items jsonb NOT NULL CHECK (jsonb_typeof(items)='array' AND jsonb_array_length(items)>0),
  total numeric(14,3) NOT NULL CHECK (total>0),
  notes text NOT NULL DEFAULT '',
  opening boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','reversed','cancelled')),
  entry_id uuid UNIQUE REFERENCES modern.ledger_entries(id),
  office_snapshot jsonb,
  CHECK ((direction='sale' AND client_id IS NOT NULL AND vendor_id IS NULL) OR
         (direction='purchase' AND vendor_id IS NOT NULL AND client_id IS NULL)),
  CHECK (opening OR due_date >= issue_date),
  CHECK ((number IS NOT NULL AND entry_id IS NOT NULL AND office_snapshot IS NOT NULL)=(status IN ('posted','reversed')))
);
CREATE INDEX ledger_documents_project_idx ON modern.ledger_documents(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX ledger_documents_date_idx ON modern.ledger_documents(issue_date,due_date);
CREATE UNIQUE INDEX ledger_vendor_external_ref ON modern.ledger_documents(vendor_id,lower(external_ref))
  WHERE direction='purchase' AND status IN ('draft','posted') AND external_ref<>'';
CREATE UNIQUE INDEX ledger_contract_installment ON modern.ledger_documents(project_id,allocation_stage)
  WHERE direction='sale' AND status='posted' AND allocation_stage IS NOT NULL;

CREATE TABLE modern.ledger_settlements (
  entry_id uuid NOT NULL REFERENCES modern.ledger_entries(id),
  document_id uuid NOT NULL REFERENCES modern.ledger_documents(id),
  amount numeric(14,3) NOT NULL CHECK (amount<>0),
  kind text NOT NULL CHECK (kind IN ('payment','credit')),
  PRIMARY KEY (entry_id,document_id)
);
CREATE INDEX ledger_settlements_document_idx ON modern.ledger_settlements(document_id,entry_id);

CREATE TABLE modern.ledger_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL REFERENCES modern.ledger_accounts(code),
  statement_date date NOT NULL,
  statement_balance numeric(14,3) NOT NULL,
  book_balance numeric(14,3) NOT NULL,
  cleared_balance numeric(14,3) NOT NULL,
  notes text NOT NULL DEFAULT '',
  actor_id uuid NOT NULL REFERENCES modern.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_reconciliations_account_idx ON modern.ledger_reconciliations(account_code,statement_date);
CREATE TABLE modern.ledger_reconciled_lines (
  line_id uuid PRIMARY KEY REFERENCES modern.ledger_lines(id),
  reconciliation_id uuid NOT NULL REFERENCES modern.ledger_reconciliations(id)
);

ALTER TABLE modern.inquiries
  ADD COLUMN converted_project_id uuid REFERENCES modern.projects(id),
  ADD COLUMN converted_at timestamptz;
CREATE UNIQUE INDEX inquiries_converted_project_idx ON modern.inquiries(converted_project_id) WHERE converted_project_id IS NOT NULL;

DO $$ DECLARE tab text;
BEGIN
  FOREACH tab IN ARRAY ARRAY['ledger_settings','office_identity','ledger_accounts','ledger_vendors','ledger_entries','ledger_lines','ledger_documents','ledger_settlements','ledger_reconciliations','ledger_reconciled_lines'] LOOP
    EXECUTE format('ALTER TABLE modern.%I ENABLE ROW LEVEL SECURITY',tab);
    EXECUTE format('REVOKE ALL ON modern.%I FROM PUBLIC,anon,authenticated',tab);
    EXECUTE format('GRANT SELECT ON modern.%I TO modern_app',tab);
    EXECUTE format('CREATE POLICY finance_read ON modern.%I FOR SELECT TO modern_app USING (modern.actor_role() IN (''manager'',''accountant''))',tab);
  END LOOP;
  FOREACH tab IN ARRAY ARRAY['ledger_accounts','ledger_vendors','ledger_entries','ledger_lines','ledger_documents','ledger_settlements','ledger_reconciliations','ledger_reconciled_lines'] LOOP
    EXECUTE format('GRANT INSERT ON modern.%I TO modern_app',tab);
    EXECUTE format('CREATE POLICY finance_insert ON modern.%I FOR INSERT TO modern_app WITH CHECK (modern.actor_role() IN (''manager'',''accountant''))',tab);
  END LOOP;
  FOREACH tab IN ARRAY ARRAY['ledger_entries','ledger_lines','ledger_settlements','ledger_reconciliations','ledger_reconciled_lines'] LOOP
    EXECUTE format('CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON modern.%I FOR EACH ROW EXECUTE FUNCTION modern.immutable_history()',tab);
  END LOOP;
END $$;
GRANT USAGE ON SEQUENCE modern.ledger_entries_entry_no_seq TO modern_app;
GRANT UPDATE ON modern.ledger_settings,modern.office_identity,modern.ledger_documents,modern.ledger_vendors TO modern_app;
CREATE POLICY settings_manager ON modern.ledger_settings FOR UPDATE TO modern_app USING (modern.actor_role()='manager') WITH CHECK (modern.actor_role()='manager');
CREATE POLICY identity_manager ON modern.office_identity FOR UPDATE TO modern_app USING (modern.actor_role()='manager') WITH CHECK (modern.actor_role()='manager');
CREATE POLICY documents_finance ON modern.ledger_documents FOR UPDATE TO modern_app USING (modern.actor_role() IN ('manager','accountant')) WITH CHECK (modern.actor_role() IN ('manager','accountant'));
CREATE POLICY vendors_finance ON modern.ledger_vendors FOR UPDATE TO modern_app USING (modern.actor_role() IN ('manager','accountant')) WITH CHECK (modern.actor_role() IN ('manager','accountant'));
CREATE POLICY invoice_portal_read ON modern.ledger_documents FOR SELECT TO modern_app USING (
  modern.actor_role()='client' AND direction='sale' AND status IN ('posted','reversed') AND modern.visible(project_id,'invoices')
);
CREATE POLICY invoice_settlements_portal_read ON modern.ledger_settlements FOR SELECT TO modern_app USING (
  modern.actor_role()='client' AND EXISTS (SELECT 1 FROM modern.ledger_documents d WHERE d.id=document_id)
);

CREATE FUNCTION modern.ledger_validate_entry() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE settings modern.ledger_settings%ROWTYPE;
BEGIN
  SELECT * INTO settings FROM modern.ledger_settings WHERE id;
  IF settings.opening_date IS NULL OR NEW.accounting_date < settings.opening_date OR NEW.accounting_date <= settings.closed_through THEN
    RAISE EXCEPTION 'Ledger date is outside an open period' USING ERRCODE='23514';
  END IF;
  IF NEW.actor_id <> modern.actor_id() OR
     (NEW.kind IN ('opening','adjustment','reversal','refund') AND modern.actor_role()<>'manager') THEN
    RAISE EXCEPTION 'Invalid ledger actor' USING ERRCODE='42501';
  END IF;
  IF NEW.kind='opening' AND NEW.accounting_date<>settings.opening_date THEN
    RAISE EXCEPTION 'Opening entry must use the opening date' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ledger_period BEFORE INSERT ON modern.ledger_entries FOR EACH ROW EXECUTE FUNCTION modern.ledger_validate_entry();

CREATE FUNCTION modern.ledger_check_balance() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE target uuid; n bigint; balance numeric;
BEGIN
  IF TG_TABLE_NAME='ledger_entries' THEN target := NEW.id;
  ELSE target := NEW.entry_id; END IF;
  SELECT count(*),coalesce(sum(amount),0) INTO n,balance FROM modern.ledger_lines WHERE entry_id=target;
  IF n<2 OR balance<>0 THEN RAISE EXCEPTION 'Unbalanced ledger entry' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER ledger_balanced_entry AFTER INSERT ON modern.ledger_entries DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION modern.ledger_check_balance();
CREATE CONSTRAINT TRIGGER ledger_balanced_lines AFTER INSERT ON modern.ledger_lines DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION modern.ledger_check_balance();

CREATE FUNCTION modern.ledger_preserve_documents() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF OLD.status<>'draft' AND NOT (OLD.status='posted' AND NEW.status='reversed' AND modern.actor_role()='manager' AND
    (to_jsonb(OLD)-'status')=(to_jsonb(NEW)-'status')) THEN
    RAISE EXCEPTION 'Posted accounting documents are immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_ledger_document BEFORE UPDATE ON modern.ledger_documents FOR EACH ROW EXECUTE FUNCTION modern.ledger_preserve_documents();

CREATE FUNCTION modern.project_paid(pid uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT coalesce((SELECT sum(amount) FROM modern.payments WHERE project_id=pid),0) -
    coalesce((SELECT sum(l.amount) FROM modern.ledger_lines l JOIN modern.ledger_entries e ON e.id=l.entry_id
      LEFT JOIN modern.ledger_entries original ON original.id=e.reverses_id
      WHERE l.project_id=pid AND l.account_code='1100' AND coalesce(original.kind,e.kind)='allocation'),0)
  WHERE modern.can_project(pid) AND (modern.actor_role() IN ('manager','secretary','accountant')
    OR modern.visible(pid,'payments') OR modern.visible(pid,'balance'))
$$;
REVOKE ALL ON FUNCTION modern.project_paid(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION modern.project_paid(uuid) TO modern_app;
CREATE FUNCTION modern.ledger_is_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT modern.actor_role() IN ('manager','accountant','secretary') AND
    EXISTS(SELECT 1 FROM modern.ledger_settings WHERE id AND opening_date IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION modern.ledger_is_open() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION modern.ledger_is_open() TO modern_app;
CREATE OR REPLACE FUNCTION modern.project_balance(pid uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT p.contract_value-modern.project_paid(pid) FROM modern.projects p WHERE p.id=pid AND modern.can_project(pid)
    AND (modern.actor_role() IN ('manager','secretary','accountant') OR modern.visible(pid,'balance'))
$$;

CREATE FUNCTION modern.ledger_prevent_legacy_payment() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(73918420);
  IF EXISTS (SELECT 1 FROM modern.ledger_settings WHERE id AND opening_date IS NOT NULL) THEN
    RAISE EXCEPTION 'Use office accounting to record receipts' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ledger_prevent_legacy_payment BEFORE INSERT ON modern.payments FOR EACH ROW EXECUTE FUNCTION modern.ledger_prevent_legacy_payment();

COMMIT;
