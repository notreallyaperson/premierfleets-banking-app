/*
  # Add banking and financial tables

  1. New Tables
    - `bank_accounts`
      - Stores Treasury account information
      - Links to Stripe Treasury accounts
    - `payment_cards`
      - Stores Stripe Issuing card information
    - `capital_applications`
      - Tracks Stripe Capital applications and loans
    
  2. Security
    - Enable RLS on all new tables
    - Add policies for company-based access
*/

-- Bank accounts table
CREATE TABLE bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  stripe_account_id text NOT NULL,
  type text NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  last_synced_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'frozen', 'closed'))
);

-- Enable RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Payment cards table
CREATE TABLE payment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  bank_account_id uuid REFERENCES bank_accounts ON DELETE SET NULL,
  stripe_card_id text NOT NULL,
  card_type text NOT NULL,
  last4 text NOT NULL,
  exp_month integer NOT NULL,
  exp_year integer NOT NULL,
  cardholder_name text,
  spending_limit decimal(12,2),
  status text NOT NULL DEFAULT 'inactive',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_card_type CHECK (card_type IN ('virtual', 'physical')),
  CONSTRAINT valid_status CHECK (status IN ('inactive', 'active', 'blocked', 'canceled'))
);

-- Enable RLS
ALTER TABLE payment_cards ENABLE ROW LEVEL SECURITY;

-- Capital applications table
CREATE TABLE capital_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  stripe_financing_id text,
  amount_requested decimal(12,2) NOT NULL,
  amount_approved decimal(12,2),
  term_length integer,
  apr decimal(5,2),
  status text NOT NULL DEFAULT 'pending',
  application_date timestamptz DEFAULT now(),
  approved_date timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'))
);

-- Enable RLS
ALTER TABLE capital_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Bank accounts policies
CREATE POLICY "Users can view bank accounts in their company"
  ON bank_accounts FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage bank accounts"
  ON bank_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND company_id = bank_accounts.company_id
    )
  );

-- Payment cards policies
CREATE POLICY "Users can view payment cards in their company"
  ON payment_cards FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage payment cards"
  ON payment_cards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND company_id = payment_cards.company_id
    )
  );

-- Capital applications policies
CREATE POLICY "Users can view capital applications in their company"
  ON capital_applications FOR SELECT
  TO authenticated
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage capital applications"
  ON capital_applications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND company_id = capital_applications.company_id
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_cards_updated_at
    BEFORE UPDATE ON payment_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capital_applications_updated_at
    BEFORE UPDATE ON capital_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();