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

interface DocumentInfo {
  id: string;
  name: string;
  file_type: string;
  content_type: string;
  file_url: string;
  metadata?: Record<string, any>;
}

interface CategoryResult {
  category: string;
  subcategory?: string;
  confidence_score: number;
  suggested_path: string;
  metadata_tags: string[];
  document_type: string;
  related_entities: {
    type: string;
    id: string;
    name: string;
  }[];
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
    const { document } = await validateRequest(req);

    // Check rate limit
    const rateLimitExceeded = await checkRateLimit(req.headers.get('x-real-ip') || '');
    if (rateLimitExceeded) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Download and analyze document
    const documentContent = await downloadDocument(document.file_url);
    const category = await categorizeDocumentWithRetry(documentContent, document);

    // Move document to categorized location
    await moveDocument(supabase, document, category);

    // Update document metadata
    await updateDocumentMetadata(supabase, document.id, category);

    return new Response(
      JSON.stringify({
        status: 'success',
        category_result: category
      }),
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

async function validateRequest(req: Request): Promise<{ document: DocumentInfo }> {
  const body = await req.json().catch(() => {
    throw new Error('Invalid JSON in request body');
  });

  if (!body.document || !body.document.id || !body.document.file_url) {
    throw new Error('Invalid request: missing document information');
  }

  return body;
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

async function categorizeDocumentWithRetry(
  content: string,
  document: DocumentInfo,
  retries = MAX_RETRIES
): Promise<CategoryResult> {
  try {
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    const prompt = generateCategoryPrompt(content, document);

    const completion = await Promise.race([
      openai.createChatCompletion({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "You are an expert document analyst specializing in categorization and organization."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.2,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Categorization timeout')), TIMEOUT))
    ]);

    const result = JSON.parse(completion.data.choices[0].message?.content || '{}');
    validateCategoryResult(result);
    return result;

  } catch (error) {
    if (retries > 0 && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.response?.status === 429
    )) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return categorizeDocumentWithRetry(content, document, retries - 1);
    }
    throw error;
  }
}

function generateCategoryPrompt(content: string, document: DocumentInfo): string {
  return `Analyze this document and determine its appropriate category and organization.

Document Information:
- Name: ${document.name}
- Type: ${document.file_type}
- Content Type: ${document.content_type}
${document.metadata ? `- Metadata: ${JSON.stringify(document.metadata)}` : ''}

Document Content:
${content}

Determine:
1. Primary category (e.g., invoices, contracts, maintenance, tax)
2. Subcategory if applicable
3. Suggested file path structure
4. Relevant metadata tags
5. Document type classification
6. Related business entities (vehicles, employees, vendors, etc.)

Consider:
- Document content and context
- File naming patterns
- Standard business categories
- Industry-specific classifications
- Regulatory requirements
- Search and retrieval needs

Provide the response in this JSON format:
{
  "category": "string",
  "subcategory": "string",
  "confidence_score": number,
  "suggested_path": "string",
  "metadata_tags": ["string"],
  "document_type": "string",
  "related_entities": [{
    "type": "string",
    "id": "string",
    "name": "string"
  }]
}`;
}

function validateCategoryResult(result: any): void {
  if (!result.category || typeof result.category !== 'string') {
    throw new Error('Invalid category result: missing or invalid category');
  }

  if (typeof result.confidence_score !== 'number' || 
      result.confidence_score < 0 || 
      result.confidence_score > 1) {
    throw new Error('Invalid category result: invalid confidence score');
  }

  if (!result.suggested_path || typeof result.suggested_path !== 'string') {
    throw new Error('Invalid category result: missing or invalid path');
  }

  if (!Array.isArray(result.metadata_tags)) {
    throw new Error('Invalid category result: metadata_tags must be an array');
  }
}

async function moveDocument(
  supabase: any,
  document: DocumentInfo,
  category: CategoryResult
): Promise<void> {
  const sourceKey = document.file_url.split('/').pop();
  if (!sourceKey) throw new Error('Invalid source file path');

  const destinationKey = `${category.suggested_path}/${sourceKey}`;

  // Copy file to new location
  const { error: copyError } = await supabase.storage
    .from('documents')
    .copy(sourceKey, destinationKey);

  if (copyError) throw copyError;

  // Delete original file
  const { error: deleteError } = await supabase.storage
    .from('documents')
    .remove([sourceKey]);

  if (deleteError) throw deleteError;
}

async function updateDocumentMetadata(
  supabase: any,
  documentId: string,
  category: CategoryResult
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({
      category: category.category,
      subcategory: category.subcategory,
      file_path: category.suggested_path,
      metadata: {
        confidence_score: category.confidence_score,
        document_type: category.document_type,
        tags: category.metadata_tags,
        related_entities: category.related_entities
      }
    })
    .eq('id', documentId);

  if (error) throw error;
}

async function checkRateLimit(ip: string): Promise<boolean> {
  // Implement rate limiting logic
  // For example, using Redis or a similar cache
  return false;
}

async function logError(error: Error): Promise<void> {
  console.error('Document categorization error:', {
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
  if (error.message.includes('File size exceeds')) {
    return 413;
  }
  if (error.message.includes('Unsupported file type')) {
    return 415;
  }
  return 500;
}