import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';
import { TrendingUp, Calendar, DollarSign, RefreshCw, Brain, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Forecast {
  id: string;
  forecast_type: string;
  start_date: string;
  end_date: string;
  forecast_data: {
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

export function FinancialForecasting() {
  const { profile } = useAuthStore();
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('revenue');
  const [timeframe, setTimeframe] = useState('30');

  useEffect(() => {
    if (profile?.company_id) {
      fetchForecasts();
    }
  }, [profile, selectedType]);

  const fetchForecasts = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_forecasts')
        .select('*')
        .eq('company_id', profile!.company_id)
        .eq('forecast_type', selectedType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setForecasts(data);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateForecast = async () => {
    setGenerating(true);
    try {
      // Fetch historical data
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', profile!.company_id)
        .order('date', { ascending: false })
        .limit(365); // Last year of data

      if (transactions) {
        // Call Edge Function to generate forecast
        const { data: forecast } = await supabase.functions.invoke('generate-forecast', {
          body: {
            historical_data: transactions,
            forecast_type: selectedType,
            timeframe: parseInt(timeframe)
          }
        });

        if (forecast) {
          // Save forecast
          const { error: saveError } = await supabase
            .from('financial_forecasts')
            .insert([{
              company_id: profile!.company_id,
              forecast_type: selectedType,
              start_date: forecast.start_date,
              end_date: forecast.end_date,
              forecast_data: forecast.data,
              accuracy_score: forecast.accuracy_score,
              patterns: forecast.patterns
            }]);

          if (saveError) throw saveError;
          fetchForecasts();
        }
      }
    } catch (error) {
      console.error('Error generating forecast:', error);
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getLatestForecast = () => {
    return forecasts[0];
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const latestForecast = getLatestForecast();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Financial Forecasting</h2>
        <div className="flex space-x-4">
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="revenue">Revenue</option>
            <option value="expense">Expenses</option>
            <option value="cashflow">Cash Flow</option>
            <option value="budget">Budget</option>
          </select>
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="30">Next 30 Days</option>
            <option value="90">Next 90 Days</option>
            <option value="180">Next 6 Months</option>
            <option value="365">Next Year</option>
          </select>
          <button
            onClick={generateForecast}
            disabled={generating}
            className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Brain className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Forecast'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {latestForecast && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Forecast Period</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {new Date(latestForecast.start_date).toLocaleDateString()} - {new Date(latestForecast.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projected Total</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {formatCurrency(latestForecast.forecast_data.values.reduce((a, b) => a + b, 0))}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Accuracy Score</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {(latestForecast.accuracy_score * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Trend</p>
                <p className={`mt-2 text-3xl font-semibold ${getTrendColor(latestForecast.patterns.trend)}`}>
                  {latestForecast.patterns.trend.toUpperCase()}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {latestForecast ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Forecast Projection</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={latestForecast.forecast_data.dates.map((date, i) => ({
                  date,
                  value: latestForecast.forecast_data.values[i],
                  lower: latestForecast.forecast_data.confidence_intervals.lower[i],
                  upper: latestForecast.forecast_data.confidence_intervals.upper[i]
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number)}
                  labelStyle={{ color: '#111827' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.375rem'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="transparent"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="transparent"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Forecast Available</h3>
          <p className="mt-2 text-gray-500">
            Generate a forecast to see projections and insights.
          </p>
        </div>
      )}
    </div>
  );
}