/**
 * Webhook Controller
 *
 * Handles incoming Shopify webhooks
 *
 * CRITICAL:
 * - MUST respond within 5 seconds
 * - MUST validate HMAC signature
 * - MUST preserve raw body for HMAC validation
 * - SHOULD process asynchronously via queue
 */

import { Controller, Post, Headers, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookHandlerService } from '../services/webhook-handler-service';

@Controller('webhooks')
export class WebhookController {
  private readonly webhookHandler: WebhookHandlerService;

  constructor() {
    // TODO: Inject via NestJS DI when application is set up
    const shopifyApiSecret = process.env.SHOPIFY_API_SECRET || '';
    this.webhookHandler = new WebhookHandlerService(shopifyApiSecret);
  }

  /**
   * Shopify Product Create Webhook
   */
  @Post('shopify/products/create')
  @HttpCode(HttpStatus.OK)
  async handleProductCreate(
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-topic') topic: string,
    @Body() payload: any,
    @Body('__raw') rawBody: string // Need custom middleware to preserve raw body
  ) {
    const result = await this.webhookHandler.processWebhook(
      topic || 'PRODUCTS_CREATE',
      shop,
      payload,
      hmac,
      rawBody
    );

    if (!result.success) {
      return {
        error: result.error,
        received: false,
      };
    }

    return {
      received: true,
      webhookId: result.webhookId,
    };
  }

  /**
   * Shopify Product Update Webhook
   */
  @Post('shopify/products/update')
  @HttpCode(HttpStatus.OK)
  async handleProductUpdate(
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-topic') topic: string,
    @Body() payload: any,
    @Body('__raw') rawBody: string
  ) {
    const result = await this.webhookHandler.processWebhook(
      topic || 'PRODUCTS_UPDATE',
      shop,
      payload,
      hmac,
      rawBody
    );

    if (!result.success) {
      return {
        error: result.error,
        received: false,
      };
    }

    return {
      received: true,
      webhookId: result.webhookId,
    };
  }

  /**
   * Shopify Product Delete Webhook
   */
  @Post('shopify/products/delete')
  @HttpCode(HttpStatus.OK)
  async handleProductDelete(
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-topic') topic: string,
    @Body() payload: any,
    @Body('__raw') rawBody: string
  ) {
    const result = await this.webhookHandler.processWebhook(
      topic || 'PRODUCTS_DELETE',
      shop,
      payload,
      hmac,
      rawBody
    );

    if (!result.success) {
      return {
        error: result.error,
        received: false,
      };
    }

    return {
      received: true,
      webhookId: result.webhookId,
    };
  }

  /**
   * Shopify App Uninstalled Webhook
   */
  @Post('shopify/app/uninstalled')
  @HttpCode(HttpStatus.OK)
  async handleAppUninstalled(
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-topic') topic: string,
    @Body() payload: any,
    @Body('__raw') rawBody: string
  ) {
    const result = await this.webhookHandler.processWebhook(
      topic || 'APP_UNINSTALLED',
      shop,
      payload,
      hmac,
      rawBody
    );

    if (!result.success) {
      return {
        error: result.error,
        received: false,
      };
    }

    return {
      received: true,
      webhookId: result.webhookId,
    };
  }

  /**
   * Generic webhook endpoint (handles all topics)
   */
  @Post('shopify')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Headers('x-shopify-shop-domain') shop: string,
    @Headers('x-shopify-topic') topic: string,
    @Body() payload: any,
    @Body('__raw') rawBody: string
  ) {
    const result = await this.webhookHandler.processWebhook(
      topic,
      shop,
      payload,
      hmac,
      rawBody
    );

    if (!result.success) {
      return {
        error: result.error,
        received: false,
      };
    }

    return {
      received: true,
      webhookId: result.webhookId,
    };
  }
}
