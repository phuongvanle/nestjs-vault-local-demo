import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ChannelModel, connect } from 'amqplib';
import { AppConfigService } from './config/app-config.service';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection?: ChannelModel;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    const rabbitmq = await this.config.getRabbitmqConfig();
    const vhost = encodeURIComponent(rabbitmq.vhost);
    const url = `amqp://${encodeURIComponent(rabbitmq.username)}:${encodeURIComponent(rabbitmq.password)}@${rabbitmq.host}:${rabbitmq.port}/${vhost}`;

    this.connection = await connect(url);
    this.logger.log(`Connected to RabbitMQ at ${rabbitmq.host}:${rabbitmq.port}${rabbitmq.vhost}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.close();
  }

  async health(): Promise<'up' | 'down'> {
    if (!this.connection) {
      return 'down';
    }

    try {
      const channel = await this.connection.createChannel();
      await channel.close();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
