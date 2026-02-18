// Performance Chart Component - Line chart for Q&A page performance
import { Card, BlockStack, Text, Select } from '@shopify/polaris';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { usePerformance } from '../hooks/usePerformance';

interface PerformanceChartProps {
  pageId?: string;
  title?: string;
}

export function PerformanceChart({ pageId, title = 'Performance Over Time' }: PerformanceChartProps) {
  const [metric, setMetric] = useState<'traffic' | 'clicks' | 'impressions' | 'position'>('traffic');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  const today = new Date();
  const daysAgo = new Date(today.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);

  const { data, isLoading } = usePerformance(
    pageId,
    daysAgo.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  );

  if (isLoading) {
    return (
      <Card>
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Text as="p" variant="bodySm" tone="subdued">
            Loading chart...
          </Text>
        </div>
      </Card>
    );
  }

  const chartData = data?.performance?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: metric === 'traffic'
      ? item.pageviews
      : metric === 'clicks'
      ? item.clicks
      : metric === 'impressions'
      ? item.impressions
      : item.avgPosition,
  })) || [];

  const metricLabel = {
    traffic: 'Traffic (Pageviews)',
    clicks: 'Clicks',
    impressions: 'Impressions',
    position: 'Average Position',
  }[metric];

  return (
    <Card>
      <BlockStack gap="400">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text as="h3" variant="headingMd">
            {title}
          </Text>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ minWidth: '150px' }}>
              <Select
                label=""
                labelHidden
                options={[
                  { label: 'Traffic', value: 'traffic' },
                  { label: 'Clicks', value: 'clicks' },
                  { label: 'Impressions', value: 'impressions' },
                  { label: 'Position', value: 'position' },
                ]}
                value={metric}
                onChange={(value) => setMetric(value as any)}
              />
            </div>
            <div style={{ minWidth: '120px' }}>
              <Select
                label=""
                labelHidden
                options={[
                  { label: 'Last 7 Days', value: '7' },
                  { label: 'Last 30 Days', value: '30' },
                  { label: 'Last 90 Days', value: '90' },
                ]}
                value={dateRange}
                onChange={(value) => setDateRange(value as any)}
              />
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#6D7175"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#6D7175"
                  label={{ value: metricLabel, angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E1E3E5',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#008060"
                  strokeWidth={2}
                  dot={{ fill: '#008060', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Text as="p" variant="bodySm" tone="subdued">
              No data available for the selected period
            </Text>
          </div>
        )}
      </BlockStack>
    </Card>
  );
}
