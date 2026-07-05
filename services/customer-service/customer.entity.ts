import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'customers' })
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ length: 180 })
  fullName: string;
  @Column({ length: 180, unique: true })
  email: string;
  @Column({ length: 40, nullable: true })
  phone?: string;
  @Column({ length: 40, default: 'active' })
  status: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}

