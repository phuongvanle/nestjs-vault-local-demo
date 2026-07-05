import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { ItemsModule } from './items/items.module';
import { MetricsModule } from './metrics/metrics.module';
import { RabbitmqService } from './rabbitmq.service';
import { RedisService } from './redis.service';

@Module({
  imports: [
    ConfigModule,
    MetricsModule,
    DatabaseModule,
    ItemsModule
  ],
  controllers: [HealthController],
  providers: [RedisService, RabbitmqService]
})
export class AppModule {}
