-- Enhance transaction_rules table with more sophisticated fields
ALTER TABLE transaction_rules
ADD COLUMN priority integer DEFAULT 0,
ADD COLUMN valid_from timestamptz,
ADD COLUMN valid_until timestamptz,
ADD COLUMN execution_schedule jsonb,
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN rule_type text DEFAULT 'standard',
ADD COLUMN parent_rule_id uuid REFERENCES transaction_rules(id),
ADD COLUMN exception_handling jsonb DEFAULT '{}'::jsonb,
ADD COLUMN version integer DEFAULT 1,
ADD COLUMN tags text[],
ADD COLUMN custom_functions jsonb,
ADD CONSTRAINT valid_rule_type CHECK (rule_type IN ('standard', 'temporary', 'scheduled', 'chain', 'exception'));

-- Add new pattern matching capabilities
ALTER TABLE transaction_rules
ALTER COLUMN pattern TYPE jsonb USING jsonb_build_object(
  'conditions', pattern->'conditions',
  'metadata_match', '{}',
  'temporal_match', '{}',
  'location_match', '{}',
  'amount_range', '{}',
  'frequency_pattern', '{}',
  'vendor_match', '{}',
  'account_relations', '{}',
  'custom_match', '{}'
);

-- Create rule execution history table
CREATE TABLE rule_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES transaction_rules(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  execution_time timestamptz DEFAULT now(),
  success boolean NOT NULL,
  matched_conditions jsonb,
  applied_actions jsonb,
  execution_duration interval,
  error_details jsonb
);

-- Create rule dependencies table
CREATE TABLE rule_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_rule_id uuid REFERENCES transaction_rules(id) ON DELETE CASCADE,
  child_rule_id uuid REFERENCES transaction_rules(id) ON DELETE CASCADE,
  dependency_type text NOT NULL,
  execution_order integer,
  CONSTRAINT valid_dependency_type CHECK (dependency_type IN ('requires', 'excludes', 'follows'))
);

-- Enable RLS
ALTER TABLE rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_dependencies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "rule_executions_access" ON rule_executions
FOR ALL TO authenticated
USING (
  rule_id IN (
    SELECT id FROM transaction_rules 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "rule_dependencies_access" ON rule_dependencies
FOR ALL TO authenticated
USING (
  parent_rule_id IN (
    SELECT id FROM transaction_rules 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_rule_executions_updated_at
  BEFORE UPDATE ON rule_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rule_dependencies_updated_at
  BEFORE UPDATE ON rule_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();