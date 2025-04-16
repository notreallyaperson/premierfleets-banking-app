-- Drop existing tables if they exist
DO $$ BEGIN
  DROP TABLE IF EXISTS tax_categorizations CASCADE;
  DROP TABLE IF EXISTS document_extractions CASCADE;
  DROP TABLE IF EXISTS financial_forecasts CASCADE;
  DROP TABLE IF EXISTS transaction_patterns CASCADE;
  DROP TABLE IF EXISTS transaction_rules CASCADE;
EXCEPTION
  WHEN others THEN null;
END $$;

-- Transaction Rules table for automated categorization
CREATE TABLE transaction_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  pattern jsonb NOT NULL, -- Pattern to match (amount, description, etc.)
  category text NOT NULL,
  confidence_score decimal(5,2),
  is_ai_generated boolean DEFAULT false,
  times_applied integer DEFAULT 0,
  last_applied_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transaction patterns for fraud detection
CREATE TABLE transaction_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  pattern_type text NOT NULL,
  pattern_data jsonb NOT NULL,
  risk_score decimal(5,2),
  detection_count integer DEFAULT 0,
  last_detected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_pattern_type CHECK (pattern_type IN ('fraud', 'anomaly', 'suspicious'))
);

-- Financial forecasts table
CREATE TABLE financial_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  forecast_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  forecast_data jsonb NOT NULL,
  accuracy_score decimal(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_forecast_type CHECK (forecast_type IN ('revenue', 'expense', 'cashflow', 'budget'))
);

-- Document extractions table for OCR results
CREATE TABLE document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  extraction_type text NOT NULL,
  extracted_data jsonb NOT NULL,
  confidence_score decimal(5,2),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_extraction_type CHECK (extraction_type IN ('invoice', 'receipt', 'statement', 'tax'))
);

-- Tax categorizations table
CREATE TABLE tax_categorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  tax_category text NOT NULL,
  tax_year integer NOT NULL,
  amount decimal(12,2) NOT NULL,
  is_ai_categorized boolean DEFAULT false,
  confidence_score decimal(5,2),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_categorizations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "transaction_rules_access" ON transaction_rules
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "transaction_patterns_access" ON transaction_patterns
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "financial_forecasts_access" ON financial_forecasts
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "document_extractions_access" ON document_extractions
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tax_categorizations_access" ON tax_categorizations
FOR ALL TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_transaction_rules_updated_at
  BEFORE UPDATE ON transaction_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_patterns_updated_at
  BEFORE UPDATE ON transaction_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_forecasts_updated_at
  BEFORE UPDATE ON financial_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_extractions_updated_at
  BEFORE UPDATE ON document_extractions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_categorizations_updated_at
  BEFORE UPDATE ON tax_categorizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();