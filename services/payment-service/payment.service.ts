import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseConnectionManager } from '../shared/database-connection.manager';
import { HttpClientService } from '../shared/http-client.service';
import { Payment } from './payment.entity';

@Injectable()
export class PaymentService {
  constructor(private readonly db: DatabaseConnectionManager, private readonly http: HttpClientService) {}
  private repo() { return this.db.repo(Payment); }
  async create(dto: Partial<Payment>) {
    await this.http.get(`${process.env.ORDER_SERVICE_URL}/orders/${dto.orderId}`);
    return (await this.repo()).save((await this.repo()).create({ ...dto, status: dto.status ?? 'pending', transactionRef: dto.transactionRef ?? `local-${Date.now()}` }));
  }
  async findAll() { return (await this.repo()).find({ order: { createdAt: 'DESC' } }); }
  async findOne(id: number) { const v = await (await this.repo()).findOneBy({ id }); if (!v) throw new NotFoundException(`Payment ${id} not found`); return v; }
  async updateStatus(id: number, status: string) { const p = await this.findOne(id); p.status = status; return (await this.repo()).save(p); }
}

