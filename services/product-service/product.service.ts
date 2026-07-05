import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoConnectionManager } from '../../libs/shared/mongo/mongo-connection.manager';
import { DatabaseConnectionManager } from '../shared/database-connection.manager';
import { Product } from './product.entity';

@Injectable()
export class ProductService {
  constructor(private readonly db: DatabaseConnectionManager, private readonly mongo: MongoConnectionManager) {}
  private repo() { return this.db.repo(Product); }
  async create(dto: Partial<Product>) {
    const created = await (await this.repo()).save((await this.repo()).create(dto));
    await this.audit(created.id, 'create', null, created).catch(() => undefined);
    return created;
  }
  async findAll() { return (await this.repo()).find({ order: { createdAt: 'DESC' } }); }
  async findOne(id: number) {
    const item = await (await this.repo()).findOneBy({ id });
    if (!item) throw new NotFoundException(`Product ${id} not found`);
    return item;
  }
  async update(id: number, dto: Partial<Product>) {
    const before = await this.findOne(id);
    const updated = await (await this.repo()).save(Object.assign(before, dto));
    await this.audit(id, 'update', before, updated).catch(() => undefined);
    return updated;
  }
  async remove(id: number) {
    const before = await this.findOne(id);
    await (await this.repo()).delete(id);
    await this.audit(id, 'delete', before, null).catch(() => undefined);
  }
  async audit(productId: number, action: string, before: unknown, after: unknown) {
    const col = await this.mongo.collection('product_audit_logs');
    const result = await col.insertOne({ productId, action, before, after, createdAt: new Date() });
    return { id: result.insertedId.toString(), productId, action };
  }
  async auditLogs(productId?: number) {
    const query = productId ? { productId } : {};
    return (await this.mongo.collection('product_audit_logs')).find(query).sort({ createdAt: -1 }).limit(50).toArray();
  }
}
