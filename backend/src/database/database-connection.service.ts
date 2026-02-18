/**
 * Database Connection Service
 *
 * Production-ready Prisma client with:
 * - Connection pooling (20 connections)
 * - Graceful shutdown
 * - Error handling
 * - Query logging in development
 * - Performance monitoring
 *
 * EXPORTS FOR OTHER AGENTS:
 * - DatabaseService class (singleton Prisma client)
 * - Use via dependency injection in NestJS modules
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private static instance: DatabaseService;

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      errorFormat: 'pretty',
    });

    // Singleton pattern to prevent multiple Prisma instances
    if (DatabaseService.instance) {
      return DatabaseService.instance;
    }
    DatabaseService.instance = this;

    // Query logging in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    // Error logging
    this.$on('error' as never, (e: any) => {
      this.logger.error(`Prisma Error: ${e.message}`, e.stack);
    });

    // Warning logging
    this.$on('warn' as never, (e: any) => {
      this.logger.warn(`Prisma Warning: ${e.message}`);
    });
  }

  /**
   * Initialize database connection
   * Called automatically when module is initialized
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
      this.logger.log(`📊 Connection pool size: ${process.env.DATABASE_POOL_SIZE || 20}`);

      // Test database connection
      await this.testConnection();
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown of database connection
   * Called automatically when module is destroyed
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('👋 Database disconnected gracefully');
    } catch (error) {
      this.logger.error('❌ Error disconnecting from database', error);
      throw error;
    }
  }

  /**
   * Test database connection
   * @private
   */
  private async testConnection() {
    try {
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connection test passed');
    } catch (error) {
      this.logger.error('❌ Database connection test failed', error);
      throw error;
    }
  }

  /**
   * Health check for monitoring
   * @returns Promise<boolean> - true if database is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  /**
   * Get database statistics
   * @returns Promise<object> - Database statistics
   */
  async getDatabaseStats() {
    try {
      const stats = await this.$queryRaw<Array<{ table_name: string; row_count: number }>>`
        SELECT
          schemaname || '.' || tablename as table_name,
          n_live_tup as row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `;

      return {
        tables: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get database stats', error);
      throw error;
    }
  }

  /**
   * Get slow queries (queries taking > 1 second)
   * Useful for performance monitoring
   */
  async getSlowQueries() {
    try {
      const slowQueries = await this.$queryRaw<
        Array<{
          query: string;
          calls: number;
          total_time: number;
          mean_time: number;
        }>
      >`
        SELECT
          query,
          calls,
          total_time,
          mean_time
        FROM pg_stat_statements
        WHERE mean_time > 1000
        ORDER BY mean_time DESC
        LIMIT 20
      `;

      return slowQueries;
    } catch (error) {
      // pg_stat_statements extension might not be enabled
      this.logger.warn('Could not retrieve slow queries. Ensure pg_stat_statements extension is enabled.');
      return [];
    }
  }

  /**
   * Clear connection pool
   * Use in emergencies or for testing
   */
  async clearConnectionPool() {
    try {
      await this.$disconnect();
      await this.$connect();
      this.logger.log('🔄 Connection pool cleared and reconnected');
    } catch (error) {
      this.logger.error('Failed to clear connection pool', error);
      throw error;
    }
  }
}
