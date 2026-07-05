import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, DataSourceOptions, ObjectLiteral, Repository } from 'typeorm';
import { Item } from '../items/item.entity';
import { AppConfigService } from '../config/app-config.service';
import { VaultDatabaseCredentialProvider } from './vault-database-credential.provider';
import { DatabaseCredential, DatabaseStaticConfig, LeaseSnapshot } from './database.types';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class DatabaseConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseConnectionManager.name);
  private active?: { dataSource: DataSource; credential: DatabaseCredential; expiresAt: Date };
  private renewTimer?: NodeJS.Timeout;
  private rotating = false;
  private startupComplete = false;
  private rotationCount = 0;

  constructor(
    private readonly config: AppConfigService,
    private readonly credentials: VaultDatabaseCredentialProvider,
    private readonly metrics: MetricsService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rotate('startup');
    this.startupComplete = true;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.renewTimer) {
      clearTimeout(this.renewTimer);
    }

    const current = this.active;
    this.active = undefined;
    if (current) {
      await this.disposePool(current.dataSource);
      await this.safeRevoke(current.credential.leaseId);
    }
  }

  get isStartupComplete(): boolean {
    return this.startupComplete;
  }

  getRotationCount(): number {
    return this.rotationCount;
  }

  getLeaseSnapshot(): LeaseSnapshot {
    if (!this.active) {
      return { leaseId: null, ttlSeconds: 0, fetchedAt: null, expiresAt: null, renewable: false };
    }

    return {
      leaseId: this.active.credential.leaseId,
      ttlSeconds: Math.max(0, Math.floor((this.active.expiresAt.getTime() - Date.now()) / 1000)),
      fetchedAt: this.active.credential.fetchedAt,
      expiresAt: this.active.expiresAt,
      renewable: this.active.credential.renewable
    };
  }

  async getRepository<T extends ObjectLiteral>(entity: new () => T): Promise<Repository<T>> {
    const current = this.active;
    if (!current) {
      throw new Error('Database connection is not ready');
    }

    if (current.expiresAt.getTime() <= Date.now()) {
      await this.rotate('expired');
    }

    return this.active!.dataSource.getRepository(entity);
  }

  async health(): Promise<'up' | 'down'> {
    try {
      const current = this.active;
      if (!current || !current.dataSource.isInitialized || current.expiresAt.getTime() <= Date.now()) {
        return 'down';
      }

      await current.dataSource.query('select 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async rotate(reason: string): Promise<void> {
    if (this.rotating) {
      return;
    }

    this.rotating = true;
    const old = this.active;
    try {
      const credential = await this.credentials.fetchDatabaseCredential();
      const dataSource = await this.createPool(credential);
      await dataSource.query('select 1');

      this.active = {
        dataSource,
        credential,
        expiresAt: new Date(Date.now() + credential.leaseDuration * 1000)
      };
      this.rotationCount += 1;
      this.metrics.vaultSecretRotationTotal.inc({ reason });
      this.metrics.dbConnectionRotationTotal.inc({ reason });
      this.metrics.dbConnectionActive.set(1);
      this.metrics.leaseRemainingSeconds.set(credential.leaseDuration);
      this.metrics.credentialAgeSeconds.set(0);
      this.logger.log(`Database pool rotated reason=${reason} leaseId=${credential.leaseId} ttl=${credential.leaseDuration}`);
      this.scheduleRenew();

      if (old) {
        setTimeout(() => {
          void this.disposePool(old.dataSource).then(() => this.safeRevoke(old.credential.leaseId));
        }, Number(process.env.DB_POOL_DRAIN_MS ?? 5000));
      }
    } finally {
      this.rotating = false;
    }
  }

  private async createPool(credential: DatabaseCredential): Promise<DataSource> {
    const staticConfig: DatabaseStaticConfig = await this.config.getDatabaseStaticConfig();
    const options: DataSourceOptions = {
      type: 'postgres',
      host: staticConfig.host,
      port: staticConfig.port,
      database: staticConfig.database,
      username: credential.username,
      password: credential.password,
      entities: [Item],
      synchronize: false,
      extra: {
        max: Number(process.env.DB_POOL_MAX ?? 10),
        idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30000)
      }
    };

    return new DataSource(options).initialize();
  }

  private scheduleRenew(): void {
    if (this.renewTimer) {
      clearTimeout(this.renewTimer);
    }
    const current = this.active;
    if (!current) {
      return;
    }

    const renewInMs = Math.max(1000, Math.floor(current.credential.leaseDuration * 0.6) * 1000);
    this.renewTimer = setTimeout(() => void this.renewOrRotate(), renewInMs);
  }

  private async renewOrRotate(): Promise<void> {
    const current = this.active;
    if (!current) {
      return;
    }

    try {
      const renewed = await this.credentials.renew(current.credential.leaseId);
      this.metrics.vaultLeaseRenewTotal.inc();
      current.credential.leaseId = renewed.leaseId;
      current.credential.leaseDuration = renewed.leaseDuration;
      current.credential.renewable = renewed.renewable;
      current.expiresAt = new Date(Date.now() + renewed.leaseDuration * 1000);
      this.metrics.leaseRemainingSeconds.set(renewed.leaseDuration);
      this.metrics.credentialAgeSeconds.set((Date.now() - current.credential.fetchedAt.getTime()) / 1000);
      if (renewed.leaseDuration <= Number(process.env.VAULT_DB_ROTATE_BEFORE_EXPIRY_SECONDS ?? 10)) {
        this.logger.warn(`Lease ttl low leaseId=${current.credential.leaseId} ttl=${renewed.leaseDuration}; rotating credential`);
        await this.rotate('low-ttl');
        return;
      }
      this.scheduleRenew();
    } catch (error) {
      this.metrics.vaultLeaseRenewFailureTotal.inc();
      this.logger.warn(`Lease renew failed leaseId=${current.credential.leaseId}; rotating credential`);
      try {
        await this.rotate('renew-failure');
      } catch (rotateError) {
        this.logger.warn(`Credential rotation failed after renew failure; retrying soon`);
        this.renewTimer = setTimeout(() => void this.renewOrRotate(), Number(process.env.VAULT_DB_ROTATION_RETRY_MS ?? 5000));
      }
    }
  }

  private async disposePool(dataSource: DataSource): Promise<void> {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  private async safeRevoke(leaseId: string): Promise<void> {
    try {
      await this.credentials.revoke(leaseId);
    } catch (error) {
      this.logger.warn(`Lease revoke failed leaseId=${leaseId}`);
    }
  }
}
