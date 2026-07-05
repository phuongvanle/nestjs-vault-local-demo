import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from './config/app-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    const redis = await this.config.getRedisConfig();
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });

    await this.client.connect();
    this.logger.log(`Connected to Redis at ${redis.host}:${redis.port}`);
  }

  async onModuleDestroy(): Promise<void> {
    this.client?.disconnect();
  }

  async health(): Promise<'up' | 'down'> {
    if (!this.client) {
      return 'down';
    }

    try {
      const response = await this.client.ping();
      return response === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}

