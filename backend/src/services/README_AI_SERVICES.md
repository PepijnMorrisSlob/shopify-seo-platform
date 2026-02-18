# Q&A Content Engine AI Services Documentation

## Overview

This document provides a comprehensive overview of the 7 new AI-powered services for the customizable Q&A content engine, plus the updated AIContentService with business-aware generation.

---

## Services Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Q&A CONTENT ENGINE                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
   ┌────▼────┐          ┌────▼────┐           ┌────▼────┐
   │Business │          │Question │           │   AI    │
   │Intel    │          │Discovery│           │Content  │
   └────┬────┘          └────┬────┘           └────┬────┘
        │                    │                      │
   ┌────▼──────────────┬────▼─────────┬───────────▼─────┐
   │                   │              │                  │
┌──▼──────┐     ┌─────▼─────┐  ┌────▼────┐      ┌─────▼─────┐
│Internal │     │Content Gap│  │   Auto  │      │A/B Testing│
│Linking  │     │Analysis   │  │Optimize │      │           │
└─────────┘     └───────────┘  └─────────┘      └───────────┘
```

---

## 1. BusinessIntelligenceService

**File:** `business-intelligence-service.ts`

**Purpose:** Analyzes businesses during onboarding to understand their unique characteristics and generate custom strategies.

### Key Features:

- **Product Catalog Analysis**
  - Extracts product categories and types
  - Identifies common features and USPs
  - Analyzes price positioning (budget/mid-range/premium)
  - Determines target customer demographics

- **Brand Voice Learning**
  - Analyzes example content to extract writing style
  - Determines tone, formality level (0-10 scale)
  - Identifies sentence structure patterns
  - Extracts vocabulary level and common phrases
  - Captures personality traits

- **Competitor Analysis**
  - Scrapes and analyzes competitor content
  - Identifies topics competitors cover
  - Finds content gaps and opportunities
  - Assesses strengths and weaknesses

- **Custom Template Generation**
  - Creates 50+ business-specific question templates
  - Tailored to products, audience, and industry
  - Exploits competitor gaps
  - Matches brand voice and goals

### Main Methods:

```typescript
analyzeBusinessContext(shopifyDomain, profile, products): Promise<BusinessContext>
analyzeProducts(products, industry): Promise<ProductAnalysis>
analyzeBrandVoice(exampleContent): Promise<BrandVoiceProfile>
analyzeCompetitors(competitorUrls): Promise<CompetitorInsights[]>
generateCustomQuestionTemplates(context): Promise<QuestionTemplate[]>
```

### Usage Example:

```typescript
const biService = new BusinessIntelligenceService();

const context = await biService.analyzeBusinessContext(
  'mystore.myshopify.com',
  businessProfile,
  shopifyProducts
);

// context contains:
// - productInsights (categories, features, pricing)
// - brandVoiceProfile (tone, style, vocabulary)
// - competitorInsights (gaps, opportunities)
// - customTemplates (50+ question templates)
```

---

## 2. QuestionDiscoveryService

**File:** `question-discovery-service.ts`

**Purpose:** Discovers high-value questions to answer through multiple sources.

### Question Sources:

1. **People Also Ask (PAA)** - via DataForSEO API
2. **Competitor Content** - scraped and analyzed
3. **Custom Templates** - filled with business data
4. **AI Generation** - Claude-powered custom questions

### Key Features:

- **Multi-Source Discovery**
  - Aggregates questions from 4 different sources
  - Deduplicates similar questions
  - Prioritizes by search volume, difficulty, and relevance

- **Smart Categorization**
  - how-to, comparison, definition, explanation
  - buying-guide, troubleshooting, advice

- **Content Gap Identification**
  - Finds questions competitors answer that you don't
  - Identifies keyword gaps
  - Detects seasonal opportunities

- **Priority Scoring**
  - Search volume weighting
  - Pain point matching
  - Source quality (PAA > competitors > templates)

### Main Methods:

```typescript
discoverQuestions(businessContext, targetKeywords): Promise<Question[]>
discoverFromPAA(keywords): Promise<Question[]>
discoverFromCompetitors(competitorInsights): Promise<Question[]>
generateFromTemplates(templates, productInsights): Promise<Question[]>
generateAIQuestions(businessContext): Promise<Question[]>
findContentGaps(yourDomain, yourQuestions, competitors): Promise<ContentGap[]>
```

### Usage Example:

```typescript
const discoveryService = new QuestionDiscoveryService();

const questions = await discoveryService.discoverQuestions(
  businessContext,
  ['coffee', 'espresso', 'brewing']
);

// Returns prioritized questions like:
// - "How to brew the perfect espresso at home" (priority: 9)
// - "What grind size for French press coffee" (priority: 8)
// - "Coffee beans vs ground coffee - which is better" (priority: 7)
```

---

## 3. PerplexityService

**File:** `perplexity-service.ts`

**Purpose:** Real-time research and fact-checking using Perplexity AI.

### Key Features:

- **Deep Research**
  - Fetches up-to-date information
  - Extracts factual data with citations
  - Identifies recent updates and trends

- **Fact Verification**
  - Verifies specific claims
  - Provides evidence for/against
  - Cites authoritative sources

- **Statistical Data Extraction**
  - Pulls latest statistics
  - Includes source attribution
  - Validates data accuracy

### Depth Levels:

- **Basic:** Concise, key points only
- **Thorough:** Comprehensive with examples and evidence
- **Expert:** Deep analysis with latest research and statistics

### Main Methods:

```typescript
research(question, options): Promise<ResearchResult>
verifyClaims(claims): Promise<VerificationResult[]>
getLatestInformation(topic, since): Promise<string[]>
```

### Usage Example:

```typescript
const perplexity = new PerplexityService();

const research = await perplexity.research(
  'How to choose the best coffee beans',
  {
    depth: 'thorough',
    dateFilter: 'last_6_months'
  }
);

// Returns:
// - factualInformation: ["Arabica beans have smoother flavor", ...]
// - statistics: [{ claim: "70% of coffee is Arabica", source: "..." }]
// - citations: [{ url: "...", title: "..." }]
// - recentUpdates: ["New study shows...", ...]
```

---

## 4. AdvancedInternalLinkingService

**File:** `advanced-internal-linking-service.ts`

**Purpose:** AI-powered contextual internal linking using semantic similarity.

### Key Features:

- **Semantic Similarity Linking**
  - Uses OpenAI embeddings (text-embedding-3-small)
  - Calculates cosine similarity between pages
  - Only links highly relevant content (>0.7 similarity)

- **Natural Anchor Text Generation**
  - GPT-4 powered contextual anchor text
  - 2-5 words, descriptive, not generic
  - Matches content context

- **Link Graph Optimization**
  - Detects orphan pages (no inbound links)
  - Identifies hub pages (high authority)
  - Balances link distribution
  - Prevents over-linking

### Main Methods:

```typescript
generateContextualLinks(content, currentPageId, availablePages, maxLinks): Promise<InternalLink[]>
optimizeLinkGraph(organizationId, allPages): Promise<LinkOpportunity[]>
calculateLinkGraphMetrics(pages): Promise<LinkGraphMetrics>
```

### Algorithm:

```
1. Get embedding for current content
2. Calculate similarity with all available pages
3. Filter by threshold (>0.7)
4. Sort by relevance
5. Generate AI anchor text for top matches
6. Return contextual links with metadata
```

### Usage Example:

```typescript
const linkingService = new AdvancedInternalLinkingService();

const links = await linkingService.generateContextualLinks(
  articleContent,
  'page-123',
  allPages,
  5 // max 5 links
);

// Returns links like:
// {
//   targetUrl: '/products/espresso-machine',
//   anchorText: 'automatic espresso machines',
//   relevanceScore: 0.87,
//   linkType: 'contextual'
// }
```

---

## 5. AutoOptimizationService

**File:** `auto-optimization-service.ts`

**Purpose:** Monitors content performance and automatically optimizes underperforming pages.

### Detection Criteria:

- **Ranking Decline:** >5 position drop
- **Traffic Decline:** >20% traffic drop
- **Low Engagement:** >70% bounce rate

### Key Features:

- **Performance Monitoring**
  - Tracks rankings, traffic, engagement
  - Detects declining performance
  - Identifies optimization needs

- **Automatic Content Refresh**
  - Researches latest information (via Perplexity)
  - Updates statistics and data
  - Preserves structure and tone
  - Enhances with new insights

- **Smart Recommendations**
  - Prioritized action items
  - Automation flags
  - Time estimates

### Main Methods:

```typescript
analyzePage(pageId, performance, content): Promise<OptimizationAnalysis>
refreshContent(pageId, originalContent, topic): Promise<string>
```

### Optimization Strategy:

```
IF ranking_decline > 5:
  → Refresh content with latest info

IF traffic_decline > 20%:
  → Optimize title/meta for higher CTR

IF bounce_rate > 70%:
  → Improve structure and add visuals
```

### Usage Example:

```typescript
const optimizer = new AutoOptimizationService();

const analysis = await optimizer.analyzePage(
  'page-123',
  performanceData,
  currentContent
);

if (analysis.status === 'critical') {
  const refreshed = await optimizer.refreshContent(
    'page-123',
    currentContent,
    'coffee brewing methods'
  );
  // Auto-publish refreshed content
}
```

---

## 6. ContentGapAnalysisService

**File:** `content-gap-analysis-service.ts`

**Purpose:** Identifies content opportunities by analyzing gaps.

### Gap Types:

1. **Competitor Topics** - Topics competitors cover that you don't
2. **Unanswered PAA** - Google PAA questions you haven't answered
3. **Keyword Gaps** - Keywords competitors rank for that you don't
4. **Seasonal Opportunities** - Trending topics in your industry

### Key Features:

- **Comprehensive Gap Detection**
  - Analyzes multiple competitors simultaneously
  - Identifies high-value opportunities
  - Prioritizes by search volume and difficulty

- **Smart Prioritization**
  - Higher search volume = higher priority
  - Lower difficulty = higher priority
  - Multiple competitors covering = higher priority

### Main Methods:

```typescript
analyzeGaps(organizationId, yourContent, competitorContent): Promise<GapAnalysisResult>
findKeywordGaps(yourKeywords, competitorKeywords): Promise<string[]>
```

### Usage Example:

```typescript
const gapService = new ContentGapAnalysisService();

const gaps = await gapService.analyzeGaps(
  'org-123',
  myQuestions,
  competitorData
);

// Returns top opportunities:
// {
//   type: 'competitor_topic',
//   topic: 'How to clean espresso machine',
//   estimatedSearchVolume: 2500,
//   difficulty: 45,
//   competitorsCoveringTopic: ['competitor1.com', 'competitor2.com'],
//   priority: 8
// }
```

---

## 7. ABTestingService

**File:** `ab-testing-service.ts`

**Purpose:** Creates and evaluates A/B tests for content optimization.

### Testable Elements:

- **Title** - Meta title variations
- **Meta Description** - Description variations
- **H2s** - Heading variations
- **CTA** - Call-to-action variations
- **Intro** - Introduction paragraph variations

### Key Features:

- **Traffic Splitting**
  - Control: 33%, Variant A: 33%, Variant B: 34%
  - Minimum sample size validation
  - Duration management (default: 14 days)

- **Statistical Analysis**
  - Click-through rate comparison
  - Conversion rate tracking
  - Revenue per click calculation
  - Confidence level computation

- **Winner Application**
  - Automatic winner detection
  - One-click application to page
  - Performance improvement tracking

### Main Methods:

```typescript
createTest(pageId, orgId, elementType, control, variantA, variantB): Promise<ABTest>
evaluateTest(test): Promise<TestResults>
applyWinner(testId, winner): Promise<void>
```

### Usage Example:

```typescript
const abService = new ABTestingService();

const test = await abService.createTest(
  'page-123',
  'org-456',
  'title',
  'How to Brew Coffee at Home',
  'Master Coffee Brewing: Complete Home Guide',
  'Coffee Brewing 101: Perfect Cup Every Time'
);

// After 14 days:
const results = await abService.evaluateTest(test);
// {
//   winningVariation: 'variantB',
//   improvementPercentage: 23.5,
//   confidence: 0.95
// }

await abService.applyWinner(test.id, results.winningVariation);
```

---

## 8. SchemaService

**File:** `schema-service.ts`

**Purpose:** Generates Schema.org structured data for SEO.

### Supported Schemas:

- **FAQPage** - For Q&A content
- **Article** - For blog posts
- **Product** - For product pages (future)
- **HowTo** - For tutorials (future)

### Main Methods:

```typescript
generateFAQSchema(question, answer, relatedFAQs): FAQSchema
generateArticleSchema(headline, description, ...): ArticleSchema
validateSchema(schema): { valid: boolean, errors: string[] }
```

---

## 9. SEOValidatorService

**File:** `seo-validator-service.ts`

**Purpose:** Validates content against SEO best practices.

### Validation Checks:

1. **Keyword Density** - 1-3% ideal
2. **Word Count** - 1000+ recommended
3. **Heading Structure** - H1 + multiple H2s
4. **Meta Title** - 30-60 characters
5. **Meta Description** - 120-160 characters
6. **Internal Links** - 3+ recommended

### Severity Levels:

- **Critical:** H1 missing, keyword missing, meta title issues
- **Important:** Word count low, few internal links
- **Optional:** Minor optimizations

### Main Methods:

```typescript
validate(content, options): Promise<SEOValidationResult>
```

### Usage Example:

```typescript
const validator = new SEOValidatorService();

const result = await validator.validate(content, {
  targetKeyword: 'coffee brewing',
  metaTitle: 'How to Brew Coffee',
  metaDescription: '...'
});

// Returns:
// {
//   overallScore: 87,
//   passed: true,
//   errors: [],
//   warnings: [...],
//   recommendations: [...]
// }
```

---

## 10. AIContentService (Updated)

**File:** `ai-content-service.ts`

**Purpose:** Multi-model AI content generation with NEW business-aware Q&A method.

### NEW Method: `generateQAContent()`

**Signature:**
```typescript
async generateQAContent(
  question: string,
  businessProfile: BusinessProfile,
  researchResult: ResearchResult,
  relatedProducts: Product[]
): Promise<QAContent>
```

**Features:**

- **Brand Voice Matching**
  - Analyzes example content
  - Matches tone, personality, vocabulary
  - Avoids/prefers specific words
  - Maintains formality level

- **Audience Targeting**
  - Adjusts complexity for expertise level
  - Addresses specific pain points
  - Uses appropriate demographics language

- **Product Integration**
  - Natural product mentions (minimal/moderate/aggressive)
  - Contextual product recommendations
  - CTA style matching (soft/direct/educational)

- **SEO Optimization**
  - 1-2% keyword density
  - Proper H1/H2/H3 structure
  - FAQ section for featured snippets
  - Meta tag optimization

### Content Structure:

```
1. Introduction (100-150 words)
   - Direct answer to question
   - Hook reader

2. Main Content (60% of word count)
   - Detailed H2/H3 sections
   - Factual information from research
   - Examples and explanations

3. Product Recommendations (20% of word count)
   - Natural mentions
   - Benefits explained
   - Contextually relevant

4. FAQ Section (3-5 questions)
   - Related questions
   - Schema markup ready

5. Conclusion (100 words)
   - Summary
   - CTA matching brand style
```

### Usage Example:

```typescript
const aiService = new AIContentService();

const qaContent = await aiService.generateQAContent(
  'How to choose the best coffee beans?',
  businessProfile,
  perplexityResearch,
  relatedCoffeeProducts
);

// Returns:
// {
//   content: '<h1>How to Choose...</h1><p>...</p>...',
//   wordCount: 1247,
//   metadata: { tokens: 3542, cost: 0.053 }
// }
```

---

## Service Integration Flow

### Complete Q&A Content Generation Pipeline:

```typescript
// 1. Business Intelligence (One-time onboarding)
const biService = new BusinessIntelligenceService();
const context = await biService.analyzeBusinessContext(domain, profile, products);

// 2. Question Discovery
const discoveryService = new QuestionDiscoveryService();
const questions = await discoveryService.discoverQuestions(context, keywords);

// 3. Research (Perplexity)
const perplexity = new PerplexityService();
const research = await perplexity.research(questions[0].question, { depth: 'thorough' });

// 4. Content Generation
const aiService = new AIContentService();
const qaContent = await aiService.generateQAContent(
  questions[0].question,
  context.profile,
  research,
  relatedProducts
);

// 5. Internal Linking
const linkingService = new AdvancedInternalLinkingService();
const links = await linkingService.generateContextualLinks(
  qaContent.content,
  pageId,
  allPages
);

// 6. Schema Generation
const schemaService = new SchemaService();
const schema = schemaService.generateFAQSchema(question, qaContent.content);

// 7. SEO Validation
const validator = new SEOValidatorService();
const seoScore = await validator.validate(qaContent.content, {
  targetKeyword: questions[0].relatedKeywords[0],
  metaTitle: generateTitle(question),
  metaDescription: generateDescription(qaContent.content)
});

// 8. Publish if score >= 85, otherwise manual review
if (seoScore.overallScore >= 85) {
  await shopifyBlogService.createBlogPost({
    title: question,
    body_html: qaContent.content,
    metafields: { schema }
  });
}

// 9. Monitor Performance (Daily)
const optimizer = new AutoOptimizationService();
// ... runs automatically

// 10. A/B Testing (Ongoing)
const abService = new ABTestingService();
// ... tests title variations
```

---

## Environment Variables Required

```env
ANTHROPIC_API_KEY=sk-ant-...        # Claude Sonnet 4
OPENAI_API_KEY=sk-...               # GPT-4 + Embeddings
PERPLEXITY_API_KEY=pplx-...         # Perplexity Sonar Pro
DATAFORSEO_LOGIN=...                # DataForSEO (PAA)
DATAFORSEO_PASSWORD=...             # DataForSEO
```

---

## Performance Considerations

### Caching:

- **Embeddings:** Cached to avoid redundant API calls
- **Research Results:** Cached for 24h per question
- **Brand Voice:** Cached per organization (refresh monthly)

### Rate Limiting:

- **Perplexity:** 60 requests/minute
- **OpenAI:** 10,000 requests/minute
- **Claude:** 50 requests/minute

### Cost Optimization:

- **Use GPT-3.5** for simple tasks (anchor text, short content)
- **Use GPT-4** for complex content (1000+ words)
- **Use Claude Sonnet 4** for long-form, brand-aware content
- **Use Perplexity** only for fact-checking and research

### Typical Costs per Q&A Page:

```
Business Intelligence: $0.10 (one-time)
Question Discovery:    $0.05
Research (Perplexity): $0.03
Content Generation:    $0.15 (Claude Sonnet 4)
Internal Linking:      $0.02 (embeddings)
Total per page:        ~$0.25
```

---

## Testing

Each service includes comprehensive error handling and fallbacks. See `__tests__/qa-content-integration.test.ts` for integration tests.

---

## Next Steps

1. **Database Migration:** Run Prisma migrations to add new tables
2. **Frontend Integration:** Build UI for question discovery and content review
3. **Shopify Integration:** Connect publishing workflow
4. **Monitoring Setup:** CloudWatch alarms for queue depth and failures
5. **Beta Testing:** 5 businesses, different industries

---

## Support

For questions or issues:
- **Documentation:** `/docs/QA_CONTENT_GUIDE.md`
- **API Reference:** Each service includes JSDoc comments
- **Examples:** See `/examples/qa-content-generation.ts`
