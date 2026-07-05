import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseConnectionManager } from '../database/database-connection.manager';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './item.entity';

@Injectable()
export class ItemsService {
  constructor(private readonly database: DatabaseConnectionManager) {}

  async create(dto: CreateItemDto): Promise<Item> {
    const items = await this.database.getRepository(Item);
    const item = items.create(dto);
    return items.save(item);
  }

  async findAll(): Promise<Item[]> {
    const items = await this.database.getRepository(Item);
    return items.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Item> {
    const items = await this.database.getRepository(Item);
    const item = await items.findOneBy({ id });
    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return item;
  }

  async update(id: number, dto: UpdateItemDto): Promise<Item> {
    const items = await this.database.getRepository(Item);
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return items.save(item);
  }

  async remove(id: number): Promise<void> {
    const items = await this.database.getRepository(Item);
    const result = await items.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Item ${id} not found`);
    }
  }
}
