import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  customerId: number;
  @Column({ length: 40, default: 'created' })
  status: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  totalAmount: string;
  @OneToMany(() => OrderItem, (item) => item.order)
  items?: OrderItem[];
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}

