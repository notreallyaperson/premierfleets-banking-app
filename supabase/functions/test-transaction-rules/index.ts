import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 30000; // 30 seconds
const CACHE_TTL = 300; // 5 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Transaction {
  id?: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  category?: string;
  vendor?: string;
}

interface TransactionRule {
  id: string;
  name: string;
  pattern: {
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    metadata_match?: any;
    temporal_match?: any;
    location_match?: any;
    amount_range?: {
      min?: number;
      max?: number;
    };
    frequency_pattern?: {
      type: string;
      value: any;
    };
  };
  category: string;
  confidence_score: number;
}

interface TestResult {
  rule_id: string;
  name: string;
  confidence: number;
  category: string;
  matched_conditions: Array<{
    field: string;
    operator: string;
    value: any;
    matched: boolean;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request
    const { transaction } = await validateRequest(req);

    // Get auth token and initialize Supabase client
    const supabase = await initializeSupabase(req);

    // Get user's company ID
    const { companyId, error: userError } = await getUserCompanyId(supabase);
    if (userError) throw userError;

    // Check rate limit
    const rateLimitExceeded = await checkRateLimit(req.headers.get('x-real-ip') || '');
    if (rateLimitExceeded) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Try to get cached results first
    const cachedResults = await getCachedResults(transaction);
    if (cachedResults) {
      return new Response(
        JSON.stringify({ matched_rules: cachedResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company rules with retry mechanism
    const rules = await getRulesWithRetry(supabase, companyId);

    // Test transaction against rules
    const results = await testRules(transaction, rules);

    // Cache results
    await cacheResults(transaction, results);

    return new Response(
      JSON.stringify({ matched_rules: results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    await logError(error);

    const statusCode = getErrorStatusCode(error);
    return new Response(
      JSON.stringify({
        error: error.message,
        error_code: error.code || 'UNKNOWN_ERROR',
        request_id: crypto.randomUUID()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});

async function validateRequest(req: Request): Promise<{ transaction: Transaction }> {
  const body = await req.json().catch(() => {
    throw new Error('Invalid JSON in request body');
  });

  if (!body.transaction || typeof body.transaction !== 'object') {
    throw new Error('Transaction object is required');
  }

  const { description, amount, type, date } = body.transaction;
  if (!description || typeof amount !== 'number' || !type || !date) {
    throw new Error('Invalid transaction: missing required fields');
  }

  return body;
}

async function initializeSupabase(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    }
  );
}

async function getUserCompanyId(supabase: any) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    return { companyId: profile.company_id, error: null };
  } catch (error) {
    return { companyId: null, error };
  }
}

async function getRulesWithRetry(supabase: any, companyId: string, retries = MAX_RETRIES): Promise<TransactionRule[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('transaction_rules')
        .select('*')
        .eq('company_id', companyId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), TIMEOUT))
    ]);

    if (error) throw error;
    return data || [];
  } catch (error) {
    if (retries > 0 && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.code === '57014' // query_cancelled
    )) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return getRulesWithRetry(supabase, companyId, retries - 1);
    }
    throw error;
  }
}

async function testRules(transaction: Transaction, rules: TransactionRule[]): Promise<TestResult[]> {
  return rules.filter(rule => {
    let matches = true;
    const matchedConditions = [];

    // Test each condition
    for (const condition of rule.pattern.conditions) {
      const { field, operator, value } = condition;
      const transactionValue = transaction[field as keyof Transaction]?.toString().toLowerCase();
      const testValue = value.toString().toLowerCase();
      let conditionMatched = false;

      switch (operator) {
        case 'equals':
          conditionMatched = transactionValue === testValue;
          break;
        case 'contains':
          conditionMatched = transactionValue?.includes(testValue);
          break;
        case 'startsWith':
          conditionMatched = transactionValue?.startsWith(testValue);
          break;
        case 'endsWith':
          conditionMatched = transactionValue?.endsWith(testValue);
          break;
        case 'greaterThan':
          conditionMatched = parseFloat(transactionValue) > parseFloat(testValue);
          break;
        case 'lessThan':
          conditionMatched = parseFloat(transactionValue) < parseFloat(testValue);
          break;
        case 'between':
          const [min, max] = value;
          const amount = parseFloat(transactionValue);
          conditionMatched = amount >= min && amount <= max;
          break;
      }

      matchedConditions.push({
        field,
        operator,
        value,
        matched: conditionMatched
      });

      matches = matches && conditionMatched;
    }

    // Test amount range if specified
    if (rule.pattern.amount_range) {
      const { min, max } = rule.pattern.amount_range;
      if (min !== undefined && transaction.amount < min) matches = false;
      if (max !== undefined && transaction.amount > max) matches = false;
    }

    // Test temporal patterns if specified
    if (rule.pattern.temporal_match) {
      matches = matches && matchesTemporalPattern(transaction, rule.pattern.temporal_match);
    }

    return matches ? {
      rule_id: rule.id,
      name: rule.name,
      confidence: rule.confidence_score,
      category: rule.category,
      matched_conditions: matchedConditions
    } : null;
  }).filter(Boolean) as TestResult[];
}

function matchesTemporalPattern(transaction: Transaction, pattern: any): boolean {
  const txDate = new Date(transaction.date);
  
  switch (pattern.type) {
    case 'dayOfWeek':
      return txDate.getDay() === pattern.value;
    case 'dayOfMonth':
      return txDate.getDate() === pattern.value;
    case 'monthOfYear':
      return txDate.getMonth() === pattern.value - 1;
    case 'timeRange':
      const txTime = txDate.getHours() * 60 + txDate.getMinutes();
      return txTime >= pattern.start && txTime <= pattern.end;
    default:
      return true;
  }
}

async function checkRateLimit(ip: string): Promise<boolean> {
  // Implement rate limiting logic
  // For example, using Redis or a similar cache
  return false;
}

async function getCachedResults(transaction: Transaction): Promise<TestResult[] | null> {
  // Implement cache retrieval logic
  // For example, using Redis or a similar cache
  return null;
}

async function cacheResults(transaction: Transaction, results: TestResult[]): Promise<void> {
  // Implement caching logic
  // For example, using Redis or a similar cache
}

async function logError(error: Error): Promise<void> {
  console.error('Rule testing error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
}

function getErrorStatusCode(error: Error): number {
  if (error.message.includes('authorization')) {
    return 401;
  }
  if (error.message.includes('Invalid') || error.message.includes('required')) {
    return 400;
  }
  if (error.message.includes('Rate limit')) {
    return 429;
  }
  return 500;
}