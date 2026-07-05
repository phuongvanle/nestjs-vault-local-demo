import { Controller, Get } from '@nestjs/common';
import { DatabaseConnectionManager } from './database-connection.manager';
import { serviceConfig } from './config';
import { RabbitHealth, RedisHealth } from './redis-rabbit.health';
import { VaultClient } from './vault-client';
import { MongoHealthIndicator } from '../../libs/shared/mongo/mongo-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseConnectionManager,
    private readonly vault: VaultClient,
    private readonly redis: RedisHealth,
    private readonly rabbit: RabbitHealth,
    private readonly mongo: MongoHealthIndicator
  ) {}

  @Get('live')
  live() { return { service: serviceConfig().serviceName, app: 'up' }; }

  @Get('startup')
  startup() { return { service: serviceConfig().serviceName, startup: this.db.startupReady ? 'up' : 'down' }; }

  @Get('ready')
  async ready() {
    return {
      service: serviceConfig().serviceName,
      vault: (await this.vault.isReachable()) ? 'up' : 'down',
      lease: this.db.leaseRemainingSeconds > 0 ? 'up' : 'down',
      leaseRemainingSeconds: this.db.leaseRemainingSeconds,
      postgres: await this.db.health(),
      mongo: this.mongo.details(),
      redis: await this.redis.health(),
      rabbitmq: await this.rabbit.health()
    };
  }
}
