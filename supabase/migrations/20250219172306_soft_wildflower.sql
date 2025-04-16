-- Add reference column to transactions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'reference'
  ) THEN
    ALTER TABLE transactions ADD COLUMN reference text;
  END IF;
END $$;

-- Update transaction constraints if needed
DO $$ 
BEGIN
  -- Drop existing constraints if they exist
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_type;
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_status;
  
  -- Add updated constraints
  ALTER TABLE transactions 
    ADD CONSTRAINT valid_type 
    CHECK (type IN ('income', 'expense', 'transfer'));
    
  ALTER TABLE transactions 
    ADD CONSTRAINT valid_status 
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed'));
END $$;

-- Insert sample bank accounts with unique IDs
DO $$
DECLARE
  checking_id uuid;
  savings_id uuid;
  target_company_id uuid := 'e52869a7-4f5d-4f19-b25f-2dc0e9aa0226';
BEGIN
  -- Generate new UUIDs for accounts
  checking_id := gen_random_uuid();
  savings_id := gen_random_uuid();

  -- Insert checking account
  INSERT INTO bank_accounts (
    id,
    company_id,
    stripe_account_id,
    type,
    currency,
    status,
    account_number,
    routing_number,
    bank_name,
    balance
  ) VALUES (
    checking_id,
    target_company_id,
    'ba_' || encode(gen_random_bytes(16), 'hex'),
    'checking',
    'usd',
    'active',
    '****1234',
    '021000021',
    'Fleet Business Bank',
    25000.00
  );

  -- Insert savings account
  INSERT INTO bank_accounts (
    id,
    company_id,
    stripe_account_id,
    type,
    currency,
    status,
    account_number,
    routing_number,
    bank_name,
    balance
  ) VALUES (
    savings_id,
    target_company_id,
    'ba_' || encode(gen_random_bytes(16), 'hex'),
    'savings',
    'usd',
    'active',
    '****5678',
    '021000021',
    'Fleet Business Bank',
    50000.00
  );

  -- Insert sample transactions
  INSERT INTO transactions (
    id,
    company_id,
    bank_account_id,
    date,
    description,
    amount,
    type,
    category,
    status,
    reference
  ) VALUES
    -- Vehicle Maintenance
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-29 10:00:00', 'Vehicle Maintenance - Truck #1234', 450.00, 'expense', 'Maintenance', 'approved', 'MAINT-001'),
    
    -- Fuel Expenses
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-29 09:30:00', 'Fuel Station - Diesel', 850.00, 'expense', 'Fuel', 'approved', 'FUEL-001'),
    
    -- Insurance Payment
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-28 15:20:00', 'Insurance Payment', 1200.00, 'expense', 'Insurance', 'approved', 'INS-001'),
    
    -- Client Payment
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-28 11:00:00', 'Client Payment - ABC Logistics', 5500.00, 'income', 'Revenue', 'approved', 'PMT-001'),

    -- Additional transactions
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-27 14:30:00', 'Equipment Purchase', 15000.00, 'expense', 'Equipment', 'approved', 'EQP-001'),
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-27 10:15:00', 'Freight Services', 12500.00, 'income', 'Revenue', 'approved', 'PMT-002'),
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-26 16:45:00', 'Vehicle Repairs', 3500.00, 'expense', 'Maintenance', 'approved', 'MAINT-002'),
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-26 09:20:00', 'Logistics Contract Payment', 25000.00, 'income', 'Revenue', 'approved', 'PMT-003'),
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-25 13:10:00', 'Fleet Maintenance', 2800.00, 'expense', 'Maintenance', 'approved', 'MAINT-003'),
    (gen_random_uuid(), target_company_id, checking_id, '2025-01-25 11:30:00', 'Transport Services', 18000.00, 'income', 'Revenue', 'approved', 'PMT-004');

  -- Delete any existing patterns and rules for this company
  DELETE FROM transaction_patterns WHERE company_id = target_company_id;
  DELETE FROM transaction_rules WHERE company_id = target_company_id;

  -- Insert transaction patterns for fraud detection
  INSERT INTO transaction_patterns (
    company_id,
    pattern_type,
    pattern_data,
    risk_score,
    detection_count
  ) VALUES
    (target_company_id, 'fraud', 
     jsonb_build_object(
       'type', 'unusual_amount',
       'threshold', 10000,
       'description', 'Large transaction amount exceeding normal patterns'
     ),
     0.7,
     1
    ),
    (target_company_id, 'anomaly',
     jsonb_build_object(
       'type', 'frequency',
       'threshold', '24h',
       'description', 'Multiple fuel purchases within short timeframe'
     ),
     0.5,
     2
    );

  -- Insert transaction rules for categorization
  INSERT INTO transaction_rules (
    company_id,
    name,
    description,
    pattern,
    category,
    confidence_score,
    is_ai_generated,
    times_applied
  ) VALUES
    (target_company_id,
     'Fuel Expenses',
     'Automatically categorize fuel station transactions',
     jsonb_build_object(
       'conditions', jsonb_build_array(
         jsonb_build_object(
           'field', 'description',
           'operator', 'contains',
           'value', 'Fuel Station'
         )
       )
     ),
     'Fuel',
     0.95,
     true,
     10
    ),
    (target_company_id,
     'Maintenance Expenses',
     'Categorize vehicle maintenance transactions',
     jsonb_build_object(
       'conditions', jsonb_build_array(
         jsonb_build_object(
           'field', 'description',
           'operator', 'contains',
           'value', 'Maintenance'
         )
       )
     ),
     'Maintenance',
     0.90,
     true,
     8
    );
END $$;