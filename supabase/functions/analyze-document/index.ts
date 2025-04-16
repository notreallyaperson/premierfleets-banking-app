import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 30000; // 30 seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisResult {
  status: 'success' | 'error';
  summary: string;
  key_points: string[];
  recommendations: string[];
  risk_factors: string[];
  extracted_data: {
    // Financial Information
    amount?: number;
    payment_amount?: number;
    interest_rate?: number;
    term_months?: number;
    fund_date?: string;
    maturity_date?: string;
    payment_schedule?: {
      frequency: string;
      amount: number;
      first_payment_date: string;
    };
    
    // Lending Information
    lending_institution?: string;
    loan_type?: string;
    loan_number?: string;
    
    // Equipment Information
    equipment_type?: string;
    make?: string;
    model?: string;
    year?: number;
    vin?: string;
    serial_number?: string;
    
    // Vendor Information
    vendor_name?: string;
    vendor_address?: string;
    vendor_contact?: string;
    
    // Transaction Details
    purchase_price?: number;
    down_payment?: number;
    taxes?: number;
    fees?: {
      type: string;
      amount: number;
    }[];
    
    // Registration Information
    registration_date?: string;
    registration_number?: string;
    registration_state?: string;
    registration_expiry?: string;
    
    // Insurance Information
    insurance_provider?: string;
    policy_number?: string;
    coverage_amount?: number;
    insurance_term?: {
      start_date: string;
      end_date: string;
    };
  };
  confidence_score: number;
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

    // Validate request
    const { url, type, document_id } = await validateRequest(req);

    // Download and analyze document
    const documentContent = await downloadDocument(url);
    const analysis = await analyzeDocumentWithRetry(documentContent, type);

    // Update document record if document_id is provided
    if (document_id) {
      await updateDocumentRecord(supabase, document_id, analysis);
    }

    return new Response(
      JSON.stringify(analysis),
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

async function analyzeDocumentWithRetry(
  content: string,
  type: string,
  retries = MAX_RETRIES
): Promise<AnalysisResult> {
  try {
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    const prompt = generateAnalysisPrompt(content, type);

    const completion = await Promise.race([
      openai.createChatCompletion({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "You are an expert document analyst specializing in financial and equipment documentation."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.2,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Analysis timeout')), TIMEOUT))
    ]);

    const result = JSON.parse(completion.data.choices[0].message?.content || '{}');
    validateAnalysisResult(result);
    return result;

  } catch (error) {
    if (retries > 0 && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.response?.status === 429
    )) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return analyzeDocumentWithRetry(content, type, retries - 1);
    }
    throw error;
  }
}

function generateAnalysisPrompt(content: string, type: string): string {
  return `Analyze this ${type} document and extract all relevant information.

Document Content:
${content}

Extract the following information:

1. Financial Information:
   - Purchase/loan amount
   - Payment amount
   - Interest rate
   - Term length
   - Fund date
   - Maturity date
   - Payment schedule details

2. Lending Information:
   - Lending institution
   - Loan type
   - Loan/contract number

3. Equipment Information:
   - Type of equipment
   - Make/manufacturer
   - Model
   - Year
   - VIN/Serial numbers
   - Specifications

4. Vendor Information:
   - Vendor name
   - Address
   - Contact details

5. Transaction Details:
   - Purchase price
   - Down payment
   - Taxes
   - Fees and charges
   - Total amount financed

6. Registration Information:
   - Registration date
   - Registration number
   - State/jurisdiction
   - Expiration date

7. Insurance Information:
   - Insurance provider
   - Policy number
   - Coverage amount
   - Policy term dates

Also provide:
- Summary of key points
- Any recommendations
- Risk factors or concerns
- Confidence score for extracted data

Return the analysis in this JSON format:
{
  "status": "success",
  "summary": "string",
  "key_points": ["string"],
  "recommendations": ["string"],
  "risk_factors": ["string"],
  "extracted_data": {
    "amount": number,
    "payment_amount": number,
    "interest_rate": number,
    "term_months": number,
    "fund_date": "YYYY-MM-DD",
    "maturity_date": "YYYY-MM-DD",
    "payment_schedule": {
      "frequency": "string",
      "amount": number,
      "first_payment_date": "YYYY-MM-DD"
    },
    "lending_institution": "string",
    "loan_type": "string",
    "loan_number": "string",
    "equipment_type": "string",
    "make": "string",
    "model": "string",
    "year": number,
    "vin": "string",
    "serial_number": "string",
    "vendor_name": "string",
    "vendor_address": "string",
    "vendor_contact": "string",
    "purchase_price": number,
    "down_payment": number,
    "taxes": number,
    "fees": [{
      "type": "string",
      "amount": number
    }],
    "registration_date": "YYYY-MM-DD",
    "registration_number": "string",
    "registration_state": "string",
    "registration_expiry": "YYYY-MM-DD",
    "insurance_provider": "string",
    "policy_number": "string",
    "coverage_amount": number,
    "insurance_term": {
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD"
    }
  },
  "confidence_score": number
}`;
}

function validateAnalysisResult(result: any): void {
  if (!result.status || !['success', 'error'].includes(result.status)) {
    throw new Error('Invalid analysis result: missing or invalid status');
  }

  if (!result.summary || typeof result.summary !== 'string') {
    throw new Error('Invalid analysis result: missing or invalid summary');
  }

  if (!Array.isArray(result.key_points)) {
    throw new Error('Invalid analysis result: key_points must be an array');
  }

  if (!Array.isArray(result.recommendations)) {
    throw new Error('Invalid analysis result: recommendations must be an array');
  }

  if (!Array.isArray(result.risk_factors)) {
    throw new Error('Invalid analysis result: risk_factors must be an array');
  }

  if (!result.extracted_data || typeof result.extracted_data !== 'object') {
    throw new Error('Invalid analysis result: missing or invalid extracted_data');
  }

  if (typeof result.confidence_score !== 'number' || 
      result.confidence_score < 0 || 
      result.confidence_score > 1) {
    throw new Error('Invalid analysis result: invalid confidence score');
  }
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

async function validateRequest(req: Request): Promise<{ url: string, type: string, document_id: string | null }> {
  const body = await req.json().catch(() => {
    throw new Error('Invalid JSON in request body');
  });

  if (!body.url || typeof body.url !== 'string') {
    throw new Error('Document URL is required and must be a string');
  }

  if (!body.type || !['fleet_document', 'loan_document', 'purchase_agreement', 'maintenance_record'].includes(body.type)) {
    throw new Error('Invalid document type');
  }

  return {
    url: body.url,
    type: body.type,
    document_id: body.document_id || null
  };
}

async function downloadDocument(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/pdf')) {
      return await response.text();
    } else if (contentType.includes('image/')) {
      const imageBytes = await response.arrayBuffer();
      return btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or image file.');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Document download timed out');
    }
    throw error;
  }
}

async function updateDocumentRecord(supabase: any, documentId: string, analysis: AnalysisResult): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({
      analysis_result: analysis,
      category: determineCategory(analysis),
      metadata: extractMetadata(analysis)
    })
    .eq('id', documentId);

  if (error) throw error;
}

function determineCategory(analysis: AnalysisResult): string {
  const data = analysis.extracted_data;
  if (data.loan_type) return 'loan_document';
  if (data.vin || data.equipment_type) return 'equipment_document';
  if (data.registration_number) return 'registration';
  if (data.insurance_provider) return 'insurance';
  return 'other';
}

function extractMetadata(analysis: AnalysisResult): Record<string, any> {
  const { extracted_data } = analysis;
  return {
    amount: extracted_data.amount || extracted_data.purchase_price,
    date: extracted_data.fund_date || extracted_data.registration_date,
    vendor: extracted_data.vendor_name,
    equipment: extracted_data.vin ? {
      vin: extracted_data.vin,
      make: extracted_data.make,
      model: extracted_data.model,
      year: extracted_data.year
    } : null,
    loan: extracted_data.loan_number ? {
      number: extracted_data.loan_number,
      lender: extracted_data.lending_institution,
      term: extracted_data.term_months
    } : null
  };
}

async function logError(error: Error): Promise<void> {
  console.error('Document analysis error:', {
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
  if (error.message.includes('timeout')) {
    return 408;
  }
  if (error.message.includes('File size exceeds')) {
    return 413;
  }
  if (error.message.includes('Unsupported file type')) {
    return 415;
  }
  return 500;
}