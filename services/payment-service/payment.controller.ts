import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}
  @Post() create(@Body() body: never) { return this.service.create(body); }
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Patch(':id/status') updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: string }) { return this.service.updateStatus(id, body.status); }
}

