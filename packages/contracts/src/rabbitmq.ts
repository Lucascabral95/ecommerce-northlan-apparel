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
  authCommandRefresh: 'auth.command.refresh',
  authCommandRegister: 'auth.command.register',
  authEventUserRegistered: 'auth.event.user_registered',
  cartCommandAddItem: 'cart.command.add_item',
  cartCommandClearCart: 'cart.command.clear_cart',
  cartCommandGetCart: 'cart.command.get_cart',
  cartCommandRemoveItem: 'cart.command.remove_item',
  cartCommandUpdateItem: 'cart.command.update_item',
  catalogCommandCreateProduct: 'catalog.command.create_product',
  catalogCommandGetCategories: 'catalog.command.get_categories',
  catalogCommandGetProduct: 'catalog.command.get_product',
  catalogCommandListProducts: 'catalog.command.list_products',
  catalogCommandUpdateProduct: 'catalog.command.update_product',
  catalogEventProductCreated: 'catalog.event.product_created',
  catalogEventProductUpdated: 'catalog.event.product_updated',
  inventoryCommandAdjustStock: 'inventory.command.adjust_stock',
  inventoryCommandConfirmStock: 'inventory.command.confirm_stock',
  inventoryCommandReleaseStock: 'inventory.command.release_stock',
  inventoryCommandReserveStock: 'inventory.command.reserve_stock',
  inventoryEventStockAdjusted: 'inventory.event.stock_adjusted',
  inventoryEventStockConfirmed: 'inventory.event.stock_confirmed',
  inventoryEventStockReleased: 'inventory.event.stock_released',
  inventoryEventStockReservationFailed: 'inventory.event.stock_reservation_failed',
  inventoryEventStockReserved: 'inventory.event.stock_reserved',
  orderCommandCreateOrder: 'order.command.create_order',
  orderCommandGetOrder: 'order.command.get_order',
  orderCommandListOrders: 'order.command.list_orders',
  orderCommandUpdateStatus: 'order.command.update_status',
  orderEventOrderCancelled: 'order.event.order_cancelled',
  orderEventOrderCreated: 'order.event.order_created',
  orderEventOrderStatusChanged: 'order.event.order_status_changed',
  paymentCommandRequestPayment: 'payment.command.request_payment',
  paymentEventPaymentFailed: 'payment.event.payment_failed',
  paymentEventPaymentSucceeded: 'payment.event.payment_succeeded',
  userCommandCreateAddress: 'user.command.create_address',
  userCommandGetProfile: 'user.command.get_profile',
  userCommandListAddresses: 'user.command.list_addresses',
  userCommandUpdateProfile: 'user.command.update_profile',
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
  userCommands: 'user.commands.queue',
  userEvents: 'user.events.queue',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
