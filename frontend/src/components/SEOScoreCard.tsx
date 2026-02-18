// SEO Score Card Component - Displays SEO score with visual indicator
import { Card, BlockStack, InlineStack, Text, ProgressBar, Badge } from '@shopify/polaris';

interface SEOScoreCardProps {
  score: number;
  breakdown?: {
    label: string;
    score: number;
    max: number;
  }[];
  showBreakdown?: boolean;
}

export function SEOScoreCard({ score, breakdown, showBreakdown = false }: SEOScoreCardProps) {
  const getScoreTone = (value: number): 'success' | 'attention' | 'critical' => {
    if (value >= 85) return 'success';
    if (value >= 70) return 'attention';
    return 'critical';
  };

  const getScoreLabel = (value: number): string => {
    if (value >= 85) return 'Excellent';
    if (value >= 70) return 'Good';
    if (value >= 50) return 'Needs Improvement';
    return 'Poor';
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h3" variant="headingSm">
            SEO Score
          </Text>
          <Badge tone={getScoreTone(score)}>{getScoreLabel(score)}</Badge>
        </InlineStack>

        <div>
          <InlineStack align="space-between">
            <Text as="p" variant="headingLg">
              {score}/100
            </Text>
          </InlineStack>
          <div style={{ marginTop: '8px' }}>
            <ProgressBar progress={score} size="small" tone={getScoreTone(score)} />
          </div>
        </div>

        {showBreakdown && breakdown && breakdown.length > 0 && (
          <BlockStack gap="300">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              Score Breakdown
            </Text>
            {breakdown.map((item, index) => (
              <div key={index}>
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm">
                    {item.label}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {item.score}/{item.max}
                  </Text>
                </InlineStack>
                <div style={{ marginTop: '4px' }}>
                  <ProgressBar
                    progress={(item.score / item.max) * 100}
                    size="small"
                    tone={getScoreTone((item.score / item.max) * 100)}
                  />
                </div>
              </div>
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}
