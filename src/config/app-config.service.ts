import { Injectable, Logger } from '@nestjs/common';
import { VaultService } from './vault.service';

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
}

export interface RabbitmqConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  vhost: string;
}

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private postgres?: PostgresConfig;
  private redis?: RedisConfig;
  private rabbitmq?: RabbitmqConfig;

  constructor(private readonly vault: VaultService) {}

  async getDatabaseStaticConfig(): Promise<PostgresConfig> {
    if (!this.postgres) {
      this.postgres = this.normalizePostgres(
        await this.vault.readSecret<Record<string, unknown>>(this.requiredEnv('VAULT_POSTGRES_STATIC_PATH'))
      );
      this.logger.log(`Postgres static config loaded from Vault for ${this.postgres.host}:${this.postgres.port}/${this.postgres.database}`);
    }

    return this.postgres;
  }

  async getRedisConfig(): Promise<RedisConfig> {
    if (!this.redis) {
      this.redis = this.normalizeRedis(
        await this.vault.readSecret<Record<string, unknown>>(this.requiredEnv('VAULT_REDIS_PATH'))
      );
      this.logger.log(`Redis secret loaded from Vault for ${this.redis.host}:${this.redis.port}`);
    }

    return this.redis;
  }

  async getRabbitmqConfig(): Promise<RabbitmqConfig> {
    if (!this.rabbitmq) {
      this.rabbitmq = this.normalizeRabbitmq(
        await this.vault.readSecret<Record<string, unknown>>(this.requiredEnv('VAULT_RABBITMQ_PATH'))
      );
      this.logger.log(`RabbitMQ secret loaded from Vault for ${this.rabbitmq.host}:${this.rabbitmq.port}${this.rabbitmq.vhost}`);
    }

    return this.rabbitmq;
  }

  private normalizePostgres(secret: Record<string, unknown>): PostgresConfig {
    return {
      host: this.requiredSecret(secret, 'host'),
      port: this.toPort(secret.port, 'postgres.port'),
      database: this.requiredSecret(secret, 'database')
    };
  }

  private normalizeRedis(secret: Record<string, unknown>): RedisConfig {
    return {
      host: this.requiredSecret(secret, 'host'),
      port: this.toPort(secret.port, 'redis.port'),
      password: this.requiredSecret(secret, 'password')
    };
  }

  private normalizeRabbitmq(secret: Record<string, unknown>): RabbitmqConfig {
    return {
      host: this.requiredSecret(secret, 'host'),
      port: this.toPort(secret.port, 'rabbitmq.port'),
      username: this.requiredSecret(secret, 'username'),
      password: this.requiredSecret(secret, 'password'),
      vhost: this.requiredSecret(secret, 'vhost')
    };
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`${name} is required`);
    }

    return value;
  }

  private requiredSecret(secret: Record<string, unknown>, key: string): string {
    const value = secret[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`Vault secret field ${key} is required`);
    }

    return value;
  }

  private toPort(value: unknown, name: string): number {
    const port = Number(value);
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error(`${name} must be a valid TCP port`);
    }

    return port;
  }
}
