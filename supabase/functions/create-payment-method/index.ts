import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 30000; // 30 seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BankAccount {
  account_number: string;
  routing_number: string;
  account_holder_type: 'individual' | 'company';
  currency: string;
  country: string;
}

interface PaymentMethodRequest {
  type: 'us_bank_account' | 'card';
  bank_account?: BankAccount;
  metadata?: Record<string, string>;
}

interface PaymentMethodResponse {
  payment_method_id: string;
  status: string;
  last4?: string;
  bank_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request
    const { type, bank_account, metadata } = await validateRequest(req);

    // Check rate limit
    const rateLimitExceeded = await checkRateLimit(req.headers.get('x-real-ip') || '');
    if (rateLimitExceeded) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Initialize Stripe with retry mechanism
    const paymentMethod = await createPaymentMethodWithRetry({
      type,
      bank_account,
      metadata
    });

    return new Response(
      JSON.stringify(paymentMethod),
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

async function validateRequest(req: Request): Promise<PaymentMethodRequest> {
  // Validate authorization
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  // Parse and validate request body
  const body = await req.json().catch(() => {
    throw new Error('Invalid JSON in request body');
  });

  if (!body.type || !['us_bank_account', 'card'].includes(body.type)) {
    throw new Error('Invalid payment method type');
  }

  if (body.type === 'us_bank_account') {
    if (!body.bank_account) {
      throw new Error('Bank account details are required');
    }

    validateBankAccount(body.bank_account);
  }

  return body;
}

function validateBankAccount(bankAccount: any): void {
  if (!bankAccount.account_number || !/^\d{4,17}$/.test(bankAccount.account_number)) {
    throw new Error('Invalid account number');
  }

  if (!bankAccount.routing_number || !/^\d{9}$/.test(bankAccount.routing_number)) {
    throw new Error('Invalid routing number');
  }

  if (!bankAccount.account_holder_type || !['individual', 'company'].includes(bankAccount.account_holder_type)) {
    throw new Error('Invalid account holder type');
  }

  if (!bankAccount.country || bankAccount.country.length !== 2) {
    throw new Error('Invalid country code');
  }

  if (!bankAccount.currency || bankAccount.currency.length !== 3) {
    throw new Error('Invalid currency code');
  }
}

async function createPaymentMethodWithRetry(
  data: PaymentMethodRequest,
  retries = MAX_RETRIES
): Promise<PaymentMethodResponse> {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
      timeout: TIMEOUT,
    });

    // Create payment method with timeout
    const paymentMethod = await Promise.race([
      stripe.paymentMethods.create({
        type: data.type,
        [data.type]: data.bank_account,
        metadata: data.metadata
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Payment method creation timeout')), TIMEOUT)
      )
    ]);

    return {
      payment_method_id: paymentMethod.id,
      status: paymentMethod.status || 'active',
      last4: paymentMethod.us_bank_account?.last4,
      bank_name: paymentMethod.us_bank_account?.bank_name
    };

  } catch (error) {
    if (retries > 0 && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.type === 'StripeConnectionError' ||
      error.code === 'rate_limit'
    )) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return createPaymentMethodWithRetry(data, retries - 1);
    }
    throw error;
  }
}

async function checkRateLimit(ip: string): Promise<boolean> {
  // Implement rate limiting logic
  // For example, using Redis or a similar cache
  return false;
}

async function logError(error: Error): Promise<void> {
  console.error('Payment method creation error:', {
    message: error.message,
    code: (error as any).code,
    type: (error as any).type,
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
  if (error.message.includes('Rate limit') || (error as any).code === 'rate_limit') {
    return 429;
  }
  if ((error as any).type === 'StripeCardError') {
    return 402;
  }
  if ((error as any).type === 'StripeInvalidRequestError') {
    return 400;
  }
  return 500;
}