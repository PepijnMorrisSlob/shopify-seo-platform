/**
 * Questions Controller
 * Shopify SEO Platform
 *
 * API endpoints for question discovery and management:
 * - GET /api/questions/discover - Discover SEO questions with filtering/pagination
 * - GET /api/questions/categories - Get available question categories
 * - POST /api/questions/add-to-queue - Add questions to content generation queue
 *
 * Returns realistic mock data for discovered questions.
 * Uses Prisma for QAPage creation when adding to queue.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { contentGenerationQueue } from '../queues/content-generation-queue';

// ---------------------------------------------------------------------------
// Types (aligned with frontend qa-content.types.ts)
// ---------------------------------------------------------------------------

interface QuestionResponse {
  id: string;
  organizationId: string;
  text: string;
  source: 'paa' | 'competitor' | 'ai_suggestion' | 'template' | 'manual';
  category: string;
  priority: 'low' | 'medium' | 'high';
  searchVolume?: number;
  difficulty?: number;
  competitorsCovering?: number;
  status: 'discovered' | 'queued' | 'generating' | 'completed' | 'rejected';
  createdAt: string;
}

interface AddToQueueBody {
  questionIds: string[];
}

// ---------------------------------------------------------------------------
// Realistic mock question data
// ---------------------------------------------------------------------------

const MOCK_QUESTIONS: QuestionResponse[] = [
  {
    id: 'q-001',
    organizationId: 'org-dev',
    text: 'How to choose the right size when shopping online?',
    source: 'paa',
    category: 'Buying Guide',
    priority: 'high',
    searchVolume: 12400,
    difficulty: 35,
    competitorsCovering: 8,
    status: 'discovered',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'q-002',
    organizationId: 'org-dev',
    text: 'What is the best way to care for leather products?',
    source: 'paa',
    category: 'Product Care',
    priority: 'high',
    searchVolume: 8900,
    difficulty: 28,
    competitorsCovering: 12,
    status: 'discovered',
    createdAt: '2026-01-15T10:05:00Z',
  },
  {
    id: 'q-003',
    organizationId: 'org-dev',
    text: 'How to remove stains from fabric furniture?',
    source: 'paa',
    category: 'How-To',
    priority: 'high',
    searchVolume: 22100,
    difficulty: 42,
    competitorsCovering: 15,
    status: 'discovered',
    createdAt: '2026-01-16T08:30:00Z',
  },
  {
    id: 'q-004',
    organizationId: 'org-dev',
    text: 'Cotton vs polyester: which fabric is better for summer?',
    source: 'competitor',
    category: 'Comparison',
    priority: 'medium',
    searchVolume: 6700,
    difficulty: 38,
    competitorsCovering: 6,
    status: 'discovered',
    createdAt: '2026-01-16T09:15:00Z',
  },
  {
    id: 'q-005',
    organizationId: 'org-dev',
    text: 'How to measure your ring size at home?',
    source: 'paa',
    category: 'How-To',
    priority: 'high',
    searchVolume: 33100,
    difficulty: 25,
    competitorsCovering: 20,
    status: 'discovered',
    createdAt: '2026-01-17T11:00:00Z',
  },
  {
    id: 'q-006',
    organizationId: 'org-dev',
    text: 'What are the signs of a high-quality product?',
    source: 'ai_suggestion',
    category: 'Buying Guide',
    priority: 'medium',
    searchVolume: 4500,
    difficulty: 45,
    competitorsCovering: 4,
    status: 'discovered',
    createdAt: '2026-01-17T14:20:00Z',
  },
  {
    id: 'q-007',
    organizationId: 'org-dev',
    text: 'How to fix a broken zipper without replacing it?',
    source: 'paa',
    category: 'Troubleshooting',
    priority: 'medium',
    searchVolume: 18200,
    difficulty: 30,
    competitorsCovering: 11,
    status: 'discovered',
    createdAt: '2026-01-18T09:00:00Z',
  },
  {
    id: 'q-008',
    organizationId: 'org-dev',
    text: 'What is the return policy for online purchases?',
    source: 'ai_suggestion',
    category: 'Buying Guide',
    priority: 'low',
    searchVolume: 2800,
    difficulty: 20,
    competitorsCovering: 25,
    status: 'discovered',
    createdAt: '2026-01-18T10:45:00Z',
  },
  {
    id: 'q-009',
    organizationId: 'org-dev',
    text: 'How to style oversized clothing for a polished look?',
    source: 'competitor',
    category: 'How-To',
    priority: 'medium',
    searchVolume: 5400,
    difficulty: 33,
    competitorsCovering: 7,
    status: 'discovered',
    createdAt: '2026-01-19T13:30:00Z',
  },
  {
    id: 'q-010',
    organizationId: 'org-dev',
    text: 'Organic vs conventional products: is it worth the price?',
    source: 'paa',
    category: 'Comparison',
    priority: 'high',
    searchVolume: 14800,
    difficulty: 50,
    competitorsCovering: 9,
    status: 'discovered',
    createdAt: '2026-01-20T07:00:00Z',
  },
  {
    id: 'q-011',
    organizationId: 'org-dev',
    text: 'How to properly store seasonal items to prevent damage?',
    source: 'ai_suggestion',
    category: 'Product Care',
    priority: 'medium',
    searchVolume: 3600,
    difficulty: 22,
    competitorsCovering: 5,
    status: 'discovered',
    createdAt: '2026-01-20T15:10:00Z',
  },
  {
    id: 'q-012',
    organizationId: 'org-dev',
    text: 'What materials are most sustainable for everyday products?',
    source: 'competitor',
    category: 'Buying Guide',
    priority: 'high',
    searchVolume: 9200,
    difficulty: 40,
    competitorsCovering: 10,
    status: 'discovered',
    createdAt: '2026-01-21T08:45:00Z',
  },
  {
    id: 'q-013',
    organizationId: 'org-dev',
    text: 'How to identify counterfeit products online?',
    source: 'paa',
    category: 'Buying Guide',
    priority: 'high',
    searchVolume: 27500,
    difficulty: 48,
    competitorsCovering: 14,
    status: 'discovered',
    createdAt: '2026-01-22T10:00:00Z',
  },
  {
    id: 'q-014',
    organizationId: 'org-dev',
    text: 'Why do products look different in person than online?',
    source: 'ai_suggestion',
    category: 'Troubleshooting',
    priority: 'low',
    searchVolume: 1900,
    difficulty: 18,
    competitorsCovering: 3,
    status: 'discovered',
    createdAt: '2026-01-22T11:30:00Z',
  },
  {
    id: 'q-015',
    organizationId: 'org-dev',
    text: 'How to create a capsule wardrobe on a budget?',
    source: 'competitor',
    category: 'How-To',
    priority: 'medium',
    searchVolume: 7800,
    difficulty: 36,
    competitorsCovering: 8,
    status: 'discovered',
    createdAt: '2026-01-23T09:20:00Z',
  },
  {
    id: 'q-016',
    organizationId: 'org-dev',
    text: 'What is the difference between thread count and fabric quality?',
    source: 'paa',
    category: 'Comparison',
    priority: 'medium',
    searchVolume: 4100,
    difficulty: 32,
    competitorsCovering: 6,
    status: 'discovered',
    createdAt: '2026-01-24T14:00:00Z',
  },
  {
    id: 'q-017',
    organizationId: 'org-dev',
    text: 'How to wash delicate fabrics without damaging them?',
    source: 'paa',
    category: 'Product Care',
    priority: 'high',
    searchVolume: 11300,
    difficulty: 26,
    competitorsCovering: 13,
    status: 'discovered',
    createdAt: '2026-01-25T08:00:00Z',
  },
  {
    id: 'q-018',
    organizationId: 'org-dev',
    text: 'What gifts are trending this season for every budget?',
    source: 'ai_suggestion',
    category: 'Buying Guide',
    priority: 'medium',
    searchVolume: 15600,
    difficulty: 55,
    competitorsCovering: 18,
    status: 'discovered',
    createdAt: '2026-01-26T10:30:00Z',
  },
  {
    id: 'q-019',
    organizationId: 'org-dev',
    text: 'How to troubleshoot common shipping and delivery issues?',
    source: 'ai_suggestion',
    category: 'Troubleshooting',
    priority: 'low',
    searchVolume: 2200,
    difficulty: 15,
    competitorsCovering: 7,
    status: 'discovered',
    createdAt: '2026-01-27T12:00:00Z',
  },
  {
    id: 'q-020',
    organizationId: 'org-dev',
    text: 'How to set up a home office with ergonomic furniture?',
    source: 'competitor',
    category: 'How-To',
    priority: 'medium',
    searchVolume: 6100,
    difficulty: 41,
    competitorsCovering: 9,
    status: 'discovered',
    createdAt: '2026-01-28T09:45:00Z',
  },
];

const QUESTION_CATEGORIES = [
  'Product Care',
  'Buying Guide',
  'How-To',
  'Comparison',
  'Troubleshooting',
];

@Controller('questions')
export class QuestionsController {
  private readonly logger = new Logger(QuestionsController.name);
  private prisma = new PrismaClient();

  // Track queued question IDs in memory (mock - would be in DB in production)
  private queuedQuestionIds = new Set<string>();

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
   * Discover questions with filtering and pagination
   * GET /api/questions/discover?source=&category=&priority=&limit=&offset=
   *
   * Returns: { questions: Question[], total: number, hasMore: boolean }
   */
  @Get('discover')
  async discoverQuestions(
    @Query('source') source?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: string,
    @Query('minSearchVolume') minSearchVolume?: string,
    @Query('maxSearchVolume') maxSearchVolume?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    this.logger.log(
      `Discovering questions - source=${source}, category=${category}, priority=${priority}, limit=${limitStr}, offset=${offsetStr}`
    );

    const limit = parseInt(limitStr || '50', 10);
    const offset = parseInt(offsetStr || '0', 10);

    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new HttpException('limit must be between 1 and 100', HttpStatus.BAD_REQUEST);
    }
    if (isNaN(offset) || offset < 0) {
      throw new HttpException('offset must be >= 0', HttpStatus.BAD_REQUEST);
    }

    // Start with all mock questions, marking queued ones
    let filtered = MOCK_QUESTIONS.map((q) => ({
      ...q,
      status: this.queuedQuestionIds.has(q.id)
        ? ('queued' as const)
        : q.status,
    }));

    // Apply source filter
    if (source) {
      filtered = filtered.filter((q) => q.source === source);
    }

    // Apply category filter
    if (category) {
      filtered = filtered.filter(
        (q) => q.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Apply priority filter
    if (priority) {
      filtered = filtered.filter((q) => q.priority === priority);
    }

    // Apply status filter
    if (status) {
      filtered = filtered.filter((q) => q.status === status);
    }

    // Apply search volume range filter
    if (minSearchVolume) {
      const min = parseInt(minSearchVolume, 10);
      if (!isNaN(min)) {
        filtered = filtered.filter((q) => (q.searchVolume || 0) >= min);
      }
    }
    if (maxSearchVolume) {
      const max = parseInt(maxSearchVolume, 10);
      if (!isNaN(max)) {
        filtered = filtered.filter((q) => (q.searchVolume || 0) <= max);
      }
    }

    const total = filtered.length;

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit);

    const hasMore = offset + limit < total;

    this.logger.log(
      `Returning ${paginated.length} questions (total: ${total}, hasMore: ${hasMore})`
    );

    return {
      questions: paginated,
      total,
      hasMore,
    };
  }

  /**
   * Get available question categories
   * GET /api/questions/categories
   *
   * Returns: string[]
   */
  @Get('categories')
  async getCategories() {
    this.logger.log('Returning question categories');

    // The frontend hook useQuestionCategories expects string[] directly
    return QUESTION_CATEGORIES;
  }

  /**
   * Add questions to the content generation queue
   * POST /api/questions/add-to-queue
   * Body: { questionIds: string[] }
   *
   * Creates QAPage entries in the database with status 'generating'
   * Returns: { queued: number, qaPageIds: string[] }
   */
  @Post('add-to-queue')
  async addToQueue(@Body() body: AddToQueueBody) {
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      throw new HttpException(
        'questionIds must be a non-empty array of strings',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (questionIds.length > 50) {
      throw new HttpException(
        'Cannot queue more than 50 questions at once',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Adding ${questionIds.length} questions to generation queue`);

    const organizationId = await this.resolveOrganizationId();
    const qaPageIds: string[] = [];

    for (const questionId of questionIds) {
      // Find the question in our mock data
      const question = MOCK_QUESTIONS.find((q) => q.id === questionId);
      if (!question) {
        this.logger.warn(`Question ${questionId} not found, skipping`);
        continue;
      }

      // Skip if already queued
      if (this.queuedQuestionIds.has(questionId)) {
        this.logger.warn(`Question ${questionId} already queued, skipping`);
        continue;
      }

      try {
        // Create a QAPage entry in the database
        const qaPage = await this.prisma.qAPage.create({
          data: {
            organizationId,
            question: question.text,
            status: 'generating',
            targetKeyword: question.text
              .toLowerCase()
              .replace(/[?!.,]/g, '')
              .split(' ')
              .slice(0, 5)
              .join(' '),
            metaTitle: question.text,
            metaDescription: `Learn the answer to: ${question.text} - Expert advice and practical tips.`,
            seoScore: 0,
            monthlyImpressions: 0,
            monthlyClicks: 0,
            monthlyTraffic: 0,
          },
        });

        qaPageIds.push(qaPage.id);
        this.queuedQuestionIds.add(questionId);

        // Enqueue BullMQ job for actual AI content generation
        try {
          await contentGenerationQueue.add(`qa-generate-${qaPage.id}`, {
            qaPageId: qaPage.id,
            organizationId,
            question: question.text,
            targetKeyword: qaPage.targetKeyword,
          });
          this.logger.log(
            `Enqueued content generation job for QAPage ${qaPage.id}`
          );
        } catch (queueError: any) {
          this.logger.warn(
            `Failed to enqueue generation job (Redis may be down): ${queueError.message}`
          );
        }

        this.logger.log(
          `Created QAPage ${qaPage.id} for question "${question.text}"`
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to create QAPage for question ${questionId}: ${error.message}`
        );
        // Continue processing other questions
      }
    }

    this.logger.log(`Successfully queued ${qaPageIds.length} questions`);

    return {
      queued: qaPageIds.length,
      qaPageIds,
    };
  }
}
