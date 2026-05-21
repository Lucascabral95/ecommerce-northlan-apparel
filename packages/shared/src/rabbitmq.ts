import { HttpException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { connect, type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import { JsonLogger } from './logger';

export type RabbitMqConfig = Readonly<{
  serviceName: string;
  url: string;
}>;

export type RabbitMqHandler<TRequest = unknown, TResponse = unknown> = (
  payload: TRequest,
  message: ConsumeMessage,
) => Promise<TResponse>;

export type RpcResponse<TData = unknown> =
  | Readonly<{
      data: TData;
      success: true;
    }>
  | Readonly<{
      error: Readonly<{
        code: string;
        details?: unknown;
        message: string;
      }>;
      success: false;
    }>;

type RpcError = Readonly<{
  code: string;
  details?: unknown;
  message: string;
}>;

export type SubscribeOptions = Readonly<{
  deadLetter?: Readonly<{
    exchange: string;
    queue: string;
    routingKey: string;
  }>;
  exchange: string;
  queue: string;
  routingKeys: readonly string[];
}>;

export type PublishOptions = Readonly<{
  correlationId?: string;
  exchange: string;
  message: unknown;
  routingKey: string;
}>;

export type RequestOptions = PublishOptions &
  Readonly<{
    timeoutMs?: number;
  }>;

const DEFAULT_RPC_TIMEOUT_MS = 5_000;

@Injectable()
export class RabbitMqClient implements OnModuleDestroy {
  private channel?: Channel;
  private connection?: ChannelModel;
  private readonly logger: JsonLogger;

  constructor(private readonly config: RabbitMqConfig) {
    this.logger = new JsonLogger(config.serviceName);
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async publish(options: PublishOptions): Promise<void> {
    const channel = await this.getChannel();
    await this.assertExchange(options.exchange);

    channel.publish(
      options.exchange,
      options.routingKey,
      Buffer.from(JSON.stringify(options.message)),
      {
        contentType: 'application/json',
        correlationId: options.correlationId,
        deliveryMode: 2,
        messageId: randomUUID(),
        timestamp: Date.now(),
      },
    );
  }

  async request<TResponse = unknown>(options: RequestOptions): Promise<TResponse> {
    const channel = await this.getChannel();
    await this.assertExchange(options.exchange);

    const replyQueue = await channel.assertQueue('', {
      autoDelete: true,
      durable: false,
      exclusive: true,
    });
    const correlationId = options.correlationId ?? randomUUID();

    return new Promise<TResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`RabbitMQ request timed out for ${options.routingKey}.`));
      }, options.timeoutMs ?? DEFAULT_RPC_TIMEOUT_MS);

      void channel.consume(
        replyQueue.queue,
        (message) => {
          if (!message || message.properties.correlationId !== correlationId) {
            return;
          }

          clearTimeout(timeout);
          const response = parseJson<RpcResponse<TResponse>>(message.content);
          if (!response.success) {
            reject(
              Object.assign(new Error(response.error.message), {
                code: response.error.code,
                details: response.error.details,
              }),
            );
            return;
          }

          resolve(response.data);
        },
        { noAck: true },
      );

      channel.publish(
        options.exchange,
        options.routingKey,
        Buffer.from(JSON.stringify(options.message)),
        {
          contentType: 'application/json',
          correlationId,
          deliveryMode: 2,
          messageId: randomUUID(),
          replyTo: replyQueue.queue,
          timestamp: Date.now(),
        },
      );
    });
  }

  async subscribe<TRequest = unknown, TResponse = unknown>(
    options: SubscribeOptions,
    handler: RabbitMqHandler<TRequest, TResponse>,
  ): Promise<void> {
    const channel = await this.getChannel();
    await this.assertExchange(options.exchange);
    if (options.deadLetter) {
      await this.assertExchange(options.deadLetter.exchange);
      const deadLetterQueue = await channel.assertQueue(options.deadLetter.queue, {
        durable: true,
      });
      await channel.bindQueue(
        deadLetterQueue.queue,
        options.deadLetter.exchange,
        options.deadLetter.routingKey,
      );
    }

    const queue = await channel.assertQueue(options.queue, {
      arguments: options.deadLetter
        ? {
            'x-dead-letter-exchange': options.deadLetter.exchange,
            'x-dead-letter-routing-key': options.deadLetter.routingKey,
          }
        : undefined,
      durable: true,
    });

    for (const routingKey of options.routingKeys) {
      await channel.bindQueue(queue.queue, options.exchange, routingKey);
    }

    await channel.consume(queue.queue, (message) => {
      if (!message) {
        return;
      }

      void this.handleMessage(message, handler);
    });
  }

  private async handleMessage<TRequest, TResponse>(
    message: ConsumeMessage,
    handler: RabbitMqHandler<TRequest, TResponse>,
  ): Promise<void> {
    const channel = await this.getChannel();

    try {
      const payload = parseJson<TRequest>(message.content);
      const result = await handler(payload, message);

      if (message.properties.replyTo) {
        this.reply(message, {
          data: result,
          success: true,
        });
      }

      channel.ack(message);
    } catch (error) {
      const normalizedError = normalizeRpcError(error);
      this.logger.error(normalizedError.message, undefined, 'RabbitMqClient');

      if (message.properties.replyTo) {
        this.reply(message, {
          error: normalizedError,
          success: false,
        });
        channel.ack(message);
        return;
      }

      channel.nack(message, false, false);
    }
  }

  private reply<TData>(message: ConsumeMessage, response: RpcResponse<TData>): void {
    if (!message.properties.replyTo) {
      return;
    }

    this.channel?.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(response)), {
      contentType: 'application/json',
      correlationId: message.properties.correlationId,
      deliveryMode: 1,
    });
  }

  private async assertExchange(exchange: string): Promise<void> {
    const channel = await this.getChannel();
    await channel.assertExchange(exchange, 'topic', {
      durable: true,
    });
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    this.connection = await connect(this.config.url);
    this.channel = await this.connection.createChannel();
    return this.channel;
  }

  private async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = undefined;
    this.connection = undefined;
  }
}

export function createRabbitMqClient(config: RabbitMqConfig): RabbitMqClient {
  return new RabbitMqClient(config);
}

function parseJson<TValue>(buffer: Buffer): TValue {
  return JSON.parse(buffer.toString('utf8')) as TValue;
}

function normalizeRpcError(error: unknown): RpcError {
  if (error instanceof Error) {
    if (error instanceof HttpException) {
      return {
        code: httpStatusToCode(error.getStatus()),
        details: error.getResponse(),
        message: error.message,
      };
    }

    const candidate = error as Error & { code?: unknown; details?: unknown };
    return {
      code: typeof candidate.code === 'string' ? candidate.code : 'INTERNAL_ERROR',
      details: candidate.details,
      message: error.message,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Unexpected RabbitMQ handler error.',
  };
}

function httpStatusToCode(statusCode: number): string {
  if (statusCode === 400) {
    return 'BAD_REQUEST';
  }

  if (statusCode === 401) {
    return 'UNAUTHORIZED';
  }

  if (statusCode === 403) {
    return 'FORBIDDEN';
  }

  if (statusCode === 404) {
    return 'NOT_FOUND';
  }

  if (statusCode === 409) {
    return 'CONFLICT';
  }

  return `HTTP_${statusCode}`;
}
