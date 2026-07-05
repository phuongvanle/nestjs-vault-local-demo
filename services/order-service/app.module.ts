import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { OrderItem } from './order-item.entity';
import { OrderController } from './order.controller';
import { Order } from './order.entity';
import { OrderService } from './order.service';

@Module({ imports: [SharedModule.register([Order, OrderItem])], controllers: [OrderController], providers: [OrderService] })
export class OrderAppModule {}

