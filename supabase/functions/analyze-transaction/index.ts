import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 30000; // 30 seconds
const BATCH_SIZE = 100; // Maximum transactions to analyze at once

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
}

interface AnalysisRule {
  name: string;
  description: string;
  pattern: {
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
  };
  category: string;
  confidence_score: number;
  recommendations: string[];
}

interface AnalysisResult {
  rules: AnalysisRule[];
  patterns: {
    recurring: Array<{
      description: string;
      frequency: string;
      average_amount: number;
    }>;
    seasonal: Array<{
      description: string;
      period: string;
      trend: string;
    }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request
    const { transactions, type } = await validateRequest(req);

    // Rate limiting check
    const rateLimitExceeded = await checkRateLimit(req.headers.get('x-real-ip') || '');
    if (rateLimitExceeded) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Process transactions in batches if needed
    const batchedTransactions = await processBatches(transactions);

    // Initialize OpenAI with retry mechanism
    const analysis = await analyzeWithRetry(batchedTransactions, type);

    // Cache results if needed
    await cacheResults(analysis);

    return new Response(
      JSON.stringify(analysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
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
      },
    )
  }
})

async function validateRequest(req: Request): Promise<{ transactions: Transaction[], type: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const body = await req.json().catch(() => {
    throw new Error('Invalid JSON in request body');
  });

  if (!Array.isArray(body.transactions)) {
    throw new Error('Transactions must be an array');
  }

  if (!body.type || typeof body.type !== 'string') {
    throw new Error('Analysis type is required');
  }

  // Validate each transaction
  body.transactions.forEach((tx: any, index: number) => {
    if (!tx.description || !tx.amount || !tx.date) {
      throw new Error(`Invalid transaction at index ${index}`);
    }
  });

  return body;
}

async function checkRateLimit(ip: string): Promise<boolean> {
  // Implement rate limiting logic
  // For example, using Redis or a similar cache
  return false;
}

async function processBatches(transactions: Transaction[]): Promise<Transaction[]> {
  const batches = [];
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    batches.push(transactions.slice(i, i + BATCH_SIZE));
  }

  const processedBatches = await Promise.all(
    batches.map(async (batch) => {
      // Process each batch
      // Add any preprocessing logic here
      return batch;
    })
  );

  return processedBatches.flat();
}

async function analyzeWithRetry(
  transactions: Transaction[], 
  type: string, 
  retries = MAX_RETRIES
): Promise<AnalysisResult> {
  try {
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    // Prepare the prompt with enhanced context
    const prompt = `Analyze these transactions and generate rules for: ${type}

Transaction Data: ${JSON.stringify(transactions)}

Generate:
1. Pattern matching rules for categorization
2. Recurring transaction patterns
3. Seasonal trends
4. Risk indicators
5. Optimization recommendations

Consider:
- Transaction frequencies
- Amount patterns
- Description similarities
- Temporal patterns
- Vendor relationships

Provide the response in this format:
{
  "rules": [{
    "name": "string",
    "description": "string",
    "pattern": {
      "conditions": [{
        "field": "string",
        "operator": "string",
        "value": "any"
      }]
    },
    "category": "string",
    "confidence_score": number,
    "recommendations": ["string"]
  }],
  "patterns": {
    "recurring": [{
      "description": "string",
      "frequency": "string",
      "average_amount": number
    }],
    "seasonal": [{
      "description": "string",
      "period": "string",
      "trend": "string"
    }]
  }
}`;

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
      new Promise((_, reject) => setTimeout(() => reject(new Error('Analysis timeout')), TIMEOUT))
    ]);

    const analysis = JSON.parse(completion.data.choices[0].message?.content || '{}');
    validateAnalysisResult(analysis);
    return analysis;

  } catch (error) {
    if (retries > 0 && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.response?.status === 429
    )) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return analyzeWithRetry(transactions, type, retries - 1);
    }
    throw error;
  }
}

function validateAnalysisResult(analysis: any): void {
  if (!analysis.rules || !Array.isArray(analysis.rules)) {
    throw new Error('Invalid analysis result: missing or invalid rules array');
  }

  if (!analysis.patterns || typeof analysis.patterns !== 'object') {
    throw new Error('Invalid analysis result: missing or invalid patterns object');
  }

  // Validate each rule
  analysis.rules.forEach((rule: any, index: number) => {
    if (!rule.name || !rule.pattern || !rule.category || 
        typeof rule.confidence_score !== 'number') {
      throw new Error(`Invalid rule at index ${index}`);
    }
  });
}

async function cacheResults(analysis: AnalysisResult): Promise<void> {
  // Implement caching logic
  // For example, using Redis or a similar cache
}

async function logError(error: Error): Promise<void> {
  console.error('Transaction analysis error:', {
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