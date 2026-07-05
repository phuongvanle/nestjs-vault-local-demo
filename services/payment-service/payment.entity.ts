import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  orderId: number;
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;
  @Column({ length: 40, default: 'pending' })
  status: string;
  @Column({ length: 80 })
  provider: string;
  @Column({ length: 160, nullable: true })
  transactionRef?: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}

