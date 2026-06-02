import { HttpException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { connect, type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import { JsonLogger } from './logger';
import {
  recordRabbitMqConsumed,
  recordRabbitMqDeadLetter,
  recordRabbitMqFailed,
  recordRabbitMqPublished,
  recordRabbitMqRetried,
} from './metrics';

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
  retry?: Readonly<{
    delayMs: number;
    exchange: string;
    maxAttempts: number;
    queue: string;
    routingKey: string;
  }>;
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
    const messageType = getMessageType(options.message);

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
    recordRabbitMqPublished({
      exchange: options.exchange,
      messageType,
      routingKey: options.routingKey,
      service: this.config.serviceName,
    });
  }

  async request<TResponse = unknown>(options: RequestOptions): Promise<TResponse> {
    const channel = await this.getChannel();
    await this.assertExchange(options.exchange);
    const messageType = getMessageType(options.message);

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
      recordRabbitMqPublished({
        exchange: options.exchange,
        messageType,
        routingKey: options.routingKey,
        service: this.config.serviceName,
      });
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
    if (options.retry) {
      await this.assertExchange(options.retry.exchange);
      const retryQueue = await channel.assertQueue(options.retry.queue, {
        arguments: {
          'x-dead-letter-exchange': options.exchange,
          'x-dead-letter-routing-key': options.retry.routingKey,
          'x-message-ttl': options.retry.delayMs,
        },
        durable: true,
      });
      await channel.bindQueue(retryQueue.queue, options.retry.exchange, options.retry.routingKey);
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
    if (options.retry) {
      await channel.bindQueue(queue.queue, options.exchange, options.retry.routingKey);
    }

    await channel.consume(queue.queue, (message) => {
      if (!message) {
        return;
      }

      void this.handleMessage(message, handler, options);
    });
  }

  private async handleMessage<TRequest, TResponse>(
    message: ConsumeMessage,
    handler: RabbitMqHandler<TRequest, TResponse>,
    options: SubscribeOptions,
  ): Promise<void> {
    const channel = await this.getChannel();

    try {
      const payload = parseJson<TRequest>(message.content);
      const messageType = getMessageType(payload);
      const result = await handler(payload, message);

      if (message.properties.replyTo) {
        this.reply(message, {
          data: result,
          success: true,
        });
      }

      channel.ack(message);
      recordRabbitMqConsumed({
        exchange: message.fields.exchange,
        messageType,
        queue: options.queue,
        routingKey: message.fields.routingKey,
        service: this.config.serviceName,
      });
    } catch (error) {
      const normalizedError = normalizeRpcError(error);
      const failedMessageType = getMessageTypeFromBuffer(message.content);
      recordRabbitMqFailed({
        exchange: message.fields.exchange,
        messageType: failedMessageType,
        queue: options.queue,
        routingKey: message.fields.routingKey,
        service: this.config.serviceName,
      });
      this.logger.writeWithContext('error', normalizedError.message, {
        context: 'RabbitMqClient',
        correlationId: message.properties.correlationId,
        metadata: {
          exchange: message.fields.exchange,
          queue: options.queue,
          routingKey: message.fields.routingKey,
          eventType: failedMessageType,
          error: normalizedError,
        },
      });

      if (message.properties.replyTo) {
        this.reply(message, {
          error: normalizedError,
          success: false,
        });
        channel.ack(message);
        return;
      }

      if (this.shouldRetry(message, options)) {
        this.retryMessage(message, options);
        channel.ack(message);
        return;
      }

      recordRabbitMqDeadLetter({
        exchange: message.fields.exchange,
        messageType: failedMessageType,
        queue: options.queue,
        routingKey: message.fields.routingKey,
        service: this.config.serviceName,
      });
      channel.nack(message, false, false);
    }
  }

  private shouldRetry(message: ConsumeMessage, options: SubscribeOptions): boolean {
    if (!options.retry) {
      return false;
    }

    return getRetryCount(message) < options.retry.maxAttempts;
  }

  private retryMessage(message: ConsumeMessage, options: SubscribeOptions): void {
    if (!options.retry) {
      return;
    }

    const retryCount = getRetryCount(message) + 1;
    this.channel?.publish(options.retry.exchange, options.retry.routingKey, message.content, {
      contentType: message.properties.contentType ?? 'application/json',
      correlationId: message.properties.correlationId,
      deliveryMode: 2,
      headers: {
        ...message.properties.headers,
        'x-original-routing-key': message.fields.routingKey,
        'x-retry-count': retryCount,
      },
      messageId: randomUUID(),
      timestamp: Date.now(),
    });
    recordRabbitMqRetried({
      exchange: options.retry.exchange,
      messageType: getMessageTypeFromBuffer(message.content),
      queue: options.queue,
      routingKey: options.retry.routingKey,
      service: this.config.serviceName,
    });
    this.logger.writeWithContext('warn', `RabbitMQ message scheduled for retry ${retryCount}.`, {
      context: 'RabbitMqClient',
      correlationId: message.properties.correlationId,
      metadata: {
        exchange: options.retry.exchange,
        queue: options.queue,
        routingKey: options.retry.routingKey,
        retryDelayMs: options.retry.delayMs,
        retryRoutingKey: options.retry.routingKey,
      },
    });
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

function getMessageType(message: unknown): string {
  if (message && typeof message === 'object' && 'type' in message) {
    const type = (message as { type?: unknown }).type;
    if (typeof type === 'string' && type.trim().length > 0) {
      return type;
    }
  }

  return 'unknown';
}

function getMessageTypeFromBuffer(buffer: Buffer): string {
  try {
    return getMessageType(parseJson<unknown>(buffer));
  } catch {
    return 'unknown';
  }
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

function getRetryCount(message: ConsumeMessage): number {
  const retryCount = message.properties.headers?.['x-retry-count'];
  return typeof retryCount === 'number' && Number.isInteger(retryCount) ? retryCount : 0;
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
