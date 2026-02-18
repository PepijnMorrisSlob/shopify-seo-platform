/**
 * Topical Map Controller
 * Shopify SEO Platform
 *
 * API endpoints for topical authority / content clustering:
 * - GET    /api/topical-map/clusters           - List all topic clusters for the org
 * - POST   /api/topical-map/clusters           - Create a new topic cluster (hub topic)
 * - GET    /api/topical-map/clusters/:id       - Get cluster detail with all content items
 * - POST   /api/topical-map/clusters/:id/topics - Add a spoke topic to cluster
 * - DELETE /api/topical-map/clusters/:id       - Delete cluster
 * - POST   /api/topical-map/generate           - AI-generate a topical map for a seed keyword
 * - GET    /api/topical-map/gaps               - Get content gaps across all clusters
 * - POST   /api/topical-map/auto-categorize    - Auto-categorize existing content into clusters
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopicItem {
  id: string;
  title: string;
  keyword: string;
  searchVolume: number;
  difficulty: number;
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  status: 'published' | 'draft' | 'gap' | 'planned' | 'in_progress';
  qaPageId?: string;
  url?: string;
  position?: number;
  monthlyTraffic?: number;
}

interface TopicCluster {
  id: string;
  organizationId: string;
  name: string;
  pillarTopic: string;
  pillarKeyword: string;
  searchVolume: number;
  topics: TopicItem[];
  coverage: number;
  totalTopics: number;
  publishedTopics: number;
  status: 'strong' | 'growing' | 'weak';
  createdAt: string;
  updatedAt: string;
}

interface ContentGap {
  clusterId: string;
  clusterName: string;
  topic: TopicItem;
  priority: 'high' | 'medium' | 'low';
  opportunityScore: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Mock Data - Realistic topic clusters for an e-commerce store
// ---------------------------------------------------------------------------

function buildMockClusters(organizationId: string): TopicCluster[] {
  const now = new Date().toISOString();
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

  return [
    {
      id: 'cluster-bedding',
      organizationId,
      name: 'Bedding & Sleep',
      pillarTopic: 'Complete Guide to Choosing Bed Sheets',
      pillarKeyword: 'bed sheets guide',
      searchVolume: 12400,
      totalTopics: 12,
      publishedTopics: 8,
      coverage: 67,
      status: 'growing',
      createdAt: daysAgo(45),
      updatedAt: daysAgo(2),
      topics: [
        { id: 't-bed-1', title: 'What Thread Count is Best for Sheets?', keyword: 'best thread count sheets', searchVolume: 8100, difficulty: 45, searchIntent: 'informational', status: 'published', position: 4, monthlyTraffic: 1250 },
        { id: 't-bed-2', title: 'Egyptian Cotton vs Supima Cotton Sheets', keyword: 'egyptian cotton vs supima', searchVolume: 3200, difficulty: 38, searchIntent: 'commercial', status: 'published', position: 7, monthlyTraffic: 480 },
        { id: 't-bed-3', title: 'How to Wash Silk Sheets Without Damage', keyword: 'wash silk sheets', searchVolume: 2900, difficulty: 22, searchIntent: 'informational', status: 'gap' },
        { id: 't-bed-4', title: 'Best Sheets for Hot Sleepers', keyword: 'best sheets hot sleepers', searchVolume: 6800, difficulty: 52, searchIntent: 'commercial', status: 'published', position: 12, monthlyTraffic: 320 },
        { id: 't-bed-5', title: 'Linen vs Cotton Sheets: Which is Better?', keyword: 'linen vs cotton sheets', searchVolume: 4500, difficulty: 41, searchIntent: 'informational', status: 'published', position: 6, monthlyTraffic: 780 },
        { id: 't-bed-6', title: 'How Often Should You Replace Bed Sheets?', keyword: 'replace bed sheets how often', searchVolume: 3100, difficulty: 28, searchIntent: 'informational', status: 'published', position: 3, monthlyTraffic: 920 },
        { id: 't-bed-7', title: 'Organic Bed Sheets: Are They Worth the Price?', keyword: 'organic bed sheets worth it', searchVolume: 1800, difficulty: 35, searchIntent: 'commercial', status: 'published', position: 9, monthlyTraffic: 210 },
        { id: 't-bed-8', title: 'Percale vs Sateen: What is the Difference?', keyword: 'percale vs sateen', searchVolume: 5400, difficulty: 39, searchIntent: 'informational', status: 'published', position: 5, monthlyTraffic: 890 },
        { id: 't-bed-9', title: 'How to Remove Yellow Stains from White Sheets', keyword: 'remove yellow stains white sheets', searchVolume: 4200, difficulty: 25, searchIntent: 'informational', status: 'gap' },
        { id: 't-bed-10', title: 'Best Hypoallergenic Sheets for Sensitive Skin', keyword: 'hypoallergenic sheets sensitive skin', searchVolume: 2100, difficulty: 33, searchIntent: 'commercial', status: 'planned' },
        { id: 't-bed-11', title: 'What Size Sheets for Adjustable Beds?', keyword: 'sheets for adjustable beds', searchVolume: 1400, difficulty: 19, searchIntent: 'informational', status: 'gap' },
        { id: 't-bed-12', title: 'Bamboo Sheets Review: Pros and Cons', keyword: 'bamboo sheets review', searchVolume: 3600, difficulty: 47, searchIntent: 'commercial', status: 'published', position: 14, monthlyTraffic: 190 },
      ],
    },
    {
      id: 'cluster-leather',
      organizationId,
      name: 'Leather Care & Accessories',
      pillarTopic: 'Ultimate Leather Care Guide',
      pillarKeyword: 'leather care guide',
      searchVolume: 9800,
      totalTopics: 10,
      publishedTopics: 8,
      coverage: 80,
      status: 'strong',
      createdAt: daysAgo(60),
      updatedAt: daysAgo(1),
      topics: [
        { id: 't-lth-1', title: 'How to Store Leather Bags to Prevent Cracking', keyword: 'store leather bags prevent cracking', searchVolume: 5200, difficulty: 32, searchIntent: 'informational', status: 'published', position: 3, monthlyTraffic: 1650 },
        { id: 't-lth-2', title: 'Best Leather Conditioner for Bags', keyword: 'best leather conditioner bags', searchVolume: 4800, difficulty: 48, searchIntent: 'commercial', status: 'published', position: 8, monthlyTraffic: 520 },
        { id: 't-lth-3', title: 'How to Remove Stains from Leather', keyword: 'remove stains leather', searchVolume: 7200, difficulty: 35, searchIntent: 'informational', status: 'published', position: 5, monthlyTraffic: 1120 },
        { id: 't-lth-4', title: 'Genuine Leather vs Faux Leather: How to Tell', keyword: 'genuine vs faux leather', searchVolume: 6100, difficulty: 42, searchIntent: 'informational', status: 'published', position: 6, monthlyTraffic: 890 },
        { id: 't-lth-5', title: 'How to Break in a New Leather Bag', keyword: 'break in leather bag', searchVolume: 2800, difficulty: 24, searchIntent: 'informational', status: 'published', position: 4, monthlyTraffic: 620 },
        { id: 't-lth-6', title: 'Types of Leather: Full Grain vs Top Grain', keyword: 'full grain vs top grain leather', searchVolume: 3900, difficulty: 38, searchIntent: 'informational', status: 'published', position: 7, monthlyTraffic: 540 },
        { id: 't-lth-7', title: 'Can You Waterproof Leather?', keyword: 'waterproof leather', searchVolume: 3400, difficulty: 29, searchIntent: 'informational', status: 'published', position: 9, monthlyTraffic: 380 },
        { id: 't-lth-8', title: 'How to Fix Scratched Leather', keyword: 'fix scratched leather', searchVolume: 4100, difficulty: 27, searchIntent: 'informational', status: 'published', position: 5, monthlyTraffic: 760 },
        { id: 't-lth-9', title: 'Vegan Leather Alternatives: Complete Guide', keyword: 'vegan leather alternatives', searchVolume: 2600, difficulty: 44, searchIntent: 'informational', status: 'gap' },
        { id: 't-lth-10', title: 'How Long Does Quality Leather Last?', keyword: 'how long leather lasts', searchVolume: 1900, difficulty: 21, searchIntent: 'informational', status: 'gap' },
      ],
    },
    {
      id: 'cluster-sustainable',
      organizationId,
      name: 'Sustainable Fashion',
      pillarTopic: 'Guide to Sustainable Fashion Shopping',
      pillarKeyword: 'sustainable fashion guide',
      searchVolume: 14800,
      totalTopics: 8,
      publishedTopics: 3,
      coverage: 38,
      status: 'weak',
      createdAt: daysAgo(30),
      updatedAt: daysAgo(5),
      topics: [
        { id: 't-sus-1', title: 'What is Sustainable Fashion?', keyword: 'what is sustainable fashion', searchVolume: 9200, difficulty: 55, searchIntent: 'informational', status: 'published', position: 11, monthlyTraffic: 420 },
        { id: 't-sus-2', title: 'Best Sustainable Clothing Brands in 2026', keyword: 'best sustainable clothing brands', searchVolume: 7800, difficulty: 62, searchIntent: 'commercial', status: 'published', position: 18, monthlyTraffic: 150 },
        { id: 't-sus-3', title: 'Organic Cotton vs Conventional Cotton', keyword: 'organic vs conventional cotton difference', searchVolume: 5200, difficulty: 38, searchIntent: 'informational', status: 'published', position: 7, monthlyTraffic: 520 },
        { id: 't-sus-4', title: 'How to Build a Capsule Wardrobe', keyword: 'build capsule wardrobe', searchVolume: 6500, difficulty: 51, searchIntent: 'informational', status: 'planned' },
        { id: 't-sus-5', title: 'Fast Fashion Impact on the Environment', keyword: 'fast fashion environmental impact', searchVolume: 4800, difficulty: 47, searchIntent: 'informational', status: 'gap' },
        { id: 't-sus-6', title: 'How to Recycle Old Clothes', keyword: 'recycle old clothes', searchVolume: 3600, difficulty: 30, searchIntent: 'informational', status: 'gap' },
        { id: 't-sus-7', title: 'What Certifications to Look for in Eco Clothing', keyword: 'eco clothing certifications', searchVolume: 1800, difficulty: 26, searchIntent: 'informational', status: 'gap' },
        { id: 't-sus-8', title: 'Cost of Sustainable Fashion: Is It Worth It?', keyword: 'sustainable fashion worth the cost', searchVolume: 2400, difficulty: 34, searchIntent: 'commercial', status: 'gap' },
      ],
    },
    {
      id: 'cluster-running',
      organizationId,
      name: 'Running & Fitness',
      pillarTopic: 'Complete Running Gear Guide for Beginners',
      pillarKeyword: 'running gear guide beginners',
      searchVolume: 11200,
      totalTopics: 10,
      publishedTopics: 6,
      coverage: 60,
      status: 'growing',
      createdAt: daysAgo(55),
      updatedAt: daysAgo(3),
      topics: [
        { id: 't-run-1', title: 'How to Choose Running Shoes for Beginners', keyword: 'choose running shoes beginners', searchVolume: 8100, difficulty: 48, searchIntent: 'informational', status: 'published', position: 4, monthlyTraffic: 1200 },
        { id: 't-run-2', title: 'Best Running Socks to Prevent Blisters', keyword: 'best running socks blisters', searchVolume: 3400, difficulty: 35, searchIntent: 'commercial', status: 'published', position: 8, monthlyTraffic: 410 },
        { id: 't-run-3', title: 'When to Replace Running Shoes', keyword: 'when replace running shoes', searchVolume: 4600, difficulty: 30, searchIntent: 'informational', status: 'published', position: 5, monthlyTraffic: 780 },
        { id: 't-run-4', title: 'Trail Running Shoes vs Road Running Shoes', keyword: 'trail vs road running shoes', searchVolume: 5200, difficulty: 44, searchIntent: 'informational', status: 'published', position: 9, monthlyTraffic: 390 },
        { id: 't-run-5', title: 'Best Running Gear for Cold Weather', keyword: 'running gear cold weather', searchVolume: 3800, difficulty: 41, searchIntent: 'commercial', status: 'published', position: 11, monthlyTraffic: 260 },
        { id: 't-run-6', title: 'How to Pick the Right Sports Bra for Running', keyword: 'sports bra for running', searchVolume: 6200, difficulty: 50, searchIntent: 'commercial', status: 'published', position: 13, monthlyTraffic: 340 },
        { id: 't-run-7', title: 'Running Hydration: Best Water Bottles and Vests', keyword: 'running hydration bottles vests', searchVolume: 2800, difficulty: 36, searchIntent: 'commercial', status: 'gap' },
        { id: 't-run-8', title: 'Compression Gear for Runners: Does It Work?', keyword: 'compression gear runners', searchVolume: 2100, difficulty: 33, searchIntent: 'informational', status: 'gap' },
        { id: 't-run-9', title: 'Best GPS Watches for Running in 2026', keyword: 'best gps watches running', searchVolume: 7500, difficulty: 58, searchIntent: 'commercial', status: 'planned' },
        { id: 't-run-10', title: 'Reflective Running Gear for Night Running', keyword: 'reflective running gear night', searchVolume: 1600, difficulty: 22, searchIntent: 'commercial', status: 'planned' },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller('topical-map')
export class TopicalMapController {
  private readonly logger = new Logger(TopicalMapController.name);
  private prisma = new PrismaClient();

  // In-memory store for mock clusters (production would use DB)
  private clustersCache: Map<string, TopicCluster[]> = new Map();

  /**
   * Resolve organizationId - DEV MODE uses first available org
   */
  private async resolveOrganizationId(): Promise<string> {
    try {
      const firstOrg = await this.prisma.organization.findFirst({
        select: { id: true },
      });
      if (firstOrg) return firstOrg.id;
    } catch {
      // Database might not be available
    }
    return 'org-dev';
  }

  /**
   * Get or initialize clusters for an org
   */
  private getOrInitClusters(organizationId: string): TopicCluster[] {
    if (!this.clustersCache.has(organizationId)) {
      this.clustersCache.set(organizationId, buildMockClusters(organizationId));
    }
    return this.clustersCache.get(organizationId)!;
  }

  // =========================================================================
  // GET /api/topical-map/clusters
  // =========================================================================

  /**
   * List all topic clusters for the organization
   * Returns: { clusters: TopicCluster[], stats: { ... } }
   */
  @Get('clusters')
  async getClusters() {
    this.logger.log('GET /topical-map/clusters');

    const organizationId = await this.resolveOrganizationId();
    const clusters = this.getOrInitClusters(organizationId);

    // Calculate aggregate stats
    const totalTopics = clusters.reduce((sum, c) => sum + c.totalTopics, 0);
    const publishedTopics = clusters.reduce((sum, c) => sum + c.publishedTopics, 0);
    const coveragePercent = totalTopics > 0
      ? Math.round((publishedTopics / totalTopics) * 100)
      : 0;
    const gapTopics = clusters.reduce(
      (sum, c) => sum + c.topics.filter((t) => t.status === 'gap').length,
      0,
    );

    return {
      clusters,
      stats: {
        totalClusters: clusters.length,
        totalTopics,
        publishedTopics,
        coveragePercent,
        gapsFound: gapTopics,
      },
    };
  }

  // =========================================================================
  // POST /api/topical-map/clusters
  // =========================================================================

  /**
   * Create a new topic cluster (hub topic)
   * Body: { name, pillarTopic, pillarKeyword, searchVolume? }
   * Returns: created TopicCluster
   */
  @Post('clusters')
  async createCluster(
    @Body()
    body: {
      name: string;
      pillarTopic: string;
      pillarKeyword: string;
      searchVolume?: number;
    },
  ) {
    this.logger.log(`POST /topical-map/clusters - name="${body.name}"`);

    if (!body.name || !body.pillarTopic || !body.pillarKeyword) {
      throw new HttpException(
        'name, pillarTopic, and pillarKeyword are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const organizationId = await this.resolveOrganizationId();
    const clusters = this.getOrInitClusters(organizationId);

    const now = new Date().toISOString();
    const newCluster: TopicCluster = {
      id: `cluster-${uuidv4().slice(0, 8)}`,
      organizationId,
      name: body.name,
      pillarTopic: body.pillarTopic,
      pillarKeyword: body.pillarKeyword,
      searchVolume: body.searchVolume || 0,
      topics: [],
      coverage: 0,
      totalTopics: 0,
      publishedTopics: 0,
      status: 'weak',
      createdAt: now,
      updatedAt: now,
    };

    clusters.push(newCluster);
    this.clustersCache.set(organizationId, clusters);

    this.logger.log(`Created cluster "${newCluster.name}" (${newCluster.id})`);

    return newCluster;
  }

  // =========================================================================
  // GET /api/topical-map/clusters/:id
  // =========================================================================

  /**
   * Get cluster detail with all content items
   * Returns: TopicCluster
   */
  @Get('clusters/:id')
  async getCluster(@Param('id') id: string) {
    this.logger.log(`GET /topical-map/clusters/${id}`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Cluster ID is required', HttpStatus.BAD_REQUEST);
    }

    const organizationId = await this.resolveOrganizationId();
    const clusters = this.getOrInitClusters(organizationId);
    const cluster = clusters.find((c) => c.id === id);

    if (!cluster) {
      throw new HttpException(
        `Cluster not found: ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return cluster;
  }

  // =========================================================================
  // POST /api/topical-map/clusters/:id/topics
  // =========================================================================

  /**
   * Add a spoke topic to a cluster
   * Body: { title, keyword, searchVolume?, difficulty?, searchIntent?, status? }
   * Returns: updated TopicCluster
   */
  @Post('clusters/:id/topics')
  async addTopic(
    @Param('id') id: string,
    @Body()
    body: {
      title: string;
      keyword: string;
      searchVolume?: number;
      difficulty?: number;
      searchIntent?: string;
      status?: string;
    },
  ) {
    this.logger.log(`POST /topical-map/clusters/${id}/topics - title="${body.title}"`);

    if (!body.title || !body.keyword) {
      throw new HttpException(
        'title and keyword are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const organizationId = await this.resolveOrganizationId();
    const clusters = this.getOrInitClusters(organizationId);
    const cluster = clusters.find((c) => c.id === id);

    if (!cluster) {
      throw new HttpException(
        `Cluster not found: ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const newTopic: TopicItem = {
      id: `t-${uuidv4().slice(0, 8)}`,
      title: body.title,
      keyword: body.keyword,
      searchVolume: body.searchVolume || 0,
      difficulty: body.difficulty || 50,
      searchIntent: (body.searchIntent as TopicItem['searchIntent']) || 'informational',
      status: (body.status as TopicItem['status']) || 'planned',
    };

    cluster.topics.push(newTopic);
    cluster.totalTopics = cluster.topics.length;
    cluster.publishedTopics = cluster.topics.filter((t) => t.status === 'published').length;
    cluster.coverage =
      cluster.totalTopics > 0
        ? Math.round((cluster.publishedTopics / cluster.totalTopics) * 100)
        : 0;
    cluster.status =
      cluster.coverage >= 70
        ? 'strong'
        : cluster.coverage >= 40
          ? 'growing'
          : 'weak';
    cluster.updatedAt = new Date().toISOString();

    this.logger.log(
      `Added topic "${newTopic.title}" to cluster "${cluster.name}" (${cluster.totalTopics} topics, ${cluster.coverage}% coverage)`,
    );

    return cluster;
  }

  // =========================================================================
  // DELETE /api/topical-map/clusters/:id
  // =========================================================================

  /**
   * Delete a topic cluster
   * Returns: { success: true }
   */
  @Delete('clusters/:id')
  async deleteCluster(@Param('id') id: string) {
    this.logger.log(`DELETE /topical-map/clusters/${id}`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Cluster ID is required', HttpStatus.BAD_REQUEST);
    }

    const organizationId = await this.resolveOrganizationId();
    const clusters = this.getOrInitClusters(organizationId);
    const index = clusters.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new HttpException(
        `Cluster not found: ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const removed = clusters.splice(index, 1)[0];
    this.clustersCache.set(organizationId, clusters);

    this.logger.log(`Deleted cluster "${removed.name}" (${removed.id})`);

    return { success: true };
  }

  // =========================================================================
  // POST /api/topical-map/generate
  // =========================================================================

  /**
   * AI-generate a topical map for a seed keyword
   * Body: { seedKeyword: string, aiModel?: string }
   * Returns: generated TopicCluster
   *
   * In production, this calls OpenAI to generate the map.
   * For now, returns a smart mock based on the seed keyword.
   */
  @Post('generate')
  async generateTopicalMap(
    @Body() body: { seedKeyword: string; aiModel?: string },
  ) {
    this.logger.log(
      `POST /topical-map/generate - seedKeyword="${body.seedKeyword}", model="${body.aiModel || 'gpt-4o-mini'}"`,
    );

    if (!body.seedKeyword || body.seedKeyword.trim().length === 0) {
      throw new HttpException(
        'seedKeyword is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const organizationId = await this.resolveOrganizationId();
    const seedKeyword = body.seedKeyword.trim();

    // Try OpenAI generation first
    const openAIKey = process.env.OPENAI_API_KEY;
    if (openAIKey && openAIKey !== 'your_openai_api_key_here') {
      try {
        return await this.generateWithOpenAI(seedKeyword, organizationId, openAIKey);
      } catch (error: any) {
        this.logger.warn(`OpenAI generation failed, using mock: ${error.message}`);
      }
    }

    // Fallback: Generate a smart mock cluster based on seed keyword
    const cluster = this.generateMockCluster(seedKeyword, organizationId);

    // Add to cache
    const clusters = this.getOrInitClusters(organizationId);
    clusters.push(cluster);
    this.clustersCache.set(organizationId, clusters);

    this.logger.log(
      `Generated topical map for "${seedKeyword}": ${cluster.totalTopics} topics`,
    );

    return cluster;
  }

  /**
   * Generate a topical map using OpenAI
   */
  private async generateWithOpenAI(
    seedKeyword: string,
    organizationId: string,
    apiKey: string,
  ): Promise<TopicCluster> {
    // Dynamic import to avoid issues if axios is not available
    const axios = (await import('axios')).default;

    const prompt = `You are an expert SEO strategist. Generate a topical authority map for the seed keyword: "${seedKeyword}".

Return a JSON object with this exact structure:
{
  "name": "Cluster Name (2-4 words)",
  "pillarTopic": "Main pillar article title",
  "pillarKeyword": "main target keyword phrase",
  "searchVolume": estimated monthly search volume (number),
  "topics": [
    {
      "title": "Article title",
      "keyword": "target keyword phrase",
      "searchVolume": estimated monthly search volume (number),
      "difficulty": keyword difficulty 1-100 (number),
      "searchIntent": "informational" | "commercial" | "transactional" | "navigational"
    }
  ]
}

Generate 8-15 subtopics. Include a mix of:
- Informational "how to" and "what is" topics
- Commercial comparison topics ("X vs Y", "best X for Y")
- Transactional topics ("buy X", "X deals")
- FAQ-style topics

Make the search volumes and difficulty scores realistic. Return ONLY the JSON, no other text.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a JSON-only response bot. Output valid JSON only, no markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const content = response.data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON (handle potential markdown wrapping)
    let parsed: any;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    const now = new Date().toISOString();
    const topics: TopicItem[] = (parsed.topics || []).map((t: any, i: number) => ({
      id: `t-ai-${uuidv4().slice(0, 6)}-${i}`,
      title: t.title,
      keyword: t.keyword,
      searchVolume: t.searchVolume || 0,
      difficulty: t.difficulty || 50,
      searchIntent: t.searchIntent || 'informational',
      status: 'gap' as const,
    }));

    const cluster: TopicCluster = {
      id: `cluster-${uuidv4().slice(0, 8)}`,
      organizationId,
      name: parsed.name || seedKeyword,
      pillarTopic: parsed.pillarTopic || `Complete Guide to ${seedKeyword}`,
      pillarKeyword: parsed.pillarKeyword || seedKeyword,
      searchVolume: parsed.searchVolume || 0,
      topics,
      totalTopics: topics.length,
      publishedTopics: 0,
      coverage: 0,
      status: 'weak',
      createdAt: now,
      updatedAt: now,
    };

    // Add to cache
    const clusters = this.getOrInitClusters(organizationId);
    clusters.push(cluster);
    this.clustersCache.set(organizationId, clusters);

    return cluster;
  }

  /**
   * Generate a mock topical map based on seed keyword
   */
  private generateMockCluster(
    seedKeyword: string,
    organizationId: string,
  ): TopicCluster {
    const now = new Date().toISOString();
    const capitalizedKeyword =
      seedKeyword.charAt(0).toUpperCase() + seedKeyword.slice(1);

    // Generate realistic subtopics based on common patterns
    const topicTemplates = [
      { prefix: 'What is', suffix: '?', intent: 'informational' as const, diffRange: [20, 40] },
      { prefix: 'How to Choose the Best', suffix: '', intent: 'commercial' as const, diffRange: [35, 55] },
      { prefix: 'Top 10', suffix: `for ${new Date().getFullYear()}`, intent: 'commercial' as const, diffRange: [45, 65] },
      { prefix: '', suffix: 'vs Alternatives: Comparison Guide', intent: 'commercial' as const, diffRange: [30, 50] },
      { prefix: 'How to Use', suffix: 'Effectively', intent: 'informational' as const, diffRange: [15, 35] },
      { prefix: 'Common', suffix: 'Mistakes to Avoid', intent: 'informational' as const, diffRange: [20, 40] },
      { prefix: 'Is', suffix: 'Worth It? Honest Review', intent: 'commercial' as const, diffRange: [30, 50] },
      { prefix: 'Beginner Guide to', suffix: '', intent: 'informational' as const, diffRange: [25, 45] },
      { prefix: 'How Much Does', suffix: 'Cost?', intent: 'transactional' as const, diffRange: [20, 40] },
      { prefix: 'Where to Buy', suffix: 'Online', intent: 'transactional' as const, diffRange: [35, 55] },
      { prefix: 'Best', suffix: 'for Small Business', intent: 'commercial' as const, diffRange: [40, 60] },
      { prefix: '', suffix: 'Tips and Tricks from Experts', intent: 'informational' as const, diffRange: [25, 45] },
    ];

    const topics: TopicItem[] = topicTemplates.map((template, i) => {
      const title = `${template.prefix} ${capitalizedKeyword} ${template.suffix}`.trim();
      const keyword = title.toLowerCase().replace(/[?!]/g, '').replace(/\s+/g, ' ').trim();
      const [minDiff, maxDiff] = template.diffRange;
      const difficulty = Math.floor(Math.random() * (maxDiff - minDiff) + minDiff);
      const searchVolume = Math.floor(Math.random() * 8000 + 500);

      return {
        id: `t-gen-${uuidv4().slice(0, 6)}-${i}`,
        title,
        keyword,
        searchVolume,
        difficulty,
        searchIntent: template.intent,
        status: 'gap' as const,
      };
    });

    return {
      id: `cluster-${uuidv4().slice(0, 8)}`,
      organizationId,
      name: capitalizedKeyword,
      pillarTopic: `Complete Guide to ${capitalizedKeyword}`,
      pillarKeyword: seedKeyword.toLowerCase(),
      searchVolume: Math.floor(Math.random() * 15000 + 3000),
      topics,
      totalTopics: topics.length,
      publishedTopics: 0,
      coverage: 0,
      status: 'weak',
      createdAt: now,
      updatedAt: now,
    };
  }

  // =========================================================================
  // GET /api/topical-map/gaps
  // =========================================================================

  /**
   * Get content gaps across all clusters
   * Returns: { gaps: ContentGap[], summary: { ... } }
   */
  @Get('gaps')
  async getContentGaps() {
    this.logger.log('GET /topical-map/gaps');

    const organizationId = await this.resolveOrganizationId();
    const clusters = this.getOrInitClusters(organizationId);

    const gaps: ContentGap[] = [];

    for (const cluster of clusters) {
      for (const topic of cluster.topics) {
        if (topic.status === 'gap') {
          // Calculate opportunity score based on search volume and difficulty
          const volumeScore = Math.min(topic.searchVolume / 100, 100);
          const difficultyScore = 100 - topic.difficulty;
          const opportunityScore = Math.round((volumeScore * 0.6 + difficultyScore * 0.4));

          // Determine priority
          let priority: 'high' | 'medium' | 'low';
          if (opportunityScore >= 60) {
            priority = 'high';
          } else if (opportunityScore >= 35) {
            priority = 'medium';
          } else {
            priority = 'low';
          }

          // Generate reason
          let reason: string;
          if (topic.searchVolume > 5000 && topic.difficulty < 40) {
            reason = 'High volume, low competition - quick win opportunity';
          } else if (topic.searchVolume > 3000) {
            reason = 'Significant search volume - worth creating content for';
          } else if (topic.difficulty < 30) {
            reason = 'Low competition - easy to rank for this topic';
          } else {
            reason = 'Gap in cluster coverage - needed for topical authority';
          }

          gaps.push({
            clusterId: cluster.id,
            clusterName: cluster.name,
            topic,
            priority,
            opportunityScore,
            reason,
          });
        }
      }
    }

    // Sort by opportunity score descending
    gaps.sort((a, b) => b.opportunityScore - a.opportunityScore);

    const highPriority = gaps.filter((g) => g.priority === 'high').length;
    const mediumPriority = gaps.filter((g) => g.priority === 'medium').length;
    const lowPriority = gaps.filter((g) => g.priority === 'low').length;
    const totalSearchVolume = gaps.reduce((sum, g) => sum + g.topic.searchVolume, 0);

    return {
      gaps,
      summary: {
        totalGaps: gaps.length,
        highPriority,
        mediumPriority,
        lowPriority,
        totalSearchVolume,
        estimatedTrafficPotential: Math.round(totalSearchVolume * 0.03), // ~3% CTR estimate
      },
    };
  }

  // =========================================================================
  // POST /api/topical-map/auto-categorize
  // =========================================================================

  /**
   * Auto-categorize existing QA pages into topic clusters
   * Analyzes QA pages and assigns them to the best matching cluster
   * Returns: { categorized: number, newClusters: number, results: [...] }
   */
  @Post('auto-categorize')
  async autoCategorize() {
    this.logger.log('POST /topical-map/auto-categorize');

    const organizationId = await this.resolveOrganizationId();
    const clusters = this.getOrInitClusters(organizationId);

    // Fetch existing QA pages from the database
    let qaPages: any[] = [];
    try {
      qaPages = await this.prisma.qAPage.findMany({
        where: { organizationId },
        select: {
          id: true,
          question: true,
          targetKeyword: true,
          status: true,
          seoScore: true,
          monthlyTraffic: true,
          currentPosition: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch (error: any) {
      this.logger.warn(`Could not fetch QA pages: ${error.message}`);
    }

    if (qaPages.length === 0) {
      return {
        categorized: 0,
        newClusters: 0,
        results: [],
        message: 'No QA pages found to categorize',
      };
    }

    // Simple keyword-based categorization
    const results: Array<{
      qaPageId: string;
      question: string;
      clusterId: string;
      clusterName: string;
      confidence: number;
    }> = [];

    const clusterKeywords = clusters.map((c) => ({
      cluster: c,
      keywords: [
        ...c.pillarKeyword.toLowerCase().split(/\s+/),
        ...c.name.toLowerCase().split(/\s+/),
        ...c.topics.flatMap((t) => t.keyword.toLowerCase().split(/\s+/)),
      ].filter((kw) => kw.length > 3), // Filter out short words
    }));

    for (const page of qaPages) {
      const questionWords = (page.question || '').toLowerCase().split(/\s+/);
      const keywordWords = (page.targetKeyword || '').toLowerCase().split(/\s+/);
      const allPageWords = [...new Set([...questionWords, ...keywordWords])];

      let bestMatch: { cluster: TopicCluster; score: number } | null = null;

      for (const { cluster, keywords } of clusterKeywords) {
        const matchingWords = allPageWords.filter((w) => keywords.includes(w));
        const score = matchingWords.length / Math.max(allPageWords.length, 1);

        if (score > 0.15 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { cluster, score };
        }
      }

      if (bestMatch) {
        results.push({
          qaPageId: page.id,
          question: page.question,
          clusterId: bestMatch.cluster.id,
          clusterName: bestMatch.cluster.name,
          confidence: Math.round(bestMatch.score * 100),
        });

        // Check if topic already exists in cluster
        const alreadyExists = bestMatch.cluster.topics.some(
          (t) =>
            t.qaPageId === page.id ||
            t.keyword.toLowerCase() ===
              (page.targetKeyword || '').toLowerCase(),
        );

        if (!alreadyExists) {
          // Map QA page status to topic status
          let topicStatus: TopicItem['status'] = 'gap';
          if (page.status === 'published') topicStatus = 'published';
          else if (page.status === 'draft' || page.status === 'pending_review')
            topicStatus = 'draft';
          else if (page.status === 'generating') topicStatus = 'in_progress';

          bestMatch.cluster.topics.push({
            id: `t-auto-${page.id.slice(0, 8)}`,
            title: page.question,
            keyword: page.targetKeyword || page.question.toLowerCase(),
            searchVolume: page.monthlyTraffic || 0,
            difficulty: 50,
            searchIntent: 'informational',
            status: topicStatus,
            qaPageId: page.id,
            position: page.currentPosition || undefined,
            monthlyTraffic: page.monthlyTraffic || undefined,
          });

          // Recalculate cluster stats
          bestMatch.cluster.totalTopics = bestMatch.cluster.topics.length;
          bestMatch.cluster.publishedTopics = bestMatch.cluster.topics.filter(
            (t) => t.status === 'published',
          ).length;
          bestMatch.cluster.coverage =
            bestMatch.cluster.totalTopics > 0
              ? Math.round(
                  (bestMatch.cluster.publishedTopics /
                    bestMatch.cluster.totalTopics) *
                    100,
                )
              : 0;
          bestMatch.cluster.status =
            bestMatch.cluster.coverage >= 70
              ? 'strong'
              : bestMatch.cluster.coverage >= 40
                ? 'growing'
                : 'weak';
          bestMatch.cluster.updatedAt = new Date().toISOString();
        }
      }
    }

    this.logger.log(
      `Auto-categorized ${results.length} of ${qaPages.length} QA pages into clusters`,
    );

    return {
      categorized: results.length,
      totalPages: qaPages.length,
      newClusters: 0,
      results,
    };
  }
}
