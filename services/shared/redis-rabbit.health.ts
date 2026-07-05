import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ChannelModel, connect } from 'amqplib';
import { serviceConfig } from './config';
import { VaultClient } from './vault-client';

@Injectable()
export class RedisHealth implements OnModuleInit, OnModuleDestroy {
  private client?: Redis;
  constructor(private readonly vault: VaultClient) {}
  async onModuleInit() {
    await this.ensureConnected().catch(() => undefined);
  }
  onModuleDestroy() { this.client?.disconnect(); }
  async health(): Promise<'up' | 'down'> {
    try {
      await this.ensureConnected();
      return (await this.client?.ping()) === 'PONG' ? 'up' : 'down';
    } catch { return 'down'; }
  }
  private async ensureConnected() {
    if (this.client?.status === 'ready') return;
    const cfg = serviceConfig();
    const secret = await this.vault.readKv<{ host: string; port: string; password: string }>(cfg.redisSecretPath);
    this.client = new Redis({ host: secret.host, port: Number(secret.port), password: secret.password, lazyConnect: true, maxRetriesPerRequest: 1 });
    await this.client.connect();
  }
}

@Injectable()
export class RabbitHealth implements OnModuleInit, OnModuleDestroy {
  private conn?: ChannelModel;
  constructor(private readonly vault: VaultClient) {}
  async onModuleInit() {
    await this.ensureConnected().catch(() => undefined);
  }
  async onModuleDestroy() { await this.conn?.close(); }
  async health(): Promise<'up' | 'down'> {
    try {
      await this.ensureConnected();
      const ch = await this.conn?.createChannel();
      await ch?.close();
      return ch ? 'up' : 'down';
    } catch { return 'down'; }
  }
  private async ensureConnected() {
    if (this.conn) return;
    const cfg = serviceConfig();
    const s = await this.vault.readKv<{ host: string; port: string; username: string; password: string; vhost: string }>(cfg.rabbitmqSecretPath);
    this.conn = await connect(`amqp://${encodeURIComponent(s.username)}:${encodeURIComponent(s.password)}@${s.host}:${s.port}/${encodeURIComponent(s.vhost)}`);
  }
}
