import { Injectable, Logger } from '@nestjs/common';
import { CredentialProvider } from './credential-provider.interface';
import { DatabaseCredential } from './database.types';
import { VaultClientService } from '../vault/vault-client.service';

@Injectable()
export class VaultDatabaseCredentialProvider implements CredentialProvider {
  private readonly logger = new Logger(VaultDatabaseCredentialProvider.name);

  constructor(private readonly vault: VaultClientService) {}

  async fetchDatabaseCredential(): Promise<DatabaseCredential> {
    const path = this.requiredEnv('VAULT_DATABASE_CREDENTIALS_PATH');
    const lease = await this.vault.readLease<{ username: string; password: string }>(path);

    this.logger.log(`Fetched database credential leaseId=${lease.leaseId} ttl=${lease.leaseDuration} path=${path}`);
    return {
      username: lease.data.username,
      password: lease.data.password,
      leaseId: lease.leaseId,
      leaseDuration: lease.leaseDuration,
      renewable: lease.renewable,
      fetchedAt: new Date()
    };
  }

  async renew(leaseId: string): Promise<Pick<DatabaseCredential, 'leaseId' | 'leaseDuration' | 'renewable'>> {
    const renewed = await this.vault.renewLease(leaseId, Number(process.env.VAULT_DB_LEASE_RENEW_INCREMENT_SECONDS ?? 60));
    this.logger.log(`Renewed database leaseId=${renewed.leaseId} ttl=${renewed.leaseDuration}`);
    return {
      leaseId: renewed.leaseId,
      leaseDuration: renewed.leaseDuration,
      renewable: renewed.renewable
    };
  }

  async revoke(leaseId: string): Promise<void> {
    await this.vault.revokeLease(leaseId);
    this.logger.log(`Revoked database leaseId=${leaseId}`);
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is required`);
    }

    return value;
  }
}

