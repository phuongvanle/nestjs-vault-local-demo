import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { serviceConfig } from './config';
import { DbCredential, DynamicDbCredentialProvider } from './dynamic-db-credential.provider';
import { MetricsService } from './metrics.service';

export const SERVICE_ENTITIES = Symbol('SERVICE_ENTITIES');

@Injectable()
export class DatabaseConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseConnectionManager.name);
  private active?: { dataSource: DataSource; credential: DbCredential; expiresAt: Date };
  private timer?: NodeJS.Timeout;
  private rotating = false;
  private startupComplete = false;

  constructor(
    private readonly credentials: DynamicDbCredentialProvider,
    private readonly metrics: MetricsService,
    @Inject(SERVICE_ENTITIES) private readonly entities: Function[]
  ) {}

  async onModuleInit() {
    await this.rotate('startup');
    this.startupComplete = true;
  }

  async onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
    const current = this.active;
    this.active = undefined;
    if (current) {
      await current.dataSource.destroy().catch(() => undefined);
      await this.credentials.revoke(current.credential.leaseId).catch(() => undefined);
    }
  }

  get startupReady() {
    return this.startupComplete;
  }

  get leaseId() {
    return this.active?.credential.leaseId ?? null;
  }

  get dbUsername() {
    return this.active?.credential.username ?? null;
  }

  get leaseRemainingSeconds() {
    return this.active ? Math.max(0, Math.floor((this.active.expiresAt.getTime() - Date.now()) / 1000)) : 0;
  }

  async repo<T extends ObjectLiteral>(entity: EntityTarget<T>): Promise<Repository<T>> {
    if (!this.active || this.leaseRemainingSeconds <= 0) await this.rotate('expired');
    return this.active!.dataSource.getRepository(entity);
  }

  async health(): Promise<'up' | 'down'> {
    try {
      if (!this.active || !this.active.dataSource.isInitialized || this.leaseRemainingSeconds <= 0) return 'down';
      await this.active.dataSource.query('select 1');
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
      const cfg = serviceConfig();
      const credential = await this.credentials.fetch();
      const dataSource = await new DataSource({
        type: 'postgres',
        host: cfg.dbHost,
        port: cfg.dbPort,
        database: cfg.dbName,
        username: credential.username,
        password: credential.password,
        entities: this.entities,
        synchronize: false,
        extra: { max: Number(process.env.DB_POOL_MAX ?? 10) }
      }).initialize();
      await dataSource.query('select 1');
      this.active = { dataSource, credential, expiresAt: new Date(Date.now() + credential.leaseDuration * 1000) };
      this.metrics.vaultSecretRotationTotal.inc({ reason });
      this.metrics.dbConnectionRotationTotal.inc({ reason });
      this.metrics.dbConnectionActive.set(1);
      this.logger.log(`Database pool rotated service=${cfg.serviceName} role=${cfg.vaultDbRole} reason=${reason} leaseId=${credential.leaseId} ttl=${credential.leaseDuration}`);
      this.scheduleRenew();
      if (old) setTimeout(() => old.dataSource.destroy().then(() => this.credentials.revoke(old.credential.leaseId)).catch(() => undefined), Number(process.env.DB_POOL_DRAIN_MS ?? 5000));
    } finally {
      this.rotating = false;
    }
  }

  private scheduleRenew() {
    if (this.timer) clearTimeout(this.timer);
    const ttl = this.active?.credential.leaseDuration ?? 30;
    this.timer = setTimeout(() => void this.renewOrRotate(), Math.max(1000, Math.floor(ttl * 0.6) * 1000));
  }

  private async renewOrRotate() {
    const current = this.active;
    if (!current) return;
    try {
      const renewed = await this.credentials.renew(current.credential.leaseId);
      current.credential.leaseDuration = renewed.leaseDuration;
      current.expiresAt = new Date(Date.now() + renewed.leaseDuration * 1000);
      if (renewed.leaseDuration <= Number(process.env.VAULT_DB_ROTATE_BEFORE_EXPIRY_SECONDS ?? 10)) {
        this.logger.warn(`Lease ttl low service=${serviceConfig().serviceName} leaseId=${current.credential.leaseId} ttl=${renewed.leaseDuration}`);
        await this.rotate('low-ttl');
        return;
      }
      this.scheduleRenew();
    } catch {
      this.metrics.vaultLeaseRenewFailureTotal.inc();
      this.logger.warn(`Lease renew failed service=${serviceConfig().serviceName} leaseId=${current.credential.leaseId}`);
      await this.rotate('renew-failure').catch(() => {
        this.timer = setTimeout(() => void this.renewOrRotate(), Number(process.env.VAULT_DB_ROTATION_RETRY_MS ?? 5000));
      });
    }
  }
}
