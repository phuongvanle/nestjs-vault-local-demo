export interface DatabaseCredential {
  username: string;
  password: string;
  leaseId: string;
  leaseDuration: number;
  renewable: boolean;
  fetchedAt: Date;
}

export interface DatabaseStaticConfig {
  host: string;
  port: number;
  database: string;
}

export interface LeaseSnapshot {
  leaseId: string | null;
  ttlSeconds: number;
  fetchedAt: Date | null;
  expiresAt: Date | null;
  renewable: boolean;
}

