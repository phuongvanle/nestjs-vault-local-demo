import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { InventoryController } from './inventory.controller';
import { Inventory } from './inventory.entity';
import { InventoryService } from './inventory.service';

@Module({ imports: [SharedModule.register([Inventory])], controllers: [InventoryController], providers: [InventoryService] })
export class InventoryAppModule {}

