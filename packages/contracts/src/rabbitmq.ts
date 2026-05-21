/**
 * RabbitMQ exchanges used by the platform. They are declared here as contract
 * names only; topology creation belongs to infrastructure/messaging phases.
 */
export const EXCHANGE_NAMES = {
  auth: 'auth.exchange',
  cart: 'cart.exchange',
  catalog: 'catalog.exchange',
  inventory: 'inventory.exchange',
  notification: 'notification.exchange',
  order: 'order.exchange',
  payment: 'payment.exchange',
  user: 'user.exchange',
} as const;

export type ExchangeName = (typeof EXCHANGE_NAMES)[keyof typeof EXCHANGE_NAMES];

/**
 * Initial command and event routing keys. Commands express intent; events
 * describe facts that already happened.
 */
export const ROUTING_KEYS = {
  authCommandLogin: 'auth.command.login',
  authCommandRegister: 'auth.command.register',
  authEventUserRegistered: 'auth.event.user_registered',
  cartCommandAddItem: 'cart.command.add_item',
  catalogCommandGetProduct: 'catalog.command.get_product',
  catalogEventProductCreated: 'catalog.event.product_created',
  inventoryCommandReserveStock: 'inventory.command.reserve_stock',
  orderCommandCreateOrder: 'order.command.create_order',
  paymentCommandRequestPayment: 'payment.command.request_payment',
} as const;

export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];

export type CommandRoutingKey = Extract<RoutingKey, `${string}.command.${string}`>;
export type EventRoutingKey = Extract<RoutingKey, `${string}.event.${string}`>;

/**
 * Queue names are stable service-owned inboxes. Bindings and retry/DLQ
 * topology are intentionally deferred until RabbitMQ application code exists.
 */
export const QUEUE_NAMES = {
  authCommands: 'auth.commands.queue',
  cartCommands: 'cart.commands.queue',
  catalogCommands: 'catalog.commands.queue',
  inventoryCommands: 'inventory.commands.queue',
  notificationEvents: 'notification.events.queue',
  orderCommands: 'order.commands.queue',
  orderEvents: 'order.events.queue',
  paymentCommands: 'payment.commands.queue',
  userEvents: 'user.events.queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
