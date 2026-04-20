/**
 * Images Controller
 *
 * Manages AI-generated images for organizations:
 *  - POST   /api/images/generate   — generate a new image (defaults to DRAFT)
 *  - GET    /api/images            — list images (filterable by status)
 *  - POST   /api/images/:id/save   — promote a DRAFT to SAVED (library)
 *  - DELETE /api/images/:id        — delete an image (not PUBLISHED unless ?force=true)
 *  - POST   /api/images/cleanup    — manually trigger draft cleanup (testing)
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ImageStatus } from '@prisma/client';
import {
  getImageStorageService,
  GenerateImageInput,
} from '../services/image-storage-service';

@Controller('images')
export class ImagesController {
  private readonly logger = new Logger(ImagesController.name);

  /**
   * POST /api/images/generate
   * Body: { organizationId, prompt, style?, aspectRatio?, qaPageId?, productId? }
   */
  @Post('generate')
  async generateImage(
    @Body()
    body: {
      organizationId: string;
      prompt: string;
      style?: string;
      aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
      qaPageId?: string;
      productId?: string;
    },
  ) {
    if (!body?.organizationId || !body?.prompt) {
      throw new HttpException(
        'organizationId and prompt are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const service = getImageStorageService();

    const input: GenerateImageInput = {
      organizationId: body.organizationId,
      prompt: body.prompt,
      options: {
        style: body.style,
        aspectRatio: body.aspectRatio,
      },
      qaPageId: body.qaPageId,
      productId: body.productId,
    };

    try {
      const stored = await service.generateAndStore(input);
      return stored;
    } catch (error: any) {
      this.logger.error(`Image generation failed: ${error.message}`);
      throw new HttpException(
        `Image generation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async listImages(
    @Query('organizationId') organizationId: string,
    @Query('status') status?: string,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId query param is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const statusFilter =
      status === 'DRAFT' || status === 'SAVED' || status === 'PUBLISHED'
        ? (status as ImageStatus)
        : undefined;

    const service = getImageStorageService();
    const images = await service.listImages(organizationId, statusFilter);

    return {
      images: images.map((img) => ({
        id: img.id,
        url: `/uploads/${img.filename}`,
        prompt: img.prompt,
        model: img.model,
        status: img.status,
        sizeBytes: img.sizeBytes,
        aspectRatio: img.aspectRatio,
        createdAt: img.createdAt.toISOString(),
        savedAt: img.savedAt?.toISOString() || null,
        usedByPageId: img.usedByPageId,
      })),
      total: images.length,
    };
  }

  @Post(':id/save')
  async saveImage(@Param('id') id: string) {
    const service = getImageStorageService();
    const updated = await service.saveToLibrary(id);
    return {
      id: updated.id,
      status: updated.status,
      savedAt: updated.savedAt?.toISOString() || null,
    };
  }

  @Delete(':id')
  async deleteImage(
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    const service = getImageStorageService();
    const deleted = await service.deleteImage(id, force === 'true');
    if (!deleted) {
      throw new HttpException(
        'Image not deleted. Use ?force=true to delete published images.',
        HttpStatus.CONFLICT,
      );
    }
    return { success: true, id };
  }

  @Post('cleanup')
  async triggerCleanup(@Query('days') days?: string) {
    const service = getImageStorageService();
    const olderThanDays = parseInt(days || '7', 10);
    const deleted = await service.cleanupOldDrafts(olderThanDays);
    return { success: true, deleted, olderThanDays };
  }
}
