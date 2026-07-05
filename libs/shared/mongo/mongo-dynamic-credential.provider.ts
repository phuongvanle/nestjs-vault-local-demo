import { Injectable, Logger } from '@nestjs/common';
import { VaultClient } from '../../../services/shared/vault-client';

export interface MongoCredential {
  username: string;
  password: string;
  leaseId: string;
  leaseDuration: number;
  renewable: boolean;
  fetchedAt: Date;
}

@Injectable()
export class MongoDynamicCredentialProvider {
  private readonly logger = new Logger(MongoDynamicCredentialProvider.name);

  constructor(private readonly vault: VaultClient) {}

  async fetch(): Promise<MongoCredential> {
    const mount = process.env.MONGO_VAULT_DB_MOUNT ?? 'database';
    const role = this.requiredEnv('MONGO_VAULT_DB_ROLE');
    const lease = await this.vault.readLease<{ username: string; password: string }>(`${mount}/creds/${role}`);
    this.logger.log(`Fetched mongo credential version=${process.env.MONGO_VERSION} role=${role} leaseId=${lease.leaseId} ttl=${lease.leaseDuration}`);
    return {
      username: lease.data.username,
      password: lease.data.password,
      leaseId: lease.leaseId,
      leaseDuration: lease.leaseDuration,
      renewable: lease.renewable,
      fetchedAt: new Date()
    };
  }

  async renew(leaseId: string) {
    const renewed = await this.vault.renewLease(leaseId);
    this.logger.log(`Renewed mongo lease leaseId=${renewed.leaseId} ttl=${renewed.leaseDuration}`);
    return renewed;
  }

  revoke(leaseId: string) {
    this.logger.log(`Revoking mongo lease leaseId=${leaseId}`);
    return this.vault.revokeLease(leaseId);
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
  }
}

