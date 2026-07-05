import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MongoConnectionManager } from '../../libs/shared/mongo/mongo-connection.manager';
import { DatabaseConnectionManager } from '../shared/database-connection.manager';
import { HttpClientService } from '../shared/http-client.service';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';

interface CreateOrderDto {
  customerId: number;
  items: Array<{ productId: number; quantity: number }>;
}

@Injectable()
export class OrderService {
  constructor(private readonly db: DatabaseConnectionManager, private readonly http: HttpClientService, private readonly mongo: MongoConnectionManager) {}
  private orders() { return this.db.repo(Order); }
  private orderItems() { return this.db.repo(OrderItem); }

  async create(dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('items are required');
    await this.http.get(`${process.env.CUSTOMER_SERVICE_URL}/customers/${dto.customerId}`);
    let total = 0;
    const resolved: Array<{ productId: number; quantity: number; unitPrice: number }> = [];
    for (const item of dto.items) {
      const product = await this.http.get<{ id: number; price: string }>(`${process.env.PRODUCT_SERVICE_URL}/products/${item.productId}`);
      await this.http.post(`${process.env.INVENTORY_SERVICE_URL}/inventory/reserve`, { productId: item.productId, quantity: item.quantity });
      const unitPrice = Number(product.price);
      total += unitPrice * item.quantity;
      resolved.push({ productId: item.productId, quantity: item.quantity, unitPrice });
    }
    const order = await (await this.orders()).save((await this.orders()).create({ customerId: dto.customerId, status: 'created', totalAmount: total.toFixed(2) }));
    const orderItemRepo = await this.orderItems();
    await orderItemRepo.save(resolved.map((item) => orderItemRepo.create({ orderId: order.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2) })));
    await this.event(order.id, 'order_created', { customerId: dto.customerId, items: resolved }).catch(() => undefined);
    return this.findOne(order.id);
  }

  async findAll() { return (await this.orders()).find({ relations: ['items'], order: { createdAt: 'DESC' } }); }
  async findOne(id: number) { const v = await (await this.orders()).findOne({ where: { id }, relations: ['items'] }); if (!v) throw new NotFoundException(`Order ${id} not found`); return v; }
  async updateStatus(id: number, status: string) { const order = await this.findOne(id); order.status = status; const saved = await (await this.orders()).save(order); await this.event(id, 'status_updated', { status }).catch(() => undefined); return saved; }
  async remove(id: number) { await (await this.orderItems()).delete({ orderId: id }); await (await this.orders()).delete(id); await this.event(id, 'order_deleted', {}).catch(() => undefined); }
  async event(orderId: number, eventType: string, payload: unknown) {
    const result = await (await this.mongo.collection('order_events')).insertOne({ orderId, eventType, payload, createdAt: new Date() });
    return { id: result.insertedId.toString(), orderId, eventType };
  }
  async events(orderId?: number) {
    const query = orderId ? { orderId } : {};
    return (await this.mongo.collection('order_events')).find(query).sort({ createdAt: -1 }).limit(50).toArray();
  }
}
