import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { VaultModule } from '../vault/vault.module';
import { DatabaseConnectionManager } from './database-connection.manager';
import { VaultDatabaseCredentialProvider } from './vault-database-credential.provider';

@Global()
@Module({
  imports: [ConfigModule, VaultModule],
  providers: [VaultDatabaseCredentialProvider, DatabaseConnectionManager],
  exports: [DatabaseConnectionManager, VaultDatabaseCredentialProvider]
})
export class DatabaseModule {}

