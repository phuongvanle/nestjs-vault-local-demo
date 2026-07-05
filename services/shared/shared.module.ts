import { DynamicModule, Module } from '@nestjs/common';
import { EntityTarget, ObjectLiteral } from 'typeorm';
import { MongoConnectionManager } from '../../libs/shared/mongo/mongo-connection.manager';
import { MongoDynamicCredentialProvider } from '../../libs/shared/mongo/mongo-dynamic-credential.provider';
import { MongoHealthIndicator } from '../../libs/shared/mongo/mongo-health.indicator';
import { MongoLeaseManager } from '../../libs/shared/mongo/mongo-lease.manager';
import { DatabaseConnectionManager, SERVICE_ENTITIES } from './database-connection.manager';
import { DynamicDbCredentialProvider } from './dynamic-db-credential.provider';
import { HealthController } from './health.controller';
import { HttpClientService } from './http-client.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { RabbitHealth, RedisHealth } from './redis-rabbit.health';
import { VaultClient } from './vault-client';

@Module({})
export class SharedModule {
  static register(entities: EntityTarget<ObjectLiteral>[]): DynamicModule {
    return {
      module: SharedModule,
      controllers: [HealthController, MetricsController],
      providers: [
        MetricsService,
        VaultClient,
        DynamicDbCredentialProvider,
        DatabaseConnectionManager,
        HttpClientService,
        MongoDynamicCredentialProvider,
        MongoLeaseManager,
        MongoConnectionManager,
        MongoHealthIndicator,
        RedisHealth,
        RabbitHealth,
        { provide: SERVICE_ENTITIES, useValue: entities as Function[] }
      ],
      exports: [DatabaseConnectionManager, HttpClientService, MetricsService, MongoConnectionManager]
    };
  }
}
