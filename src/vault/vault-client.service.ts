import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { backoffDelay, retryPolicyFromEnv } from './retry-policy';
import { CircuitBreaker } from './circuit-breaker';
import { TokenVaultAuthProvider, VaultAuthProvider } from './vault-auth.provider';
import { MetricsService } from '../metrics/metrics.service';

export interface VaultLease<T> {
  data: T;
  leaseId: string;
  leaseDuration: number;
  renewable: boolean;
}

@Injectable()
export class VaultClientService {
  private readonly logger = new Logger(VaultClientService.name);
  private readonly client: AxiosInstance;
  private readonly breaker = new CircuitBreaker();
  private readonly policy = retryPolicyFromEnv();
  private readonly authProvider: VaultAuthProvider = new TokenVaultAuthProvider();

  constructor(private readonly metrics: MetricsService) {
    const address = this.requiredEnv('VAULT_ADDR');
    this.client = axios.create({
      baseURL: `${address.replace(/\/$/, '')}/v1`,
      timeout: this.policy.timeoutMs
    });
  }

  async readLease<T extends Record<string, unknown>>(path: string): Promise<VaultLease<T>> {
    const response = await this.request('GET', path, undefined, 'fetch secret');
    return {
      data: response.data.data as T,
      leaseId: response.data.lease_id,
      leaseDuration: Number(response.data.lease_duration),
      renewable: Boolean(response.data.renewable)
    };
  }

  async readKv<T extends Record<string, unknown>>(path: string): Promise<T> {
    const response = await this.request('GET', path, undefined, 'fetch secret');
    const data = response.data?.data?.data;
    if (!data || typeof data !== 'object') {
      throw new Error(`Vault secret at ${path} is missing KV v2 data.data payload`);
    }

    return data as T;
  }

  async renewLease(leaseId: string, incrementSeconds?: number): Promise<VaultLease<Record<string, never>>> {
    const response = await this.request(
      'POST',
      'sys/leases/renew',
      { lease_id: leaseId, increment: incrementSeconds ? `${incrementSeconds}s` : undefined },
      'renew lease'
    );
    return {
      data: {},
      leaseId: response.data.lease_id,
      leaseDuration: Number(response.data.lease_duration),
      renewable: Boolean(response.data.renewable)
    };
  }

  async revokeLease(leaseId: string): Promise<void> {
    await this.request('POST', 'sys/leases/revoke', { lease_id: leaseId }, 'revoke lease');
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.request('GET', 'sys/health', undefined, 'health');
      return true;
    } catch {
      return false;
    }
  }

  private async request(method: string, path: string, data: unknown, operation: string) {
    let lastError: unknown;
    const normalizedPath = path.replace(/^\/+/, '');

    for (let attempt = 0; attempt <= this.policy.retries; attempt += 1) {
      try {
        this.breaker.assertCanCall();
        const token = await this.authProvider.getToken();
        const started = Date.now();
        this.metrics.vaultRequestTotal.inc({ operation });
        const config: AxiosRequestConfig = {
          method,
          url: `/${normalizedPath}`,
          data,
          headers: { 'X-Vault-Token': token }
        };
        const response = await this.client.request(config);
        this.metrics.vaultRequestDuration.observe({ operation }, (Date.now() - started) / 1000);
        if (operation === 'fetch secret') {
          this.metrics.vaultSecretFetchLatency.set((Date.now() - started) / 1000);
        }
        this.breaker.recordSuccess();
        this.logger.debug(`Vault ${operation} ok path=${normalizedPath} durationMs=${Date.now() - started}`);
        return response;
      } catch (error) {
        lastError = error;
        this.metrics.vaultRequestErrorTotal.inc({ operation });
        if (this.isNonRetryableVaultError(error)) {
          throw error;
        }
        this.breaker.recordFailure();
        if (attempt >= this.policy.retries) {
          break;
        }
        await this.sleep(backoffDelay(this.policy, attempt));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Vault ${operation} failed`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isNonRetryableVaultError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    const status = error.response?.status;
    return status !== undefined && status >= 400 && status < 500 && status !== 429;
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is required`);
    }

    return value;
  }
}
