/**
 * Image Storage Service
 *
 * Coordinates image generation + persistence. Uses GeminiService to create
 * images, writes bytes to the Railway volume mounted at /app/uploads, and
 * tracks metadata in the GeneratedImage table with the DRAFT/SAVED/PUBLISHED
 * lifecycle.
 *
 *  - DRAFT:     Just generated. Auto-deleted after 7 days by image-cleanup-job
 *               if never saved or published.
 *  - SAVED:     User clicked "keep in library". Never auto-deleted.
 *  - PUBLISHED: Attached to a QA page or product. Protected from deletion
 *               while in use.
 *
 * Served via Express static middleware at /uploads/<filename>.
 */

import { PrismaClient, GeneratedImage, ImageStatus } from '@prisma/client';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import { GeminiService, ImageGenOptions } from './gemini-service';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';
const PUBLIC_URL_PREFIX = '/uploads';

export interface GenerateImageInput {
  organizationId: string;
  prompt: string;
  options?: ImageGenOptions;
  /** If provided, new image starts in PUBLISHED status and links to this QAPage */
  qaPageId?: string;
  /** If provided, new image starts in PUBLISHED status and links to this product */
  productId?: string;
}

export interface StoredImage {
  id: string;
  url: string;
  filename: string;
  status: ImageStatus;
  prompt: string;
  sizeBytes: number;
}

export class ImageStorageService {
  private readonly logger = new Logger(ImageStorageService.name);
  private readonly prisma: PrismaClient;
  private readonly gemini: GeminiService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.gemini = new GeminiService();
  }

  /**
   * Generate an image with Gemini, persist it to disk + DB, return URL.
   *
   * If qaPageId or productId is provided, the image is created in PUBLISHED
   * status (in-use). Otherwise it's a DRAFT that expires in 7 days.
   */
  async generateAndStore(input: GenerateImageInput): Promise<StoredImage> {
    await this.ensureUploadDir();

    const generated = await this.gemini.generateImage(input.prompt, input.options);

    const ext = this.mimeToExt(generated.mimeType);
    const filename = `${randomUUID()}${ext}`;
    const fullPath = join(UPLOAD_DIR, filename);

    await fs.writeFile(fullPath, generated.imageBytes);

    const status: ImageStatus =
      input.qaPageId || input.productId ? 'PUBLISHED' : 'DRAFT';

    const record = await this.prisma.generatedImage.create({
      data: {
        organizationId: input.organizationId,
        prompt: generated.prompt,
        model: generated.model,
        filename,
        mimeType: generated.mimeType,
        sizeBytes: generated.imageBytes.length,
        aspectRatio: input.options?.aspectRatio || null,
        status,
        usedByPageId: input.qaPageId || null,
        usedByProductId: input.productId || null,
      },
    });

    this.logger.log(
      `Generated image ${record.id} (${(generated.imageBytes.length / 1024).toFixed(1)}KB, status=${status})`,
    );

    return {
      id: record.id,
      url: `${PUBLIC_URL_PREFIX}/${filename}`,
      filename,
      status: record.status,
      prompt: record.prompt,
      sizeBytes: record.sizeBytes,
    };
  }

  /**
   * Save a DRAFT image to the permanent library.
   */
  async saveToLibrary(imageId: string): Promise<GeneratedImage> {
    return this.prisma.generatedImage.update({
      where: { id: imageId },
      data: { status: 'SAVED', savedAt: new Date() },
    });
  }

  /**
   * Attach an image to a QA page — marks it as PUBLISHED (protected from cleanup).
   */
  async attachToQAPage(imageId: string, qaPageId: string): Promise<void> {
    await this.prisma.generatedImage.update({
      where: { id: imageId },
      data: { status: 'PUBLISHED', usedByPageId: qaPageId },
    });
  }

  /**
   * Delete an image (DB row + file on disk). Returns true if deleted.
   * Guards against deleting PUBLISHED images in use.
   */
  async deleteImage(imageId: string, force: boolean = false): Promise<boolean> {
    const image = await this.prisma.generatedImage.findUnique({
      where: { id: imageId },
    });
    if (!image) return false;

    if (image.status === 'PUBLISHED' && !force) {
      this.logger.warn(
        `Refusing to delete published image ${imageId} without force flag`,
      );
      return false;
    }

    // Delete file
    try {
      await fs.unlink(join(UPLOAD_DIR, image.filename));
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        this.logger.warn(
          `Failed to delete file ${image.filename}: ${err.message}`,
        );
      }
    }

    await this.prisma.generatedImage.delete({ where: { id: imageId } });
    return true;
  }

  /**
   * Delete DRAFT images older than N days. Called by image-cleanup-job cron.
   */
  async cleanupOldDrafts(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000);
    const drafts = await this.prisma.generatedImage.findMany({
      where: { status: 'DRAFT', createdAt: { lt: cutoff } },
    });

    let deleted = 0;
    for (const draft of drafts) {
      try {
        const ok = await this.deleteImage(draft.id);
        if (ok) deleted++;
      } catch (err: any) {
        this.logger.error(`Cleanup failed for ${draft.id}: ${err.message}`);
      }
    }

    this.logger.log(
      `Cleaned up ${deleted} of ${drafts.length} DRAFT images older than ${olderThanDays} days`,
    );
    return deleted;
  }

  /**
   * List images for an org, optionally filtered by status.
   */
  async listImages(
    organizationId: string,
    status?: ImageStatus,
  ): Promise<GeneratedImage[]> {
    return this.prisma.generatedImage.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err: any) {
      // Directory already exists, or we don't have write access — fail loudly
      if (err.code !== 'EEXIST') {
        throw new Error(
          `Cannot create upload dir ${UPLOAD_DIR}: ${err.message}`,
        );
      }
    }
  }

  private mimeToExt(mime: string): string {
    switch (mime) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '.bin';
    }
  }
}

let instance: ImageStorageService | null = null;

export function getImageStorageService(): ImageStorageService {
  if (!instance) instance = new ImageStorageService();
  return instance;
}

export { UPLOAD_DIR, PUBLIC_URL_PREFIX };
