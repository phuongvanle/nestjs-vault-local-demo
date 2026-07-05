import { DatabaseCredential } from './database.types';

export interface CredentialProvider {
  fetchDatabaseCredential(): Promise<DatabaseCredential>;
  renew(leaseId: string): Promise<Pick<DatabaseCredential, 'leaseId' | 'leaseDuration' | 'renewable'>>;
  revoke(leaseId: string): Promise<void>;
}

