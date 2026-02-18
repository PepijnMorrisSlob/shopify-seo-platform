/**
 * API Integration Usage Examples
 *
 * Demonstrates how to use all API integration services
 *
 * NOTE: These are examples only. Do not run directly in production.
 */

import {
  createShopifyClient,
  createGoogleSearchConsoleClient,
  createDataForSEOClient,
  createSEMrushClient,
  DATAFORSEO_LOCATIONS,
  SEMRUSH_DATABASES,
} from '../services';

// ============================================================================
// EXAMPLE 1: Shopify Product Sync
// ============================================================================

async function exampleShopifyProductSync() {
  // Mock organization from database
  const organization = {
    id: '123',
    shopifyDomain: 'example.myshopify.com',
    shopifyAccessToken: 'encrypted_token_here',
  };

  // Create Shopify client
  const shopify = await createShopifyClient(organization as any);

  console.log('=== Shopify Product Sync Example ===');

  // Start bulk import
  console.log('Starting bulk product import...');
  const bulkOp = await shopify.bulkImportProducts();
  console.log(`Bulk operation started: ${bulkOp.id}`);

  // Check status (would poll in real implementation)
  const status = await shopify.getBulkOperationStatus(bulkOp.id);
  console.log(`Status: ${status.status}, Objects: ${status.objectCount}`);

  // Sync a single product
  const product = await shopify.syncProduct('gid://shopify/Product/123456789');
  console.log(`Synced product: ${product.title}`);

  // Update product meta tags
  await shopify.updateProductMetaTags(
    'gid://shopify/Product/123456789',
    'Eco-Friendly Water Bottle - 32oz Stainless Steel',
    'Stay hydrated with our premium stainless steel water bottle. BPA-free, keeps drinks cold for 24h. Free shipping on orders over $50.'
  );
  console.log('Updated product SEO meta tags');

  // Create webhook subscriptions
  const webhooks = await shopify.createWebhookSubscriptions(
    'https://api.example.com/webhooks/shopify'
  );
  console.log(`Created ${webhooks.length} webhook subscriptions`);

  // Check rate limit status
  const rateLimit = await shopify.getRateLimitStatus();
  console.log(
    `Rate limit: ${rateLimit.currentPoints}/${rateLimit.maxPoints} points available`
  );
}

// ============================================================================
// EXAMPLE 2: Google Search Console Analytics
// ============================================================================

async function exampleGoogleSearchConsole() {
  console.log('=== Google Search Console Example ===');

  // Create GSC client
  const gsc = createGoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || '',
    redirectUri: 'http://localhost:3000/api/auth/google/callback',
    tokens: {
      // Would come from database after OAuth
      access_token: 'access_token_here',
      refresh_token: 'refresh_token_here',
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      token_type: 'Bearer',
      expiry_date: Date.now() + 3600000,
    },
  });

  const siteUrl = 'https://example.com';

  // Get top queries (last 30 days)
  const topQueries = await gsc.getTopQueries(siteUrl, 100, 30);
  console.log(`Top ${topQueries.length} queries:`);
  topQueries.slice(0, 10).forEach((query, index) => {
    console.log(
      `${index + 1}. "${query.query}": ${query.clicks} clicks, ${query.impressions} impressions, CTR ${(query.ctr * 100).toFixed(2)}%, Pos ${query.position.toFixed(1)}`
    );
  });

  // Get top pages
  const topPages = await gsc.getTopPages(siteUrl, 50, 30);
  console.log(`\nTop ${topPages.length} pages:`);
  topPages.slice(0, 5).forEach((page, index) => {
    console.log(
      `${index + 1}. ${page.page}: ${page.clicks} clicks, Pos ${page.position.toFixed(1)}`
    );
  });

  // Get performance for specific page
  const pagePerf = await gsc.getPagePerformance(
    siteUrl,
    'https://example.com/products/water-bottle',
    90
  );
  console.log(`\nPage performance data: ${pagePerf.rows?.length || 0} queries`);

  // Get performance for specific query
  const queryPerf = await gsc.getQueryPerformance(siteUrl, 'water bottle', 90);
  console.log(`\nQuery performance data: ${queryPerf.rows?.length || 0} pages`);
}

// ============================================================================
// EXAMPLE 3: DataForSEO Keyword Research
// ============================================================================

async function exampleDataForSEOKeywordResearch() {
  console.log('=== DataForSEO Keyword Research Example ===');

  // Create DataForSEO client
  const dataForSEO = createDataForSEOClient({
    login: process.env.DATAFORSEO_LOGIN || '',
    password: process.env.DATAFORSEO_PASSWORD || '',
  });

  // Get keyword data
  const keywords = [
    'shopify seo',
    'product optimization',
    'meta tags generator',
    'seo automation',
    'ecommerce seo',
  ];

  console.log('Fetching keyword data...');
  const keywordData = await dataForSEO.getKeywordData(
    keywords,
    DATAFORSEO_LOCATIONS.UNITED_STATES
  );

  console.log('\nKeyword Metrics:');
  keywordData.forEach((kw) => {
    console.log(
      `"${kw.keyword}": ${kw.search_volume} vol/mo, $${kw.cpc} CPC, ${kw.competition_level} competition`
    );
  });

  // Get SERP data
  console.log('\nAnalyzing SERP for "shopify seo"...');
  const serpData = await dataForSEO.getSERPData(
    'shopify seo',
    DATAFORSEO_LOCATIONS.UNITED_STATES
  );

  console.log(`Found ${serpData.items.length} SERP items`);
  serpData.items.slice(0, 10).forEach((item) => {
    if (item.type === 'organic') {
      console.log(`#${item.rank_absolute}: ${item.domain} - ${item.title}`);
    }
  });

  // Get keyword suggestions
  console.log('\nGetting keyword suggestions for "water bottle"...');
  const suggestions = await dataForSEO.getKeywordSuggestions(
    'water bottle',
    DATAFORSEO_LOCATIONS.UNITED_STATES,
    'en',
    50
  );

  console.log(`Found ${suggestions.length} suggestions:`);
  suggestions.slice(0, 10).forEach((suggestion) => {
    console.log(
      `"${suggestion.keyword}": ${suggestion.search_volume} vol/mo, $${suggestion.cpc} CPC`
    );
  });

  // Get related keywords with minimum search volume
  console.log('\nGetting high-volume related keywords...');
  const relatedKeywords = await dataForSEO.getRelatedKeywords(
    'water bottle',
    DATAFORSEO_LOCATIONS.UNITED_STATES,
    1000 // Min 1000 searches/month
  );

  console.log(`Found ${relatedKeywords.length} high-volume keywords:`);
  relatedKeywords.slice(0, 10).forEach((kw) => {
    console.log(`"${kw.keyword}": ${kw.search_volume} vol/mo`);
  });

  console.log(`\nTotal API cost: $${dataForSEO.getTotalCost().toFixed(4)}`);
}

// ============================================================================
// EXAMPLE 4: SEMrush Competitor Analysis
// ============================================================================

async function exampleSEMrushCompetitorAnalysis() {
  console.log('=== SEMrush Competitor Analysis Example ===');

  // Create SEMrush client
  const semrush = createSEMrushClient(process.env.SEMRUSH_API_KEY || '');

  const domain = 'example.com';

  // Get domain overview
  console.log(`Getting overview for ${domain}...`);
  const overview = await semrush.getDomainOverview(domain, SEMRUSH_DATABASES.UNITED_STATES);
  console.log('Domain Overview:');
  console.log(`- Organic Keywords: ${overview.organic_keywords}`);
  console.log(`- Organic Traffic: ${overview.organic_traffic}/month`);
  console.log(`- Organic Traffic Value: $${overview.organic_cost}/month`);

  // Get top ranking keywords
  console.log('\nGetting top 10 ranking keywords...');
  const topKeywords = await semrush.getTopRankingKeywords(
    domain,
    SEMRUSH_DATABASES.UNITED_STATES,
    10
  );

  topKeywords.forEach((kw) => {
    console.log(
      `#${kw.position}: "${kw.keyword}" (${kw.search_volume} vol/mo, ${kw.traffic.toFixed(0)} traffic)`
    );
  });

  // Get competitors
  console.log('\nFinding competitors...');
  const competitors = await semrush.getCompetitors(
    domain,
    SEMRUSH_DATABASES.UNITED_STATES,
    5
  );

  console.log(`Found ${competitors.length} competitors:`);
  competitors.forEach((comp, index) => {
    console.log(
      `${index + 1}. ${comp.domain} (${comp.commonKeywords} common keywords, ${comp.organicKeywords} total keywords)`
    );
  });

  // Find keyword gaps
  if (competitors.length > 0) {
    const competitor = competitors[0].domain;
    console.log(`\nFinding keyword gaps with ${competitor}...`);

    const gapKeywords = await semrush.getCompetitorKeywords(
      domain,
      competitor,
      SEMRUSH_DATABASES.UNITED_STATES,
      20
    );

    console.log(`Found ${gapKeywords.length} gap keywords:`);
    gapKeywords.slice(0, 10).forEach((kw) => {
      console.log(
        `"${kw.keyword}": #${kw.position} on ${kw.domain}, ${kw.search_volume} vol/mo, difficulty ${kw.keyword_difficulty}`
      );
    });
  }

  // Get backlink overview
  console.log('\nGetting backlink overview...');
  const backlinkOverview = await semrush.getBacklinkOverview(domain);
  console.log(`Total Backlinks: ${backlinkOverview.total_backlinks}`);
  console.log(`Referring Domains: ${backlinkOverview.referring_domains}`);
  console.log(`DoFollow Backlinks: ${backlinkOverview.dofollow_backlinks}`);
  console.log(`EDU Backlinks: ${backlinkOverview.edu_backlinks}`);
  console.log(`GOV Backlinks: ${backlinkOverview.gov_backlinks}`);

  console.log(`\nTotal API requests: ${semrush.getRequestCount()}`);
}

// ============================================================================
// EXAMPLE 5: Complete SEO Analysis Workflow
// ============================================================================

async function exampleCompleteSEOWorkflow() {
  console.log('=== Complete SEO Analysis Workflow ===');

  const domain = 'example.com';
  const productKeyword = 'eco water bottle';

  // 1. Get current search performance from GSC
  console.log('STEP 1: Getting current search performance...');
  const gsc = createGoogleSearchConsoleClient({
    clientId: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || '',
    redirectUri: 'http://localhost:3000/api/auth/google/callback',
  });

  const currentPerformance = await gsc.getTopQueries(`https://${domain}`, 100, 30);
  const currentKeywords = currentPerformance.map((q) => q.query);
  console.log(`Currently ranking for ${currentKeywords.length} queries`);

  // 2. Research keyword opportunities with DataForSEO
  console.log('\nSTEP 2: Researching keyword opportunities...');
  const dataForSEO = createDataForSEOClient({
    login: process.env.DATAFORSEO_LOGIN || '',
    password: process.env.DATAFORSEO_PASSWORD || '',
  });

  const suggestions = await dataForSEO.getRelatedKeywords(productKeyword, 2840, 500);
  console.log(`Found ${suggestions.length} keyword opportunities`);

  // Find keyword gaps (suggestions not in current keywords)
  const gaps = suggestions.filter(
    (s) => !currentKeywords.includes(s.keyword.toLowerCase())
  );
  console.log(`Identified ${gaps.length} keyword gaps to target`);

  // 3. Analyze competitor strategies with SEMrush
  console.log('\nSTEP 3: Analyzing competitor strategies...');
  const semrush = createSEMrushClient(process.env.SEMRUSH_API_KEY || '');

  const competitors = await semrush.getCompetitors(domain, SEMRUSH_DATABASES.UNITED_STATES, 3);
  console.log(`Found ${competitors.length} main competitors`);

  // 4. Get SERP analysis for target keyword
  console.log('\nSTEP 4: Analyzing SERP competition...');
  const serpData = await dataForSEO.getSERPData(productKeyword, 2840);
  const topCompetitors = serpData.items
    .filter((item) => item.type === 'organic')
    .slice(0, 5);

  console.log('Top 5 ranking pages:');
  topCompetitors.forEach((item) => {
    console.log(`#${item.rank_absolute}: ${item.domain} - ${item.title}`);
  });

  // 5. Update Shopify products with optimized SEO
  console.log('\nSTEP 5: Updating product SEO...');
  const shopify = await createShopifyClient({
    id: '123',
    shopifyDomain: 'example.myshopify.com',
    shopifyAccessToken: 'token',
  } as any);

  // Example: Update product with gap keyword
  const targetKeyword = gaps[0];
  await shopify.updateProductMetaTags(
    'gid://shopify/Product/123',
    `${targetKeyword.keyword} | Free Shipping - Example Store`,
    `Shop our premium ${targetKeyword.keyword}. ${targetKeyword.search_volume} searches/month. Limited time offer.`
  );

  console.log(`\nOptimized product for keyword: "${targetKeyword.keyword}"`);
  console.log(`Search volume: ${targetKeyword.search_volume}/month`);
  console.log(`Estimated CPC: $${targetKeyword.cpc}`);

  console.log('\n=== Workflow Complete ===');
  console.log(`Total DataForSEO cost: $${dataForSEO.getTotalCost().toFixed(4)}`);
  console.log(`Total SEMrush requests: ${semrush.getRequestCount()}`);
}

// ============================================================================
// RUN EXAMPLES
// ============================================================================

async function runAllExamples() {
  try {
    // Uncomment the examples you want to run:

    // await exampleShopifyProductSync();
    // await exampleGoogleSearchConsole();
    // await exampleDataForSEOKeywordResearch();
    // await exampleSEMrushCompetitorAnalysis();
    // await exampleCompleteSEOWorkflow();

    console.log('Examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Only run if executed directly (not imported)
if (require.main === module) {
  runAllExamples();
}

// Export examples for testing
export {
  exampleShopifyProductSync,
  exampleGoogleSearchConsole,
  exampleDataForSEOKeywordResearch,
  exampleSEMrushCompetitorAnalysis,
  exampleCompleteSEOWorkflow,
};
