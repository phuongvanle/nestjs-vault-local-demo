import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseConnectionManager } from '../shared/database-connection.manager';
import { Inventory } from './inventory.entity';

@Injectable()
export class InventoryService {
  constructor(private readonly db: DatabaseConnectionManager) {}
  private repo() { return this.db.repo(Inventory); }
  async create(dto: Partial<Inventory>) { return (await this.repo()).save((await this.repo()).create(dto)); }
  async findAll() { return (await this.repo()).find({ order: { createdAt: 'DESC' } }); }
  async findOne(id: number) { const v = await (await this.repo()).findOneBy({ id }); if (!v) throw new NotFoundException(`Inventory ${id} not found`); return v; }
  async update(id: number, dto: Partial<Inventory>) { return (await this.repo()).save(Object.assign(await this.findOne(id), dto)); }
  async remove(id: number) { await (await this.repo()).delete(id); }
  async reserve(productId: number, quantity: number) {
    const repo = await this.repo();
    const inv = await repo.findOneBy({ productId });
    if (!inv) throw new NotFoundException(`Inventory for product ${productId} not found`);
    if (inv.quantity - inv.reservedQuantity < quantity) throw new BadRequestException('Insufficient inventory');
    inv.reservedQuantity += quantity;
    return repo.save(inv);
  }
}

