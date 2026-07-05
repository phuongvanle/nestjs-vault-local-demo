import { Injectable, Logger } from '@nestjs/common';
import { serviceConfig } from './config';
import { MetricsService } from './metrics.service';
import { VaultClient } from './vault-client';

export interface DbCredential {
  username: string;
  password: string;
  leaseId: string;
  leaseDuration: number;
  fetchedAt: Date;
}

@Injectable()
export class DynamicDbCredentialProvider {
  private readonly logger = new Logger(DynamicDbCredentialProvider.name);

  constructor(private readonly vault: VaultClient, private readonly metrics: MetricsService) {}

  async fetch(): Promise<DbCredential> {
    const cfg = serviceConfig();
    const lease = await this.vault.readLease<{ username: string; password: string }>(`${cfg.vaultDbMount}/creds/${cfg.vaultDbRole}`);
    this.metrics.vaultSecretFetchTotal.inc();
    this.logger.log(`Fetched db credential service=${cfg.serviceName} role=${cfg.vaultDbRole} leaseId=${lease.leaseId} ttl=${lease.leaseDuration}`);
    return { username: lease.data.username, password: lease.data.password, leaseId: lease.leaseId, leaseDuration: lease.leaseDuration, fetchedAt: new Date() };
  }

  async renew(leaseId: string) {
    const renewed = await this.vault.renewLease(leaseId);
    this.metrics.vaultLeaseRenewTotal.inc();
    this.logger.log(`Renewed db lease service=${serviceConfig().serviceName} leaseId=${renewed.leaseId} ttl=${renewed.leaseDuration}`);
    return renewed;
  }

  revoke(leaseId: string) {
    this.logger.log(`Revoking db lease service=${serviceConfig().serviceName} leaseId=${leaseId}`);
    return this.vault.revokeLease(leaseId);
  }
}

