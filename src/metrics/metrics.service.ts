import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly vaultRequestTotal: Counter<string>;
  readonly vaultRequestDuration: Histogram<string>;
  readonly vaultRequestErrorTotal: Counter<string>;
  readonly vaultLeaseRenewTotal: Counter<string>;
  readonly vaultLeaseRenewFailureTotal: Counter<string>;
  readonly vaultSecretRotationTotal: Counter<string>;
  readonly dbConnectionActive: Gauge<string>;
  readonly dbConnectionIdle: Gauge<string>;
  readonly dbConnectionRotationTotal: Counter<string>;
  readonly vaultAuthLatency: Gauge<string>;
  readonly vaultSecretFetchLatency: Gauge<string>;
  readonly credentialAgeSeconds: Gauge<string>;
  readonly leaseRemainingSeconds: Gauge<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.vaultRequestTotal = new Counter({ name: 'vault_request_total', help: 'Vault requests', labelNames: ['operation'], registers: [this.registry] });
    this.vaultRequestDuration = new Histogram({ name: 'vault_request_duration', help: 'Vault request duration seconds', labelNames: ['operation'], registers: [this.registry] });
    this.vaultRequestErrorTotal = new Counter({ name: 'vault_request_error_total', help: 'Vault request errors', labelNames: ['operation'], registers: [this.registry] });
    this.vaultLeaseRenewTotal = new Counter({ name: 'vault_lease_renew_total', help: 'Vault lease renewals', registers: [this.registry] });
    this.vaultLeaseRenewFailureTotal = new Counter({ name: 'vault_lease_renew_failure_total', help: 'Vault lease renewal failures', registers: [this.registry] });
    this.vaultSecretRotationTotal = new Counter({ name: 'vault_secret_rotation_total', help: 'Vault secret rotations', labelNames: ['reason'], registers: [this.registry] });
    this.dbConnectionActive = new Gauge({ name: 'db_connection_active', help: 'Active database connection pool count', registers: [this.registry] });
    this.dbConnectionIdle = new Gauge({ name: 'db_connection_idle', help: 'Idle database connection pool count', registers: [this.registry] });
    this.dbConnectionRotationTotal = new Counter({ name: 'db_connection_rotation_total', help: 'Database connection rotations', labelNames: ['reason'], registers: [this.registry] });
    this.vaultAuthLatency = new Gauge({ name: 'vault_auth_latency', help: 'Vault auth latency seconds', registers: [this.registry] });
    this.vaultSecretFetchLatency = new Gauge({ name: 'vault_secret_fetch_latency', help: 'Vault secret fetch latency seconds', registers: [this.registry] });
    this.credentialAgeSeconds = new Gauge({ name: 'credential_age_seconds', help: 'Current database credential age seconds', registers: [this.registry] });
    this.leaseRemainingSeconds = new Gauge({ name: 'lease_remaining_seconds', help: 'Current database lease remaining seconds', registers: [this.registry] });
  }
}

