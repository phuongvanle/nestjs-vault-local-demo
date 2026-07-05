import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CustomerController } from './customer.controller';
import { Customer } from './customer.entity';
import { CustomerService } from './customer.service';

@Module({ imports: [SharedModule.register([Customer])], controllers: [CustomerController], providers: [CustomerService] })
export class CustomerAppModule {}

