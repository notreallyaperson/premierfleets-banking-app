import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 30000; // 30 seconds
const MIN_TRANSACTIONS = 10;
const MAX_TRANSACTIONS = 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category?: string;
  vendor?: string;
}

interface GeneratedRule {
  name: string;
  description: string;
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
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = await initializeSupabase(req);

    // Get user's company ID
    const { companyId, error: userError } = await getUserCompanyId(supabase);
    if (userError) throw userError;

    // Check rate limit
    const rateLimitExceeded = await checkRateLimit(req.headers.get('x-real-ip') || '');
    if (rateLimitExceeded) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Fetch recent transactions
    const transactions = await fetchTransactionsWithRetry(supabase, companyId);

    // Generate rules with retry mechanism
    const rules = await generateRulesWithRetry(transactions);

    // Save generated rules
    await saveRules(supabase, companyId, rules);

    return new Response(
      JSON.stringify({ rules }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
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
    )
  }
})

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

async function fetchTransactionsWithRetry(
  supabase: any,
  companyId: string,
  retries = MAX_RETRIES
): Promise<Transaction[]> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .limit(MAX_TRANSACTIONS),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database timeout')), TIMEOUT))
    ]);

    if (error) throw error;
    if (!data || data.length < MIN_TRANSACTIONS) {
      throw new Error(`Insufficient transaction history. At least ${MIN_TRANSACTIONS} transactions required.`);
    }

    return data;
  } catch (error) {
    if (retries > 0 && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.code === '57014' // query_cancelled
    )) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchTransactionsWithRetry(supabase, companyId, retries - 1);
    }
    throw error;
  }
}

async function generateRulesWithRetry(
  transactions: Transaction[],
  retries = MAX_RETRIES
): Promise<GeneratedRule[]> {
  try {
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    // Prepare the data for analysis
    const processedData = preprocessTransactions(transactions);

    // Generate the prompt
    const prompt = generateAnalysisPrompt(processedData);

    // Get rules from GPT-4
    const completion = await Promise.race([
      openai.createChatCompletion({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "You are an AI financial analyst specializing in transaction pattern analysis and rule generation."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.2,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Rule generation timeout')), TIMEOUT))
    ]);

    const rules = JSON.parse(completion.data.choices[0].message?.content || '{}').rules;
    validateRules(rules);
    return rules;

  } catch (error) {
    if (retries > 0 && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.response?.status === 429
    )) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return generateRulesWithRetry(transactions, retries - 1);
    }
    throw error;
  }
}

function preprocessTransactions(transactions: Transaction[]): Transaction[] {
  return transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(tx => ({
      ...tx,
      description: tx.description.toLowerCase(),
      category: tx.category?.toLowerCase()
    }));
}

function generateAnalysisPrompt(transactions: Transaction[]): string {
  // Calculate transaction statistics
  const stats = calculateTransactionStats(transactions);
  
  return `Analyze these transactions and generate intelligent categorization rules.

Transaction Statistics:
- Total Transactions: ${transactions.length}
- Date Range: ${stats.dateRange}
- Average Amount: ${stats.averageAmount}
- Common Categories: ${stats.commonCategories.join(', ')}
- Transaction Types: ${stats.transactionTypes.join(', ')}

Raw Transaction Data: ${JSON.stringify(transactions)}

Generate rules that consider:
1. Description patterns and keywords
2. Amount ranges and thresholds
3. Transaction frequencies
4. Seasonal patterns
5. Vendor relationships
6. Category correlations

For each rule, provide:
1. Clear name and description
2. Precise matching conditions
3. Confidence score based on data support
4. Category assignment
5. Optimization recommendations

Rules should be:
- Specific enough to avoid false positives
- General enough to catch variations
- Based on clear patterns in the data
- Ranked by confidence score

Return the rules in this format:
{
  "rules": [{
    "name": "string",
    "description": "string",
    "pattern": {
      "conditions": [{
        "field": "string",
        "operator": "string",
        "value": "any"
      }],
      "amount_range": {
        "min": number,
        "max": number
      },
      "frequency_pattern": {
        "type": "string",
        "value": "any"
      }
    },
    "category": "string",
    "confidence_score": number,
    "recommendations": ["string"]
  }]
}`;
}

function calculateTransactionStats(transactions: Transaction[]) {
  const dates = transactions.map(tx => new Date(tx.date));
  const amounts = transactions.map(tx => tx.amount);
  const categories = new Set(transactions.map(tx => tx.category).filter(Boolean));
  const types = new Set(transactions.map(tx => tx.type));

  return {
    dateRange: `${new Date(Math.min(...dates)).toISOString().split('T')[0]} to ${new Date(Math.max(...dates)).toISOString().split('T')[0]}`,
    averageAmount: amounts.reduce((a, b) => a + b, 0) / amounts.length,
    commonCategories: Array.from(categories).slice(0, 5),
    transactionTypes: Array.from(types)
  };
}

function validateRules(rules: any[]): void {
  if (!Array.isArray(rules)) {
    throw new Error('Invalid rules: must be an array');
  }

  rules.forEach((rule, index) => {
    if (!rule.name || typeof rule.name !== 'string') {
      throw new Error(`Invalid rule at index ${index}: missing or invalid name`);
    }

    if (!rule.pattern || !Array.isArray(rule.pattern.conditions)) {
      throw new Error(`Invalid rule at index ${index}: missing or invalid pattern conditions`);
    }

    if (!rule.category || typeof rule.category !== 'string') {
      throw new Error(`Invalid rule at index ${index}: missing or invalid category`);
    }

    if (typeof rule.confidence_score !== 'number' || 
        rule.confidence_score < 0 || 
        rule.confidence_score > 1) {
      throw new Error(`Invalid rule at index ${index}: invalid confidence score`);
    }
  });
}

async function saveRules(supabase: any, companyId: string, rules: GeneratedRule[]): Promise<void> {
  const { error } = await supabase
    .from('transaction_rules')
    .insert(
      rules.map(rule => ({
        company_id: companyId,
        name: rule.name,
        description: rule.description,
        pattern: rule.pattern,
        category: rule.category,
        confidence_score: rule.confidence_score,
        is_ai_generated: true,
        recommendations: rule.recommendations
      }))
    );

  if (error) throw error;
}

async function checkRateLimit(ip: string): Promise<boolean> {
  // Implement rate limiting logic
  // For example, using Redis or a similar cache
  return false;
}

async function logError(error: Error): Promise<void> {
  console.error('Rule generation error:', {
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
  if (error.message.includes('Insufficient transaction history')) {
    return 422;
  }
  return 500;
}