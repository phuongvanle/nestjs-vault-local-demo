import { Global, Module } from '@nestjs/common';
import { VaultClientService } from './vault-client.service';

@Global()
@Module({
  providers: [VaultClientService],
  exports: [VaultClientService]
})
export class VaultModule {}

