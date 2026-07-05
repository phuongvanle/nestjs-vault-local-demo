import { Injectable } from '@nestjs/common';
import { MongoConnectionManager } from './mongo-connection.manager';

@Injectable()
export class MongoHealthIndicator {
  constructor(private readonly mongo: MongoConnectionManager) {}
  details() {
    return this.mongo.status;
  }
  health() {
    return this.mongo.health();
  }
}

