import { Global, Module } from '@nestjs/common';
import { MongoConnectionManager } from './mongo-connection.manager';
import { MongoDynamicCredentialProvider } from './mongo-dynamic-credential.provider';
import { MongoHealthIndicator } from './mongo-health.indicator';
import { MongoLeaseManager } from './mongo-lease.manager';

@Global()
@Module({
  providers: [MongoDynamicCredentialProvider, MongoLeaseManager, MongoConnectionManager, MongoHealthIndicator],
  exports: [MongoConnectionManager, MongoHealthIndicator]
})
export class MongoDynamicModule {}

