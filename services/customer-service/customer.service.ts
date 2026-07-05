import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseConnectionManager } from '../shared/database-connection.manager';
import { Customer } from './customer.entity';

@Injectable()
export class CustomerService {
  constructor(private readonly db: DatabaseConnectionManager) {}
  private repo() { return this.db.repo(Customer); }
  async create(dto: Partial<Customer>) { return (await this.repo()).save((await this.repo()).create(dto)); }
  async findAll() { return (await this.repo()).find({ order: { createdAt: 'DESC' } }); }
  async findOne(id: number) { const v = await (await this.repo()).findOneBy({ id }); if (!v) throw new NotFoundException(`Customer ${id} not found`); return v; }
  async update(id: number, dto: Partial<Customer>) { return (await this.repo()).save(Object.assign(await this.findOne(id), dto)); }
  async remove(id: number) { await (await this.repo()).delete(id); }
}

