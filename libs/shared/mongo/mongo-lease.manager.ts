import { Injectable } from '@nestjs/common';
import { MongoDynamicCredentialProvider } from './mongo-dynamic-credential.provider';

@Injectable()
export class MongoLeaseManager {
  constructor(private readonly provider: MongoDynamicCredentialProvider) {}
  renew(leaseId: string) {
    return this.provider.renew(leaseId);
  }
  revoke(leaseId: string) {
    return this.provider.revoke(leaseId);
  }
}

