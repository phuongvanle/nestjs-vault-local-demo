import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { VaultService } from './vault.service';

@Global()
@Module({
  providers: [VaultService, AppConfigService],
  exports: [AppConfigService]
})
export class ConfigModule {}

