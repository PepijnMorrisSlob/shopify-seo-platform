/**
 * QA Pages Controller
 * Shopify SEO Platform
 *
 * API endpoints for Q&A content page management:
 * - GET    /api/qa-pages           - List Q&A pages with filtering, pagination, sorting
 * - GET    /api/qa-pages/:id       - Get a single Q&A page
 * - POST   /api/qa-pages/:id/approve   - Approve & optionally publish a page
 * - PUT    /api/qa-pages/:id       - Update a Q&A page
 * - DELETE /api/qa-pages/:id       - Delete a Q&A page
 * - POST   /api/qa-pages/:id/regenerate - Regenerate AI content for a page
 *
 * Uses Prisma for all database operations against the QAPage model.
 * Seeds realistic mock data when the table is empty.
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
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Response mapping helper - converts Prisma QAPage rows to the shape the
// frontend QAPage interface expects
// ---------------------------------------------------------------------------

function mapQAPageToResponse(row: any): any {
  return {
    id: row.id,
    organizationId: row.organizationId,

    // Content
    question: row.question,
    answerContent: row.answerContent || '',
    answerMarkdown: row.answerMarkdown || '',
    featuredImageUrl: row.featuredImageUrl || undefined,

    // Shopify Integration
    shopifyBlogId: row.shopifyBlogId || undefined,
    shopifyBlogPostId: row.shopifyBlogPostId || undefined,
    shopifyPageId: row.shopifyPageId || undefined,
    shopifyUrl: row.shopifyUrl || undefined,

    // SEO
    targetKeyword: row.targetKeyword || '',
    metaTitle: row.metaTitle || row.question,
    metaDescription: row.metaDescription || '',
    h1: row.h1 || row.question,
    schemaMarkup: row.schemaMarkup || {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: row.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: row.answerContent || '',
          },
        },
      ],
    },

    // Performance
    currentPosition: row.currentPosition || undefined,
    bestPosition: row.bestPosition || undefined,
    monthlyImpressions: row.monthlyImpressions || 0,
    monthlyClicks: row.monthlyClicks || 0,
    monthlyTraffic: row.monthlyTraffic || 0,
    ctr: row.ctr ? parseFloat(row.ctr.toString()) : 0,
    seoScore: row.seoScore || 0,

    // Internal links (loaded separately or empty)
    internalLinks: [],

    // Status
    status: row.status,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : undefined,
    lastOptimizedAt: row.lastOptimizedAt
      ? row.lastOptimizedAt.toISOString()
      : undefined,

    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Seed data - realistic Q&A pages in various statuses
// ---------------------------------------------------------------------------

function buildSeedData(organizationId: string) {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  return [
    {
      organizationId,
      question: 'How to choose the right running shoes for beginners?',
      answerContent:
        '<h2>Finding Your Perfect Running Shoes</h2><p>Choosing the right running shoes is crucial for comfort, performance, and injury prevention. As a beginner, focus on three key factors: foot type, running surface, and proper fit.</p><h3>1. Know Your Foot Type</h3><p>Visit a specialty running store for a gait analysis. This reveals whether you overpronate (feet roll inward), underpronate (feet roll outward), or have a neutral gait. Each type benefits from different shoe support levels.</p><h3>2. Consider Your Running Surface</h3><p>Road running shoes have flat, smooth soles for pavement. Trail shoes offer aggressive tread for dirt paths and uneven terrain. Choose based on where you will run most often.</p><h3>3. Get the Right Fit</h3><p>Shop in the afternoon when feet are slightly swollen. Leave a thumbnail width of space between your longest toe and the shoe end. Wear the socks you plan to run in during fitting.</p><h3>4. Start with Stability</h3><p>Beginners often benefit from mild stability shoes that offer support without being overly corrective. Brands like ASICS Gel-Kayano, Brooks Adrenaline, and New Balance 860 are excellent starting points.</p>',
      answerMarkdown:
        '## Finding Your Perfect Running Shoes\n\nChoosing the right running shoes is crucial for comfort, performance, and injury prevention. As a beginner, focus on three key factors: foot type, running surface, and proper fit.\n\n### 1. Know Your Foot Type\n\nVisit a specialty running store for a gait analysis...\n\n### 2. Consider Your Running Surface\n\nRoad running shoes have flat, smooth soles for pavement...\n\n### 3. Get the Right Fit\n\nShop in the afternoon when feet are slightly swollen...\n\n### 4. Start with Stability\n\nBeginners often benefit from mild stability shoes...',
      status: 'published',
      targetKeyword: 'how to choose running shoes beginners',
      metaTitle: 'How to Choose Running Shoes for Beginners | Expert Guide 2026',
      metaDescription:
        'Learn how to choose the perfect running shoes as a beginner. Expert tips on foot type, fit, and top shoe recommendations for new runners.',
      h1: 'How to Choose the Right Running Shoes for Beginners',
      seoScore: 92,
      currentPosition: 4,
      bestPosition: 3,
      monthlyImpressions: 8500,
      monthlyClicks: 1200,
      monthlyTraffic: 980,
      ctr: 14.12,
      publishedAt: daysAgo(30),
      lastOptimizedAt: daysAgo(5),
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How to choose the right running shoes for beginners?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Focus on three key factors: foot type (get a gait analysis), running surface (road vs trail), and proper fit (thumbnail width of space at toe).',
            },
          },
        ],
      },
    },
    {
      organizationId,
      question: 'What is the difference between organic and conventional cotton?',
      answerContent:
        '<h2>Organic vs Conventional Cotton: A Complete Comparison</h2><p>Understanding the differences between organic and conventional cotton helps you make informed purchasing decisions that align with your values and needs.</p><h3>Growing Methods</h3><p>Organic cotton is grown without synthetic pesticides, herbicides, or GMO seeds. Farmers use natural methods like crop rotation and composting. Conventional cotton relies heavily on chemical inputs -- it accounts for 16% of global insecticide use despite covering just 2.4% of arable land.</p><h3>Environmental Impact</h3><p>Organic cotton uses 91% less water from irrigation and produces 46% fewer greenhouse gas emissions compared to conventional cotton. The absence of chemical runoff also protects local waterways and biodiversity.</p><h3>Quality and Feel</h3><p>Organic cotton fibers are often hand-picked, preserving fiber length and resulting in softer, more durable fabric. Conventional cotton is typically machine-harvested, which can damage fibers.</p><h3>Price Difference</h3><p>Organic cotton products cost 20-50% more due to lower yields and labor-intensive farming. However, the durability often means better value over time.</p>',
      answerMarkdown:
        '## Organic vs Conventional Cotton: A Complete Comparison\n\nUnderstanding the differences helps you make informed purchasing decisions...',
      status: 'published',
      targetKeyword: 'organic vs conventional cotton difference',
      metaTitle:
        'Organic vs Conventional Cotton: Key Differences Explained | 2026',
      metaDescription:
        'Discover the real differences between organic and conventional cotton. Compare growing methods, environmental impact, quality, and cost.',
      h1: 'What is the Difference Between Organic and Conventional Cotton?',
      seoScore: 88,
      currentPosition: 7,
      bestPosition: 5,
      monthlyImpressions: 5200,
      monthlyClicks: 680,
      monthlyTraffic: 520,
      ctr: 13.08,
      publishedAt: daysAgo(45),
      lastOptimizedAt: daysAgo(10),
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is the difference between organic and conventional cotton?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Organic cotton is grown without synthetic pesticides or GMOs, uses 91% less water, and produces softer fabric. It costs 20-50% more but offers better durability.',
            },
          },
        ],
      },
    },
    {
      organizationId,
      question: 'How to remove coffee stains from white clothing?',
      answerContent:
        '<h2>Removing Coffee Stains from White Clothing</h2><p>Coffee stains are tannin-based, meaning they respond well to specific treatment methods. The key is acting quickly and using the right approach for the fabric type.</p><h3>Immediate Action</h3><p>Blot (never rub) the stain with a clean cloth. Run cold water through the back of the stain to push coffee out of the fibers. Avoid hot water, which can set the stain permanently.</p><h3>Home Remedies That Work</h3><ul><li><strong>White vinegar + dish soap:</strong> Mix 1 tablespoon white vinegar, 1 tablespoon dish soap, and 2 cups cold water. Soak for 30 minutes.</li><li><strong>Baking soda paste:</strong> Mix baking soda with water to form a paste. Apply directly to stain, let sit 30 minutes, then brush off.</li><li><strong>Hydrogen peroxide:</strong> For white cotton or polyester, apply 3% hydrogen peroxide directly. Let sit 10 minutes, then rinse.</li></ul><h3>Machine Washing</h3><p>After pre-treating, wash on the hottest setting safe for the fabric. Check the stain before drying -- heat from the dryer can permanently set any remaining stain.</p>',
      answerMarkdown:
        '## Removing Coffee Stains from White Clothing\n\nCoffee stains are tannin-based and respond well to specific treatments...',
      status: 'pending_review',
      targetKeyword: 'remove coffee stains white clothing',
      metaTitle: 'How to Remove Coffee Stains from White Clothing | Easy Guide',
      metaDescription:
        'Remove coffee stains from white clothing with proven methods. Step-by-step guide using vinegar, baking soda, and hydrogen peroxide.',
      h1: 'How to Remove Coffee Stains from White Clothing',
      seoScore: 85,
      monthlyImpressions: 0,
      monthlyClicks: 0,
      monthlyTraffic: 0,
      ctr: 0,
      lastOptimizedAt: daysAgo(2),
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How to remove coffee stains from white clothing?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Blot immediately, run cold water through the back of the stain, then treat with white vinegar and dish soap solution. Soak 30 minutes and wash on appropriate heat.',
            },
          },
        ],
      },
    },
    {
      organizationId,
      question: 'What are the best sustainable packaging alternatives?',
      answerContent:
        '<h2>Top Sustainable Packaging Alternatives for E-commerce</h2><p>Sustainable packaging reduces environmental impact while maintaining product protection during shipping. Here are the best options available today.</p><h3>1. Corrugated Cardboard</h3><p>Recyclable, biodegradable, and made from up to 80% recycled content. It remains the gold standard for eco-friendly shipping boxes.</p><h3>2. Mushroom Packaging</h3><p>Made from mycelium (mushroom roots) and agricultural waste. Fully compostable in 45 days and provides excellent cushioning for fragile items.</p><h3>3. Compostable Mailers</h3><p>Plant-based poly mailers made from cornstarch or PLA break down in commercial composting facilities within 180 days.</p>',
      answerMarkdown:
        '## Top Sustainable Packaging Alternatives\n\nSustainable packaging reduces environmental impact while maintaining product protection...',
      status: 'pending_review',
      targetKeyword: 'best sustainable packaging alternatives',
      metaTitle:
        'Best Sustainable Packaging Alternatives for E-commerce | 2026 Guide',
      metaDescription:
        'Explore the best sustainable packaging alternatives for your e-commerce business. From mushroom packaging to compostable mailers.',
      h1: 'What Are the Best Sustainable Packaging Alternatives?',
      seoScore: 79,
      monthlyImpressions: 0,
      monthlyClicks: 0,
      monthlyTraffic: 0,
      ctr: 0,
      lastOptimizedAt: daysAgo(1),
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      },
    },
    {
      organizationId,
      question: 'How to measure your ring size accurately at home?',
      answerContent: null,
      answerMarkdown: null,
      status: 'generating',
      targetKeyword: 'measure ring size at home',
      metaTitle: 'How to Measure Your Ring Size at Home',
      metaDescription:
        'Learn how to accurately measure your ring size at home with simple tools.',
      h1: 'How to Measure Your Ring Size Accurately at Home',
      seoScore: 0,
      monthlyImpressions: 0,
      monthlyClicks: 0,
      monthlyTraffic: 0,
      ctr: 0,
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      },
    },
    {
      organizationId,
      question: 'Why is my package delayed and what can I do about it?',
      answerContent: null,
      answerMarkdown: null,
      status: 'generating',
      targetKeyword: 'package delayed what to do',
      metaTitle: 'Why Is My Package Delayed? What You Can Do',
      metaDescription:
        'Find out common reasons for package delays and what steps you can take to resolve shipping issues.',
      h1: 'Why Is My Package Delayed and What Can I Do About It?',
      seoScore: 0,
      monthlyImpressions: 0,
      monthlyClicks: 0,
      monthlyTraffic: 0,
      ctr: 0,
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      },
    },
    {
      organizationId,
      question: 'How to build a minimalist wardrobe that lasts?',
      answerContent:
        '<h2>Building a Minimalist Wardrobe That Lasts</h2><p>A minimalist wardrobe focuses on quality over quantity, creating a versatile collection of timeless pieces that mix and match effortlessly.</p><h3>Step 1: Audit Your Closet</h3><p>Remove everything and keep only items you have worn in the last 6 months that still fit and make you feel confident.</p><h3>Step 2: Define Your Color Palette</h3><p>Choose 3-4 neutral base colors and 2-3 accent colors. This ensures everything coordinates naturally.</p><h3>Step 3: Invest in Quality Basics</h3><p>Build around high-quality essentials: well-fitted jeans, classic white and black t-shirts, a tailored blazer, quality leather shoes, and a versatile outerwear piece.</p>',
      answerMarkdown:
        '## Building a Minimalist Wardrobe That Lasts\n\nA minimalist wardrobe focuses on quality over quantity...',
      status: 'draft',
      targetKeyword: 'build minimalist wardrobe',
      metaTitle: 'How to Build a Minimalist Wardrobe That Lasts | Complete Guide',
      metaDescription:
        'Learn how to build a minimalist wardrobe with quality pieces that last. Step-by-step guide to decluttering and curating timeless outfits.',
      h1: 'How to Build a Minimalist Wardrobe That Lasts',
      seoScore: 72,
      monthlyImpressions: 0,
      monthlyClicks: 0,
      monthlyTraffic: 0,
      ctr: 0,
      lastOptimizedAt: daysAgo(3),
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      },
    },
    {
      organizationId,
      question: 'What thread count should I look for in bed sheets?',
      answerContent:
        '<h2>Understanding Thread Count in Bed Sheets</h2><p>Thread count measures the number of threads per square inch of fabric. While often marketed as a quality indicator, the truth is more nuanced.</p><h3>The Sweet Spot: 300-600</h3><p>For most people, sheets with 300-600 thread count offer the best balance of softness, durability, and breathability. Higher counts do not always mean better quality.</p><h3>Why Higher Is Not Always Better</h3><p>Manufacturers inflate thread count by using multi-ply threads. A 1000+ thread count sheet using 2-ply yarn is actually 500 threads -- and often feels heavy and less breathable.</p><h3>Material Matters More</h3><p>Egyptian cotton, Supima cotton, and linen at 400 thread count will outperform cheap cotton at 800 thread count every time. Focus on fiber quality first, then thread count.</p>',
      answerMarkdown:
        '## Understanding Thread Count in Bed Sheets\n\nThread count measures the number of threads per square inch...',
      status: 'draft',
      targetKeyword: 'best thread count bed sheets',
      metaTitle: 'What Thread Count for Bed Sheets? Expert Guide | 2026',
      metaDescription:
        'Find out the ideal thread count for bed sheets. Learn why 300-600 is the sweet spot and why material quality matters more than count.',
      h1: 'What Thread Count Should I Look for in Bed Sheets?',
      seoScore: 68,
      monthlyImpressions: 0,
      monthlyClicks: 0,
      monthlyTraffic: 0,
      ctr: 0,
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      },
    },
    {
      organizationId,
      question: 'How to properly store leather bags to prevent cracking?',
      answerContent:
        '<h2>Storing Leather Bags to Prevent Cracking</h2><p>Proper storage extends the life of leather bags by years. Cracking occurs when leather loses moisture or is stored improperly. Follow these expert tips to keep your bags in perfect condition.</p><h3>Clean Before Storing</h3><p>Wipe down the bag with a soft, damp cloth and apply a leather conditioner. This creates a moisture barrier that prevents drying during storage.</p><h3>Stuff and Shape</h3><p>Fill bags with acid-free tissue paper or a bag pillow to maintain their shape. Never use newspaper -- the ink can transfer to leather.</p><h3>Use Dust Bags</h3><p>Store each bag in a breathable cotton dust bag. Avoid plastic bags, which trap moisture and can cause mold growth.</p><h3>Climate Control</h3><p>Store in a cool, dry place away from direct sunlight. Ideal conditions are 60-70 degrees F with 40-50% humidity. Never store in attics, basements, or garages where temperatures fluctuate.</p>',
      answerMarkdown:
        '## Storing Leather Bags to Prevent Cracking\n\nProper storage extends the life of leather bags by years...',
      status: 'published',
      targetKeyword: 'store leather bags prevent cracking',
      metaTitle: 'How to Store Leather Bags to Prevent Cracking | Expert Tips',
      metaDescription:
        'Learn how to properly store leather bags to prevent cracking and extend their lifespan. Expert tips on cleaning, stuffing, and climate control.',
      h1: 'How to Properly Store Leather Bags to Prevent Cracking',
      seoScore: 90,
      currentPosition: 3,
      bestPosition: 2,
      monthlyImpressions: 12200,
      monthlyClicks: 2100,
      monthlyTraffic: 1650,
      ctr: 17.21,
      publishedAt: daysAgo(60),
      lastOptimizedAt: daysAgo(7),
      shopifyUrl: '/blogs/tips/store-leather-bags-prevent-cracking',
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How to properly store leather bags to prevent cracking?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Clean and condition the leather, stuff with acid-free tissue paper, store in a breathable cotton dust bag in a cool dry place at 60-70F with 40-50% humidity.',
            },
          },
        ],
      },
    },
    {
      organizationId,
      question: 'Is it worth buying refurbished electronics?',
      answerContent:
        '<h2>The Truth About Refurbished Electronics</h2><p>Refurbished electronics can save you 20-50% compared to new products. But not all refurbished items are created equal. Here is what you need to know to make a smart purchase.</p><h3>Understanding Refurbished Grades</h3><p><strong>Grade A (Like New):</strong> Minimal cosmetic wear, fully tested, often includes original accessories. Best value for quality-conscious buyers.</p><p><strong>Grade B (Good):</strong> Light scratches or scuffs, fully functional. Great for items that will be in a case anyway.</p><p><strong>Grade C (Fair):</strong> Visible wear, fully functional. Best for budget-conscious buyers or backup devices.</p><h3>Where to Buy Safely</h3><p>Stick to certified refurbished programs: Apple Certified Refurbished, Amazon Renewed, and manufacturer direct programs. These offer warranties and return policies.</p>',
      answerMarkdown:
        '## The Truth About Refurbished Electronics\n\nRefurbished electronics can save you 20-50% compared to new...',
      status: 'published',
      targetKeyword: 'buying refurbished electronics worth it',
      metaTitle: 'Is It Worth Buying Refurbished Electronics? | Honest Guide 2026',
      metaDescription:
        'Find out if refurbished electronics are worth buying. Learn about grades, where to buy safely, and how to get the best deals on certified refurbished products.',
      h1: 'Is It Worth Buying Refurbished Electronics?',
      seoScore: 86,
      currentPosition: 9,
      bestPosition: 6,
      monthlyImpressions: 3800,
      monthlyClicks: 420,
      monthlyTraffic: 350,
      ctr: 11.05,
      publishedAt: daysAgo(20),
      lastOptimizedAt: daysAgo(4),
      schemaMarkup: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@Controller('qa-pages')
export class QAPagesController implements OnModuleInit {
  private readonly logger = new Logger(QAPagesController.name);
  private prisma = new PrismaClient();
  private seeded = false;

  /**
   * On module init, seed the database with realistic mock data if empty
   */
  async onModuleInit() {
    await this.ensureSeeded();
  }

  /**
   * Resolve organizationId - DEV MODE uses first available org
   */
  private async resolveOrganizationId(): Promise<string> {
    try {
      const firstOrg = await this.prisma.organization.findFirst({
        select: { id: true },
      });
      if (firstOrg) {
        return firstOrg.id;
      }
    } catch {
      // Database might not be available
    }
    return 'org-dev';
  }

  /**
   * Seed the QAPage table with realistic mock data when empty
   */
  private async ensureSeeded(): Promise<void> {
    if (this.seeded) return;

    try {
      const count = await this.prisma.qAPage.count();
      if (count > 0) {
        this.logger.log(`QAPage table already has ${count} rows, skipping seed`);
        this.seeded = true;
        return;
      }

      const organizationId = await this.resolveOrganizationId();
      const seedData = buildSeedData(organizationId);

      this.logger.log(
        `Seeding ${seedData.length} QA pages for org ${organizationId}...`
      );

      for (const data of seedData) {
        try {
          await this.prisma.qAPage.create({ data });
        } catch (err: any) {
          this.logger.warn(`Seed insert failed: ${err.message}`);
        }
      }

      const newCount = await this.prisma.qAPage.count();
      this.logger.log(`QAPage seed complete. ${newCount} rows in table.`);
      this.seeded = true;
    } catch (error: any) {
      this.logger.error(`Failed to seed QA pages: ${error.message}`);
      // Non-fatal: controller still works, just returns empty data
    }
  }

  // =========================================================================
  // GET /api/qa-pages
  // =========================================================================

  /**
   * List Q&A pages with filtering, pagination, and sorting
   *
   * Query params:
   *   status     - Filter by status (draft, generating, pending_review, published, archived)
   *   limit      - Number of items per page (default 20, max 100)
   *   offset     - Number of items to skip (default 0)
   *   sortBy     - Sort field: createdAt | seoScore | traffic | position (default createdAt)
   *   sortOrder  - Sort direction: asc | desc (default desc)
   *
   * Returns: { pages: QAPage[], total: number, hasMore: boolean }
   */
  @Get()
  async getQAPages(
    @Query('status') status?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    await this.ensureSeeded();

    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetStr || '0', 10) || 0, 0);

    this.logger.log(
      `GET /qa-pages - status=${status}, limit=${limit}, offset=${offset}, sortBy=${sortBy}, sortOrder=${sortOrder}`
    );

    // Build where clause
    const where: any = {};
    const validStatuses = [
      'draft',
      'generating',
      'pending_review',
      'published',
      'archived',
    ];
    if (status && validStatuses.includes(status)) {
      where.status = status;
    }

    // Build order by
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    let orderBy: any;
    switch (sortBy) {
      case 'seoScore':
        orderBy = { seoScore: order };
        break;
      case 'traffic':
        orderBy = { monthlyTraffic: order };
        break;
      case 'position':
        orderBy = { currentPosition: order };
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: order };
        break;
    }

    try {
      const [rows, total] = await Promise.all([
        this.prisma.qAPage.findMany({
          where,
          orderBy,
          skip: offset,
          take: limit,
        }),
        this.prisma.qAPage.count({ where }),
      ]);

      const pages = rows.map(mapQAPageToResponse);
      const hasMore = offset + limit < total;

      this.logger.log(
        `Returning ${pages.length} QA pages (total: ${total}, hasMore: ${hasMore})`
      );

      return {
        pages,
        total,
        hasMore,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch QA pages: ${error.message}`);
      throw new HttpException(
        `Failed to fetch QA pages: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // GET /api/qa-pages/:id
  // =========================================================================

  /**
   * Get a single Q&A page by ID
   * Returns: QAPage
   */
  @Get(':id')
  async getQAPage(@Param('id') id: string) {
    this.logger.log(`GET /qa-pages/${id}`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Page ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const row = await this.prisma.qAPage.findUnique({
        where: { id },
      });

      if (!row) {
        throw new HttpException(
          `QA page not found: ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return mapQAPageToResponse(row);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to fetch QA page ${id}: ${error.message}`);
      throw new HttpException(
        `Failed to fetch QA page: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // POST /api/qa-pages/:id/approve
  // =========================================================================

  /**
   * Approve and optionally publish a Q&A page
   * Body: { publish: boolean }
   * Returns: { success: true, pageId: string, publishedAt?: string, shopifyUrl?: string }
   */
  @Post(':id/approve')
  async approveQAPage(
    @Param('id') id: string,
    @Body() body: { publish?: boolean },
  ) {
    this.logger.log(
      `POST /qa-pages/${id}/approve - publish=${body.publish}`
    );

    if (!id || id.trim().length === 0) {
      throw new HttpException('Page ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const existing = await this.prisma.qAPage.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new HttpException(
          `QA page not found: ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      const publishedAt = body.publish ? new Date() : null;
      const newStatus = body.publish ? 'published' : 'draft';

      // Generate a mock Shopify URL when publishing
      const shopifyUrl = body.publish
        ? `/blogs/qa/${existing.question
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 80)}`
        : existing.shopifyUrl;

      await this.prisma.qAPage.update({
        where: { id },
        data: {
          status: newStatus,
          publishedAt,
          shopifyUrl,
        },
      });

      this.logger.log(
        `QA page ${id} approved -> status: ${newStatus}`
      );

      return {
        success: true,
        pageId: id,
        publishedAt: publishedAt ? publishedAt.toISOString() : undefined,
        shopifyUrl: shopifyUrl || undefined,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to approve QA page ${id}: ${error.message}`);
      throw new HttpException(
        `Failed to approve QA page: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // PUT /api/qa-pages/:id
  // =========================================================================

  /**
   * Update a Q&A page (partial update)
   * Body: partial QAPage fields
   * Returns: updated QAPage
   */
  @Put(':id')
  async updateQAPage(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    this.logger.log(`PUT /qa-pages/${id}`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Page ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const existing = await this.prisma.qAPage.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new HttpException(
          `QA page not found: ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Build update data from allowed fields
      const updateData: Record<string, any> = {};

      const allowedStringFields = [
        'question',
        'answerContent',
        'answerMarkdown',
        'featuredImageUrl',
        'targetKeyword',
        'metaTitle',
        'metaDescription',
        'h1',
        'status',
        'shopifyUrl',
        'shopifyBlogId',
        'shopifyBlogPostId',
        'shopifyPageId',
      ];

      for (const field of allowedStringFields) {
        if (body[field] !== undefined) {
          // Map camelCase to Prisma field names (they match in this schema)
          updateData[field] = body[field];
        }
      }

      // Handle numeric fields
      const allowedNumericFields = [
        'seoScore',
        'currentPosition',
        'bestPosition',
        'monthlyImpressions',
        'monthlyClicks',
        'monthlyTraffic',
      ];
      for (const field of allowedNumericFields) {
        if (body[field] !== undefined) {
          updateData[field] =
            typeof body[field] === 'number'
              ? body[field]
              : parseInt(body[field], 10);
        }
      }

      // Handle decimal ctr
      if (body.ctr !== undefined) {
        updateData.ctr =
          typeof body.ctr === 'number'
            ? body.ctr
            : parseFloat(body.ctr);
      }

      // Handle JSON field
      if (body.schemaMarkup !== undefined) {
        updateData.schemaMarkup = body.schemaMarkup;
      }

      // Handle date fields
      if (body.publishedAt !== undefined) {
        updateData.publishedAt = body.publishedAt
          ? new Date(body.publishedAt)
          : null;
      }
      if (body.lastOptimizedAt !== undefined) {
        updateData.lastOptimizedAt = body.lastOptimizedAt
          ? new Date(body.lastOptimizedAt)
          : null;
      }

      const updated = await this.prisma.qAPage.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`QA page ${id} updated successfully`);

      return mapQAPageToResponse(updated);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update QA page ${id}: ${error.message}`);
      throw new HttpException(
        `Failed to update QA page: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // DELETE /api/qa-pages/:id
  // =========================================================================

  /**
   * Delete a Q&A page
   * Returns: { success: true }
   */
  @Delete(':id')
  async deleteQAPage(@Param('id') id: string) {
    this.logger.log(`DELETE /qa-pages/${id}`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Page ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const existing = await this.prisma.qAPage.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new HttpException(
          `QA page not found: ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      await this.prisma.qAPage.delete({
        where: { id },
      });

      this.logger.log(`QA page ${id} deleted successfully`);

      return { success: true };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to delete QA page ${id}: ${error.message}`);
      throw new HttpException(
        `Failed to delete QA page: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // POST /api/qa-pages/:id/regenerate
  // =========================================================================

  /**
   * Regenerate AI content for a Q&A page
   * Sets status back to 'generating' and clears existing content
   * Returns: updated QAPage
   */
  @Post(':id/regenerate')
  async regenerateQAPage(@Param('id') id: string) {
    this.logger.log(`POST /qa-pages/${id}/regenerate`);

    if (!id || id.trim().length === 0) {
      throw new HttpException('Page ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const existing = await this.prisma.qAPage.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new HttpException(
          `QA page not found: ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }

      const updated = await this.prisma.qAPage.update({
        where: { id },
        data: {
          status: 'generating',
          answerContent: null,
          answerMarkdown: null,
          seoScore: 0,
          publishedAt: null,
        },
      });

      this.logger.log(`QA page ${id} set to regenerating`);

      return mapQAPageToResponse(updated);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to regenerate QA page ${id}: ${error.message}`
      );
      throw new HttpException(
        `Failed to regenerate QA page: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
