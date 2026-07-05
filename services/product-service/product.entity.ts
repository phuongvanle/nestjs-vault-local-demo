import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ length: 160 })
  name: string;
  @Column({ length: 80, unique: true })
  sku: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: string;
  @Column({ length: 40, default: 'active' })
  status: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}

