import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);
  private readonly client: AxiosInstance;

  constructor() {
    const address = this.requiredEnv('VAULT_ADDR');
    const token = this.requiredEnv('VAULT_TOKEN');

    this.client = axios.create({
      baseURL: `${address.replace(/\/$/, '')}/v1`,
      headers: {
        'X-Vault-Token': token
      },
      timeout: 5000
    });
  }

  async readSecret<T extends Record<string, unknown>>(path: string): Promise<T> {
    const normalizedPath = path.replace(/^\/+/, '');
    const response = await this.client.get(`/${normalizedPath}`);
    const secret = response.data?.data?.data;

    if (!secret || typeof secret !== 'object') {
      throw new Error(`Vault secret at ${path} is missing KV v2 data.data payload`);
    }

    this.logger.log(`Loaded Vault secret from ${path}`);
    return secret as T;
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is required`);
    }

    return value;
  }
}
