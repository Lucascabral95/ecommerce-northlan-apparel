import { ROUTING_KEYS, type CommandRoutingKey, type EventRoutingKey } from './rabbitmq';

/**
 * Standard message envelope shared by commands and domain events.
 * `eventId` is the unique message id, even when the message represents a command.
 */
export type MessageEnvelope<TPayload = unknown, TType extends string = string> = Readonly<{
  causationId?: string;
  correlationId: string;
  eventId: string;
  payload: TPayload;
  producer: string;
  timestamp: string;
  type: TType;
  version: number;
}>;

export type BaseCommand<TPayload = unknown, TType extends CommandRoutingKey = CommandRoutingKey> = MessageEnvelope<
  TPayload,
  TType
>;

export type BaseEvent<TPayload = unknown, TType extends EventRoutingKey = EventRoutingKey> = MessageEnvelope<
  TPayload,
  TType
>;

export type RegisterUserCommandPayload = Readonly<{
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
}>;

export type RegisterUserCommand = BaseCommand<
  RegisterUserCommandPayload,
  typeof ROUTING_KEYS.authCommandRegister
>;

export type LoginUserCommandPayload = Readonly<{
  email: string;
  password: string;
}>;

export type LoginUserCommand = BaseCommand<LoginUserCommandPayload, typeof ROUTING_KEYS.authCommandLogin>;

export type UserRegisteredEventPayload = Readonly<{
  email: string;
  role: 'ADMIN' | 'USER';
  userId: string;
}>;

export type UserRegisteredEvent = BaseEvent<
  UserRegisteredEventPayload,
  typeof ROUTING_KEYS.authEventUserRegistered
>;

export type GetProductCommandPayload =
  | Readonly<{
      productId: string;
      slug?: never;
    }>
  | Readonly<{
      productId?: never;
      slug: string;
    }>;

export type GetProductCommand = BaseCommand<GetProductCommandPayload, typeof ROUTING_KEYS.catalogCommandGetProduct>;

export type ProductCreatedEventPayload = Readonly<{
  productId: string;
  skuBase: string;
  slug: string;
  title: string;
}>;

export type ProductCreatedEvent = BaseEvent<
  ProductCreatedEventPayload,
  typeof ROUTING_KEYS.catalogEventProductCreated
>;

export type AddCartItemCommandPayload = Readonly<{
  productId: string;
  quantity: number;
  userId: string;
  variantId: string;
}>;

export type AddCartItemCommand = BaseCommand<AddCartItemCommandPayload, typeof ROUTING_KEYS.cartCommandAddItem>;

export type CreateOrderCommandPayload = Readonly<{
  cartId: string;
  idempotencyKey: string;
  shippingAddressId: string;
  userId: string;
}>;

export type CreateOrderCommand = BaseCommand<
  CreateOrderCommandPayload,
  typeof ROUTING_KEYS.orderCommandCreateOrder
>;

export type ReserveStockItemPayload = Readonly<{
  quantity: number;
  sku: string;
  variantId: string;
}>;

export type ReserveStockCommandPayload = Readonly<{
  idempotencyKey: string;
  items: readonly ReserveStockItemPayload[];
  orderId: string;
  userId: string;
}>;

export type ReserveStockCommand = BaseCommand<
  ReserveStockCommandPayload,
  typeof ROUTING_KEYS.inventoryCommandReserveStock
>;

export type RequestPaymentCommandPayload = Readonly<{
  amount: number;
  currency: string;
  idempotencyKey: string;
  orderId: string;
  provider: 'MERCADO_PAGO' | 'MOCK' | 'STRIPE';
  userId: string;
}>;

export type RequestPaymentCommand = BaseCommand<
  RequestPaymentCommandPayload,
  typeof ROUTING_KEYS.paymentCommandRequestPayment
>;

export type InitialCommand =
  | AddCartItemCommand
  | CreateOrderCommand
  | GetProductCommand
  | LoginUserCommand
  | RegisterUserCommand
  | RequestPaymentCommand
  | ReserveStockCommand;

export type InitialEvent = ProductCreatedEvent | UserRegisteredEvent;
