import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 30000; // 30 seconds
const CACHE_TTL = 3600; // 1 hour
const MIN_DATA_POINTS = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HistoricalData {
  date: string;
  amount: number;
  type: string;
  category?: string;
}

interface ForecastResult {
  start_date: string;
  end_date: string;
  data: {
    dates: string[];
    values: number[];
    confidence_intervals: {
      lower: number[];
      upper: number[];
    };
  };
  accuracy_score: number;
  patterns: {
    seasonal: boolean;
    trend: 'up' | 'down' | 'stable';
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request
    const { historical_data, forecast_type, timeframe } = await validateRequest(req);

    // Check rate limit
    const rateLimitExceeded = await checkRateLimit(req.headers.get('x-real-ip') || '');
    if (rateLimitExceeded) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Try to get cached forecast first
    const cacheKey = generateCacheKey(historical_data, forecast_type, timeframe);
    const cachedForecast = await getCachedForecast(cacheKey);
    if (cachedForecast) {
      return new Response(
        JSON.stringify(cachedForecast),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate forecast with retry mechanism
    const forecast = await generateForecastWithRetry(historical_data, forecast_type, timeframe);

    // Cache the result
    await cacheForecast(cacheKey, forecast);

    return new Response(
      JSON.stringify(forecast),
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

async function validateRequest(req: Request): Promise<{ 
  historical_data: HistoricalData[],
  forecast_type: string,
  timeframe: number
}> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const body = await req.json().catch(() => {
    throw new Error('Invalid JSON in request body');
  });

  if (!Array.isArray(body.historical_data) || body.historical_data.length < MIN_DATA_POINTS) {
    throw new Error(`Insufficient historical data. At least ${MIN_DATA_POINTS} data points required.`);
  }

  if (!body.forecast_type || !['revenue', 'expense', 'cashflow', 'budget'].includes(body.forecast_type)) {
    throw new Error('Invalid forecast type');
  }

  if (!body.timeframe || isNaN(body.timeframe) || body.timeframe < 1) {
    throw new Error('Invalid timeframe');
  }

  return body;
}

async function generateForecastWithRetry(
  historical_data: HistoricalData[],
  forecast_type: string,
  timeframe: number,
  retries = MAX_RETRIES
): Promise<ForecastResult> {
  try {
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    // Prepare the data for analysis
    const processedData = preprocessData(historical_data);

    // Generate the prompt
    const prompt = generateAnalysisPrompt(processedData, forecast_type, timeframe);

    // Get forecast from GPT-4
    const completion = await Promise.race([
      openai.createChatCompletion({
        model: "gpt-4",
        messages: [{
          role: "system",
          content: "You are an AI financial analyst specializing in forecasting."
        }, {
          role: "user",
          content: prompt
        }],
        temperature: 0.2,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Forecast generation timeout')), TIMEOUT))
    ]);

    const forecast = JSON.parse(completion.data.choices[0].message?.content || '{}');
    validateForecastResult(forecast);
    return forecast;

  } catch (error) {
    if (retries > 0 && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.response?.status === 429
    )) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return generateForecastWithRetry(historical_data, forecast_type, timeframe, retries - 1);
    }
    throw error;
  }
}

function preprocessData(data: HistoricalData[]): HistoricalData[] {
  return data
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(item => ({
      ...item,
      date: new Date(item.date).toISOString().split('T')[0],
      amount: Number(item.amount)
    }))
    .filter(item => !isNaN(item.amount));
}

function generateAnalysisPrompt(data: HistoricalData[], type: string, timeframe: number): string {
  const dataStats = calculateDataStats(data);
  
  return `Analyze this historical financial data and generate a forecast:
Historical Data Summary:
- Date Range: ${data[0].date} to ${data[data.length - 1].date}
- Total Records: ${data.length}
- Average Amount: ${dataStats.average}
- Standard Deviation: ${dataStats.stdDev}
- Trend: ${dataStats.trend}

Raw Data: ${JSON.stringify(data)}
Forecast Type: ${type}
Timeframe: ${timeframe} days

Generate a forecast with:
1. Daily predictions for ${timeframe} days
2. 95% confidence intervals
3. Accuracy score based on historical performance
4. Seasonal patterns and trends

Consider:
- Historical trends
- Seasonal patterns
- Day-of-week effects
- Monthly patterns
- Recent data weight
- Economic indicators

Provide the response in this JSON format:
{
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "data": {
    "dates": ["YYYY-MM-DD"],
    "values": [number],
    "confidence_intervals": {
      "lower": [number],
      "upper": [number]
    }
  },
  "accuracy_score": number,
  "patterns": {
    "seasonal": boolean,
    "trend": "up" | "down" | "stable"
  }
}`;
}

function calculateDataStats(data: HistoricalData[]) {
  const amounts = data.map(d => d.amount);
  const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  
  const variance = amounts.reduce((a, b) => a + Math.pow(b - average, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
  const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
  const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const trend = secondHalfAvg > firstHalfAvg ? 'up' : secondHalfAvg < firstHalfAvg ? 'down' : 'stable';

  return { average, stdDev, trend };
}

function validateForecastResult(forecast: any): void {
  if (!forecast.start_date || !forecast.end_date) {
    throw new Error('Invalid forecast: missing dates');
  }

  if (!forecast.data?.dates || !forecast.data?.values || 
      !Array.isArray(forecast.data.dates) || !Array.isArray(forecast.data.values)) {
    throw new Error('Invalid forecast: missing or invalid data arrays');
  }

  if (!forecast.data.confidence_intervals?.lower || !forecast.data.confidence_intervals?.upper) {
    throw new Error('Invalid forecast: missing confidence intervals');
  }

  if (typeof forecast.accuracy_score !== 'number' || 
      forecast.accuracy_score < 0 || forecast.accuracy_score > 1) {
    throw new Error('Invalid forecast: invalid accuracy score');
  }
}

function generateCacheKey(data: HistoricalData[], type: string, timeframe: number): string {
  const dataHash = btoa(JSON.stringify({
    lastDate: data[data.length - 1].date,
    type,
    timeframe
  }));
  return `forecast:${dataHash}`;
}

async function getCachedForecast(key: string): Promise<ForecastResult | null> {
  // Implement cache retrieval logic
  // For example, using Redis or a similar cache
  return null;
}

async function cacheForecast(key: string, forecast: ForecastResult): Promise<void> {
  // Implement caching logic
  // For example, using Redis or a similar cache
}

async function checkRateLimit(ip: string): Promise<boolean> {
  // Implement rate limiting logic
  // For example, using Redis or a similar cache
  return false;
}

async function logError(error: Error): Promise<void> {
  console.error('Forecast generation error:', {
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