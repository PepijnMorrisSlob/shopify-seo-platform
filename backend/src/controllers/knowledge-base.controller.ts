/**
 * Knowledge Base Controller
 * Shopify SEO Platform
 *
 * API endpoints for the "Teach Your AI" knowledge base system:
 * - GET /api/knowledge-base - List all knowledge bases
 * - POST /api/knowledge-base - Create a new knowledge base
 * - GET /api/knowledge-base/search - Search across all knowledge bases
 * - GET /api/knowledge-base/:id - Get knowledge base with entries
 * - PUT /api/knowledge-base/:id - Update knowledge base name/description
 * - DELETE /api/knowledge-base/:id - Delete knowledge base
 * - POST /api/knowledge-base/:id/entries - Add entry to knowledge base
 * - PUT /api/knowledge-base/:id/entries/:entryId - Update entry
 * - DELETE /api/knowledge-base/:id/entries/:entryId - Delete entry
 *
 * Uses in-memory storage with pre-populated mock data.
 * Prisma models can be added later for persistence.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---

interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  sourceUrl: string | null;
  type: 'product_info' | 'brand_voice' | 'expert_knowledge' | 'faq' | 'guidelines';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBase {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  tags: string[];
  entries: KnowledgeBaseEntry[];
  createdAt: string;
  updatedAt: string;
}

// --- In-Memory Store with Mock Data ---

const ORGANIZATION_ID = '77e2c3a5-b35f-4464-8f94-f0b42728ac3d';

const knowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb-1',
    organizationId: ORGANIZATION_ID,
    name: 'Product Expertise',
    description: 'Deep knowledge about our product materials, manufacturing, and care instructions',
    tags: ['products', 'materials', 'care'],
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-02-06T08:00:00Z',
    entries: [
      {
        id: 'entry-1',
        title: 'Egyptian Cotton Quality Standards',
        content:
          'Our Egyptian cotton sheets are sourced from the Nile Delta region and feature extra-long staple (ELS) fibers measuring 34-36mm. This results in a softer, more durable fabric that improves with each wash. We use a 400-thread count sateen weave for our premium line and 300-thread count percale for our classic line. All cotton is OEKO-TEX Standard 100 certified, ensuring no harmful substances are present. Our suppliers undergo annual audits for quality and ethical labor practices.',
        sourceUrl: null,
        type: 'product_info',
        tags: ['cotton', 'materials', 'quality'],
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      },
      {
        id: 'entry-2',
        title: 'Brand Voice Guidelines',
        content:
          'We communicate with warmth, expertise, and accessibility. Avoid jargon unless explaining it. Use active voice. Focus on customer benefits, not just features. Our tone is knowledgeable but approachable - like a friend who happens to be a textile expert. Never use superlatives without backing them up with data. Always include care tips when discussing products. Address the reader directly with "you" and "your".',
        sourceUrl: null,
        type: 'brand_voice',
        tags: ['voice', 'tone', 'writing'],
        createdAt: '2026-01-10T10:00:00Z',
        updatedAt: '2026-01-22T14:30:00Z',
      },
      {
        id: 'entry-3',
        title: 'Linen Care Instructions',
        content:
          'Machine wash in cold water on a gentle cycle. Use mild detergent without bleach or fabric softener. Tumble dry on low heat or line dry for best results. Iron while slightly damp on medium heat. Linen naturally softens with each wash - no need for harsh chemicals. Store in a cool, dry place away from direct sunlight. For stains, treat immediately with cold water and a gentle stain remover before washing.',
        sourceUrl: null,
        type: 'product_info',
        tags: ['linen', 'care', 'instructions'],
        createdAt: '2026-01-18T09:00:00Z',
        updatedAt: '2026-01-18T09:00:00Z',
      },
      {
        id: 'entry-4',
        title: 'Shipping & Returns FAQ',
        content:
          'Free standard shipping on orders over $75. Standard delivery takes 3-5 business days. Express shipping (1-2 business days) available for $12.99. We offer a 30-day happiness guarantee - if you are not completely satisfied, return for a full refund. Items must be in original packaging. Return shipping is free for US customers. International returns are the responsibility of the customer.',
        sourceUrl: null,
        type: 'faq',
        tags: ['shipping', 'returns', 'policy'],
        createdAt: '2026-01-20T11:00:00Z',
        updatedAt: '2026-02-01T08:00:00Z',
      },
      {
        id: 'entry-5',
        title: 'Product Photography Standards',
        content:
          'All product images should be shot on a clean white background with soft, natural lighting. Show the texture of fabrics by including close-up detail shots. Lifestyle images should feature real homes, not overly styled studios. Color accuracy is critical - calibrate monitors monthly. Include at least one image showing the product in use (e.g., a bed made with sheets). Show scale by including common objects in frame when helpful.',
        sourceUrl: null,
        type: 'guidelines',
        tags: ['photography', 'images', 'standards'],
        createdAt: '2026-01-25T15:00:00Z',
        updatedAt: '2026-01-25T15:00:00Z',
      },
    ],
  },
  {
    id: 'kb-2',
    organizationId: ORGANIZATION_ID,
    name: 'Industry Research',
    description: 'Sleep science, textile industry trends, and expert insights',
    tags: ['research', 'sleep', 'trends'],
    createdAt: '2026-01-12T08:00:00Z',
    updatedAt: '2026-02-04T15:00:00Z',
    entries: [
      {
        id: 'entry-6',
        title: 'Sleep Temperature Research',
        content:
          'According to the Sleep Foundation, the ideal bedroom temperature for sleep is between 60-67 degrees F (15-19 degrees C). Our cooling sheets are engineered with moisture-wicking technology that helps regulate body temperature throughout the night. Studies show that sleepers who maintain optimal temperature experience 23% less nighttime awakenings and report higher overall sleep quality scores.',
        sourceUrl: 'https://sleepfoundation.org/bedroom-environment/best-temperature-for-sleep',
        type: 'expert_knowledge',
        tags: ['sleep', 'temperature', 'research'],
        createdAt: '2026-01-20T10:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
      },
      {
        id: 'entry-7',
        title: 'Sustainable Textile Trends 2026',
        content:
          'The global sustainable textile market is projected to reach $85 billion by 2027, growing at 9.1% CAGR. Key trends include: organic cotton adoption increasing 35% year-over-year, recycled polyester gaining traction in performance fabrics, and consumers willing to pay 15-20% premium for verified sustainable products. Certifications like GOTS, OEKO-TEX, and Fair Trade are becoming table stakes for premium brands.',
        sourceUrl: 'https://textileexchange.org/market-report-2026',
        type: 'expert_knowledge',
        tags: ['sustainability', 'trends', 'market'],
        createdAt: '2026-01-28T14:00:00Z',
        updatedAt: '2026-02-04T15:00:00Z',
      },
      {
        id: 'entry-8',
        title: 'Thread Count Myth vs Reality',
        content:
          'Thread count alone is not a reliable indicator of sheet quality. A 300-thread-count sheet made from high-quality long-staple cotton will outperform a 1000-thread-count sheet made from short-staple cotton with multi-ply threads. What matters most: fiber quality (long-staple vs short-staple), weave type (percale vs sateen), and finishing processes. Educate customers that anything above 400-thread-count with single-ply yarns is excellent quality.',
        sourceUrl: null,
        type: 'expert_knowledge',
        tags: ['thread-count', 'quality', 'education'],
        createdAt: '2026-02-01T10:00:00Z',
        updatedAt: '2026-02-01T10:00:00Z',
      },
    ],
  },
  {
    id: 'kb-3',
    organizationId: ORGANIZATION_ID,
    name: 'SEO & Content Strategy',
    description: 'SEO best practices, content templates, and optimization guidelines',
    tags: ['seo', 'content', 'strategy'],
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-02-05T12:00:00Z',
    entries: [
      {
        id: 'entry-9',
        title: 'Product Page SEO Checklist',
        content:
          'Every product page must include: 1) Unique meta title under 60 characters with primary keyword, 2) Meta description 120-155 characters with call-to-action, 3) H1 tag matching the product name with natural keyword integration, 4) Alt text on all images describing the product, 5) Schema markup (Product, Offer, AggregateRating), 6) Internal links to related products and category pages, 7) Unique product description of at least 300 words, 8) Customer reviews section for fresh content signals.',
        sourceUrl: null,
        type: 'guidelines',
        tags: ['seo', 'product-pages', 'checklist'],
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-02-05T12:00:00Z',
      },
      {
        id: 'entry-10',
        title: 'Blog Content Framework',
        content:
          'Structure all blog posts with: Hook (address reader pain point in first paragraph), Background (establish expertise), Main Content (actionable advice with subheadings every 300 words), Product Tie-in (natural mention of relevant products, max 2 per post), Conclusion (summary + CTA). Target length: 1200-1800 words for pillar content, 600-800 words for supporting posts. Include at least 3 internal links and 1-2 authoritative external links.',
        sourceUrl: null,
        type: 'guidelines',
        tags: ['blog', 'content', 'framework'],
        createdAt: '2026-01-22T09:00:00Z',
        updatedAt: '2026-01-22T09:00:00Z',
      },
      {
        id: 'entry-11',
        title: 'Keyword Targeting Rules',
        content:
          'Primary keyword must appear in: meta title, H1, first 100 words, and at least one H2. Use semantic variations and related terms throughout the content. Keyword density should be 1-2% for primary terms. Never keyword stuff. Long-tail keywords (4+ words) should be prioritized for product pages due to higher conversion intent. Track search volume, keyword difficulty, and SERP features before targeting any keyword.',
        sourceUrl: null,
        type: 'guidelines',
        tags: ['keywords', 'seo', 'optimization'],
        createdAt: '2026-01-30T11:00:00Z',
        updatedAt: '2026-01-30T11:00:00Z',
      },
    ],
  },
];

@Controller('knowledge-base')
export class KnowledgeBaseController {
  private readonly logger = new Logger(KnowledgeBaseController.name);

  /**
   * List all knowledge bases
   * GET /api/knowledge-base
   */
  @Get()
  async listKnowledgeBases(
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId = organizationId || ORGANIZATION_ID;
    this.logger.log(`Listing knowledge bases for org: ${orgId}`);

    const results = knowledgeBases
      .filter((kb) => kb.organizationId === orgId)
      .map((kb) => ({
        id: kb.id,
        name: kb.name,
        description: kb.description,
        tags: kb.tags,
        entryCount: kb.entries.length,
        createdAt: kb.createdAt,
        updatedAt: kb.updatedAt,
      }));

    return results;
  }

  /**
   * Search across all knowledge bases
   * GET /api/knowledge-base/search?q=keyword
   */
  @Get('search')
  async searchKnowledgeBases(
    @Query('q') query?: string,
    @Query('type') type?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId = organizationId || ORGANIZATION_ID;

    if (!query || query.trim().length === 0) {
      throw new HttpException(
        'Search query (q) is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Searching knowledge bases for: "${query}" (org: ${orgId})`);

    const searchTerm = query.toLowerCase().trim();
    const results: Array<KnowledgeBaseEntry & { knowledgeBaseId: string; knowledgeBaseName: string }> = [];

    for (const kb of knowledgeBases) {
      if (kb.organizationId !== orgId) continue;

      for (const entry of kb.entries) {
        // Filter by type if specified
        if (type && entry.type !== type) continue;

        // Search across title, content, tags, and sourceUrl
        const matchesTitle = entry.title.toLowerCase().includes(searchTerm);
        const matchesContent = entry.content.toLowerCase().includes(searchTerm);
        const matchesTags = entry.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm),
        );
        const matchesSource =
          entry.sourceUrl?.toLowerCase().includes(searchTerm) || false;

        if (matchesTitle || matchesContent || matchesTags || matchesSource) {
          results.push({
            ...entry,
            knowledgeBaseId: kb.id,
            knowledgeBaseName: kb.name,
          });
        }
      }
    }

    return {
      query,
      resultCount: results.length,
      results,
    };
  }

  /**
   * Get a single knowledge base with all entries
   * GET /api/knowledge-base/:id
   */
  @Get(':id')
  async getKnowledgeBase(@Param('id') id: string) {
    this.logger.log(`Getting knowledge base: ${id}`);

    const kb = knowledgeBases.find((k) => k.id === id);

    if (!kb) {
      throw new HttpException(
        `Knowledge base with ID "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return kb;
  }

  /**
   * Create a new knowledge base
   * POST /api/knowledge-base
   */
  @Post()
  async createKnowledgeBase(
    @Body()
    body: {
      name: string;
      description?: string;
      tags?: string[];
      organizationId?: string;
    },
  ) {
    if (!body.name || body.name.trim().length === 0) {
      throw new HttpException(
        'Knowledge base name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const orgId = body.organizationId || ORGANIZATION_ID;

    this.logger.log(`Creating knowledge base: "${body.name}" for org: ${orgId}`);

    const now = new Date().toISOString();
    const newKB: KnowledgeBase = {
      id: `kb-${uuidv4().substring(0, 8)}`,
      organizationId: orgId,
      name: body.name.trim(),
      description: body.description?.trim() || '',
      tags: body.tags || [],
      entries: [],
      createdAt: now,
      updatedAt: now,
    };

    knowledgeBases.push(newKB);

    this.logger.log(`Created knowledge base: ${newKB.id}`);

    return newKB;
  }

  /**
   * Update a knowledge base name/description
   * PUT /api/knowledge-base/:id
   */
  @Put(':id')
  async updateKnowledgeBase(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      tags?: string[];
    },
  ) {
    this.logger.log(`Updating knowledge base: ${id}`);

    const kb = knowledgeBases.find((k) => k.id === id);

    if (!kb) {
      throw new HttpException(
        `Knowledge base with ID "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (body.name !== undefined) kb.name = body.name.trim();
    if (body.description !== undefined) kb.description = body.description.trim();
    if (body.tags !== undefined) kb.tags = body.tags;
    kb.updatedAt = new Date().toISOString();

    this.logger.log(`Updated knowledge base: ${kb.id}`);

    return kb;
  }

  /**
   * Delete a knowledge base
   * DELETE /api/knowledge-base/:id
   */
  @Delete(':id')
  async deleteKnowledgeBase(@Param('id') id: string) {
    this.logger.log(`Deleting knowledge base: ${id}`);

    const index = knowledgeBases.findIndex((k) => k.id === id);

    if (index === -1) {
      throw new HttpException(
        `Knowledge base with ID "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    knowledgeBases.splice(index, 1);

    this.logger.log(`Deleted knowledge base: ${id}`);

    return { success: true, deletedId: id };
  }

  /**
   * Add entry to knowledge base
   * POST /api/knowledge-base/:id/entries
   */
  @Post(':id/entries')
  async addEntry(
    @Param('id') id: string,
    @Body()
    body: {
      title: string;
      content: string;
      sourceUrl?: string;
      type?: KnowledgeBaseEntry['type'];
      tags?: string[];
    },
  ) {
    this.logger.log(`Adding entry to knowledge base: ${id}`);

    const kb = knowledgeBases.find((k) => k.id === id);

    if (!kb) {
      throw new HttpException(
        `Knowledge base with ID "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!body.title || body.title.trim().length === 0) {
      throw new HttpException('Entry title is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.content || body.content.trim().length === 0) {
      throw new HttpException('Entry content is required', HttpStatus.BAD_REQUEST);
    }

    const validTypes: KnowledgeBaseEntry['type'][] = [
      'product_info',
      'brand_voice',
      'expert_knowledge',
      'faq',
      'guidelines',
    ];

    const entryType = body.type || 'expert_knowledge';

    if (!validTypes.includes(entryType)) {
      throw new HttpException(
        `Invalid entry type. Must be one of: ${validTypes.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date().toISOString();
    const newEntry: KnowledgeBaseEntry = {
      id: `entry-${uuidv4().substring(0, 8)}`,
      title: body.title.trim(),
      content: body.content.trim(),
      sourceUrl: body.sourceUrl?.trim() || null,
      type: entryType,
      tags: body.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    kb.entries.push(newEntry);
    kb.updatedAt = now;

    this.logger.log(`Added entry ${newEntry.id} to knowledge base ${kb.id}`);

    return newEntry;
  }

  /**
   * Update an entry in a knowledge base
   * PUT /api/knowledge-base/:id/entries/:entryId
   */
  @Put(':id/entries/:entryId')
  async updateEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body()
    body: {
      title?: string;
      content?: string;
      sourceUrl?: string | null;
      type?: KnowledgeBaseEntry['type'];
      tags?: string[];
    },
  ) {
    this.logger.log(`Updating entry ${entryId} in knowledge base: ${id}`);

    const kb = knowledgeBases.find((k) => k.id === id);

    if (!kb) {
      throw new HttpException(
        `Knowledge base with ID "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const entry = kb.entries.find((e) => e.id === entryId);

    if (!entry) {
      throw new HttpException(
        `Entry with ID "${entryId}" not found in knowledge base "${id}"`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (body.title !== undefined) entry.title = body.title.trim();
    if (body.content !== undefined) entry.content = body.content.trim();
    if (body.sourceUrl !== undefined) entry.sourceUrl = body.sourceUrl?.trim() || null;
    if (body.type !== undefined) entry.type = body.type;
    if (body.tags !== undefined) entry.tags = body.tags;

    const now = new Date().toISOString();
    entry.updatedAt = now;
    kb.updatedAt = now;

    this.logger.log(`Updated entry ${entryId} in knowledge base ${kb.id}`);

    return entry;
  }

  /**
   * Delete an entry from a knowledge base
   * DELETE /api/knowledge-base/:id/entries/:entryId
   */
  @Delete(':id/entries/:entryId')
  async deleteEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    this.logger.log(`Deleting entry ${entryId} from knowledge base: ${id}`);

    const kb = knowledgeBases.find((k) => k.id === id);

    if (!kb) {
      throw new HttpException(
        `Knowledge base with ID "${id}" not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const entryIndex = kb.entries.findIndex((e) => e.id === entryId);

    if (entryIndex === -1) {
      throw new HttpException(
        `Entry with ID "${entryId}" not found in knowledge base "${id}"`,
        HttpStatus.NOT_FOUND,
      );
    }

    kb.entries.splice(entryIndex, 1);
    kb.updatedAt = new Date().toISOString();

    this.logger.log(`Deleted entry ${entryId} from knowledge base ${kb.id}`);

    return { success: true, deletedEntryId: entryId };
  }
}
