import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly service: ProductService) {}
  @Post() create(@Body() body: unknown) { return this.service.create(body as never); }
  @Get() findAll() { return this.service.findAll(); }
  @Get('audit-logs') auditLogs() { return this.service.auditLogs(); }
  @Post(':id/audit-logs') audit(@Param('id', ParseIntPipe) id: number, @Body() body: { action: string; before?: unknown; after?: unknown }) { return this.service.audit(id, body.action, body.before ?? null, body.after ?? null); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) { return this.service.update(id, body as never); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
