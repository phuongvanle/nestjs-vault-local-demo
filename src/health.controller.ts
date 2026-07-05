import { Controller, Get } from '@nestjs/common';
import { DatabaseConnectionManager } from './database/database-connection.manager';
import { VaultClientService } from './vault/vault-client.service';
import { RabbitmqService } from './rabbitmq.service';
import { RedisService } from './redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly database: DatabaseConnectionManager,
    private readonly vault: VaultClientService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitmqService
  ) {}

  @Get('health')
  async health() {
    return this.readiness();
  }

  @Get('health/live')
  liveness() {
    return { app: 'up' };
  }

  @Get('health/startup')
  startup() {
    return {
      startup: this.database.isStartupComplete ? 'up' : 'down',
      initialSecretFetch: this.database.isStartupComplete
    };
  }

  @Get('health/ready')
  async readiness() {
    const lease = this.database.getLeaseSnapshot();
    return {
      app: 'up',
      vault: (await this.vault.isReachable()) ? 'up' : 'down',
      lease: lease.ttlSeconds > 0 ? 'up' : 'down',
      leaseRemainingSeconds: lease.ttlSeconds,
      postgres: await this.database.health(),
      redis: await this.redis.health(),
      rabbitmq: await this.rabbitmq.health()
    };
  }
}
