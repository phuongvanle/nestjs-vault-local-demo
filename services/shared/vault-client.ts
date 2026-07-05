import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { serviceConfig } from './config';
import { backoff, CircuitBreaker, sleep } from './retry';
import { TokenVaultAuthProvider, VaultAuthProvider } from './vault-auth.provider';

export interface VaultLease<T> {
  data: T;
  leaseId: string;
  leaseDuration: number;
  renewable: boolean;
}

@Injectable()
export class VaultClient {
  private readonly logger = new Logger(VaultClient.name);
  private readonly client: AxiosInstance;
  private readonly breaker = new CircuitBreaker();
  private readonly auth: VaultAuthProvider = new TokenVaultAuthProvider();

  constructor() {
    this.client = axios.create({ baseURL: `${serviceConfig().vaultAddr.replace(/\/$/, '')}/v1`, timeout: Number(process.env.VAULT_TIMEOUT_MS ?? 5000) });
  }

  readLease<T extends Record<string, unknown>>(path: string): Promise<VaultLease<T>> {
    return this.request('GET', path).then((response) => ({
      data: response.data.data as T,
      leaseId: response.data.lease_id,
      leaseDuration: Number(response.data.lease_duration),
      renewable: Boolean(response.data.renewable)
    }));
  }

  async readKv<T extends Record<string, unknown>>(path: string): Promise<T> {
    const response = await this.request('GET', path);
    return response.data.data.data as T;
  }

  async renewLease(leaseId: string): Promise<VaultLease<Record<string, never>>> {
    const response = await this.request('POST', 'sys/leases/renew', { lease_id: leaseId, increment: `${Number(process.env.VAULT_DB_LEASE_RENEW_INCREMENT_SECONDS ?? 60)}s` });
    return { data: {}, leaseId: response.data.lease_id, leaseDuration: Number(response.data.lease_duration), renewable: Boolean(response.data.renewable) };
  }

  async revokeLease(leaseId: string): Promise<void> {
    await this.request('POST', 'sys/leases/revoke', { lease_id: leaseId });
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.request('GET', 'sys/health');
      return true;
    } catch {
      return false;
    }
  }

  private async request(method: string, path: string, data?: unknown) {
    const retries = Number(process.env.VAULT_RETRY_LIMIT ?? 5);
    const normalized = path.replace(/^\/+/, '');
    let last: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        if (!this.breaker.canCall()) throw new Error('Vault circuit breaker is open');
        const config: AxiosRequestConfig = { method, url: `/${normalized}`, data, headers: { 'X-Vault-Token': await this.auth.getToken() } };
        const response = await this.client.request(config);
        this.breaker.success();
        return response;
      } catch (error) {
        last = error;
        if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) throw error;
        this.breaker.failure();
        if (attempt < retries) await sleep(backoff(attempt));
      }
    }
    this.logger.warn(`Vault request failed path=${normalized}`);
    throw last instanceof Error ? last : new Error('Vault request failed');
  }
}

