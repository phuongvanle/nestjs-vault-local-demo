import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly vaultSecretFetchTotal = new Counter({ name: 'vault_secret_fetch_total', help: 'Vault dynamic secret fetches', registers: [this.registry] });
  readonly vaultLeaseRenewTotal = new Counter({ name: 'vault_lease_renew_total', help: 'Vault lease renewals', registers: [this.registry] });
  readonly vaultLeaseRenewFailureTotal = new Counter({ name: 'vault_lease_renew_failure_total', help: 'Vault lease renewal failures', registers: [this.registry] });
  readonly vaultSecretRotationTotal = new Counter({ name: 'vault_secret_rotation_total', help: 'Vault secret rotations', labelNames: ['reason'], registers: [this.registry] });
  readonly dbConnectionRotationTotal = new Counter({ name: 'db_connection_rotation_total', help: 'Database connection rotations', labelNames: ['reason'], registers: [this.registry] });
  readonly dbConnectionActive = new Gauge({ name: 'db_connection_active', help: 'Active database connection pools', registers: [this.registry] });
  readonly serviceHttpRequestTotal = new Counter({ name: 'service_http_request_total', help: 'HTTP requests', labelNames: ['method', 'path', 'status'], registers: [this.registry] });
  readonly serviceHttpRequestDuration = new Histogram({ name: 'service_http_request_duration', help: 'HTTP request duration seconds', labelNames: ['method', 'path'], registers: [this.registry] });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }
}

