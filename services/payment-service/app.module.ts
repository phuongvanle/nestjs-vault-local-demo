import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { PaymentController } from './payment.controller';
import { Payment } from './payment.entity';
import { PaymentService } from './payment.service';

@Module({ imports: [SharedModule.register([Payment])], controllers: [PaymentController], providers: [PaymentService] })
export class PaymentAppModule {}

