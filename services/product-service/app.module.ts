import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ProductController } from './product.controller';
import { Product } from './product.entity';
import { ProductService } from './product.service';

@Module({ imports: [SharedModule.register([Product])], controllers: [ProductController], providers: [ProductService] })
export class ProductAppModule {}

