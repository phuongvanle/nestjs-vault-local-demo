import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Collection, Db, MongoClient } from 'mongodb';
import { MongoCredential, MongoDynamicCredentialProvider } from './mongo-dynamic-credential.provider';

interface ActiveMongo {
  client: MongoClient;
  db: Db;
  credential: MongoCredential;
  expiresAt: Date;
  lastRenewAt?: Date;
  nextRenewAt?: Date;
}

@Injectable()
export class MongoConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoConnectionManager.name);
  private active?: ActiveMongo;
  private timer?: NodeJS.Timeout;
  private rotating = false;
  private startupComplete = false;

  constructor(private readonly credentials: MongoDynamicCredentialProvider) {}

  async onModuleInit() {
    if (!this.enabled) return;
    await this.rotate('startup');
    this.startupComplete = true;
  }

  async onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
    const current = this.active;
    this.active = undefined;
    if (current) {
      await current.client.close(true).catch(() => undefined);
      await this.credentials.revoke(current.credential.leaseId).catch(() => undefined);
    }
  }

  get enabled() {
    return process.env.MONGO_DYNAMIC_ENABLED === 'true';
  }

  get status() {
    return {
      enabled: this.enabled,
      version: process.env.MONGO_VERSION ?? null,
      status: this.active && this.leaseRemainingSeconds > 0 ? 'ok' : this.enabled ? 'down' : 'disabled',
      credentialSource: this.enabled ? 'vault-dynamic' : 'disabled',
      leaseStatus: this.active && this.leaseRemainingSeconds > 0 ? 'active' : 'inactive',
      leaseRenewable: this.active?.credential.renewable ?? false,
      leaseRemainingSeconds: this.leaseRemainingSeconds,
      lastRenewAt: this.active?.lastRenewAt?.toISOString() ?? null,
      nextRenewAt: this.active?.nextRenewAt?.toISOString() ?? null
    };
  }

  get startupReady() {
    return !this.enabled || this.startupComplete;
  }

  get leaseId() {
    return this.active?.credential.leaseId ?? null;
  }

  get leaseRemainingSeconds() {
    return this.active ? Math.max(0, Math.floor((this.active.expiresAt.getTime() - Date.now()) / 1000)) : 0;
  }

  async collection<T extends Record<string, unknown> = Record<string, unknown>>(name: string): Promise<Collection<T>> {
    if (!this.enabled) throw new Error('Mongo dynamic support is disabled');
    if (!this.active || this.leaseRemainingSeconds <= 0) await this.rotate('expired');
    return this.active!.db.collection<T>(name);
  }

  async health(): Promise<'up' | 'down' | 'disabled'> {
    if (!this.enabled) return 'disabled';
    try {
      if (!this.active || this.leaseRemainingSeconds <= 0) return 'down';
      await this.active.db.command({ ping: 1 });
      return 'up';
    } catch {
      return 'down';
    }
  }

  async rotate(reason: string) {
    if (this.rotating) return;
    this.rotating = true;
    const old = this.active;
    try {
      const credential = await this.credentials.fetch();
      const client = new MongoClient(this.uri(credential), { serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS ?? 5000) });
      await client.connect();
      const db = client.db(process.env.MONGO_DATABASE ?? 'appdb');
      await db.command({ ping: 1 });
      this.active = { client, db, credential, expiresAt: new Date(Date.now() + credential.leaseDuration * 1000) };
      this.logger.log(`Mongo connection rotated version=${process.env.MONGO_VERSION} role=${process.env.MONGO_VAULT_DB_ROLE} reason=${reason} leaseId=${credential.leaseId} ttl=${credential.leaseDuration}`);
      this.scheduleRenew();
      if (old) setTimeout(() => old.client.close(true).then(() => this.credentials.revoke(old.credential.leaseId)).catch(() => undefined), Number(process.env.MONGO_DRAIN_MS ?? 5000));
    } finally {
      this.rotating = false;
    }
  }

  private uri(credential: MongoCredential): string {
    const host = process.env.MONGO_HOST ?? 'mongo70';
    const port = process.env.MONGO_PORT ?? '27017';
    const db = process.env.MONGO_DATABASE ?? 'appdb';
    const authSource = process.env.MONGO_AUTH_SOURCE ?? 'admin';
    return `mongodb://${encodeURIComponent(credential.username)}:${encodeURIComponent(credential.password)}@${host}:${port}/${db}?authSource=${encodeURIComponent(authSource)}`;
  }

  private scheduleRenew() {
    if (this.timer) clearTimeout(this.timer);
    const ttl = this.active?.credential.leaseDuration ?? 3600;
    const renewIn = Math.max(1000, Math.floor(ttl * 0.6) * 1000);
    if (this.active) this.active.nextRenewAt = new Date(Date.now() + renewIn);
    this.timer = setTimeout(() => void this.renewOrRotate(), renewIn);
  }

  private async renewOrRotate() {
    const current = this.active;
    if (!current) return;
    try {
      const renewed = await this.credentials.renew(current.credential.leaseId);
      current.credential.leaseDuration = renewed.leaseDuration;
      current.credential.renewable = renewed.renewable;
      current.expiresAt = new Date(Date.now() + renewed.leaseDuration * 1000);
      current.lastRenewAt = new Date();
      if (renewed.leaseDuration <= Number(process.env.MONGO_ROTATE_BEFORE_EXPIRY_SECONDS ?? 60)) {
        await this.rotate('low-ttl');
        return;
      }
      this.scheduleRenew();
    } catch {
      this.logger.warn(`Mongo lease renew failed leaseId=${current.credential.leaseId}; rotating`);
      await this.rotate('renew-failure').catch(() => {
        this.timer = setTimeout(() => void this.renewOrRotate(), Number(process.env.MONGO_ROTATION_RETRY_MS ?? 5000));
      });
    }
  }
}
