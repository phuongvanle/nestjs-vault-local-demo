import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}
  @Post() create(@Body() body: never) { return this.service.create(body); }
  @Get() findAll() { return this.service.findAll(); }
  @Get('events') events() { return this.service.events(); }
  @Post(':id/events') event(@Param('id', ParseIntPipe) id: number, @Body() body: { eventType: string; payload?: unknown }) { return this.service.event(id, body.eventType, body.payload ?? {}); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Patch(':id/status') updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: string }) { return this.service.updateStatus(id, body.status); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
