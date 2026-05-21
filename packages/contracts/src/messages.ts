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

export type BaseCommand<
  TPayload = unknown,
  TType extends CommandRoutingKey = CommandRoutingKey,
> = MessageEnvelope<TPayload, TType>;

export type BaseEvent<
  TPayload = unknown,
  TType extends EventRoutingKey = EventRoutingKey,
> = MessageEnvelope<TPayload, TType>;

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

export type LoginUserCommand = BaseCommand<
  LoginUserCommandPayload,
  typeof ROUTING_KEYS.authCommandLogin
>;

export type RefreshTokenCommandPayload = Readonly<{
  refreshToken: string;
}>;

export type RefreshTokenCommand = BaseCommand<
  RefreshTokenCommandPayload,
  typeof ROUTING_KEYS.authCommandRefresh
>;

export type UserRegisteredEventPayload = Readonly<{
  email: string;
  firstName?: string;
  lastName?: string;
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

export type GetProductCommand = BaseCommand<
  GetProductCommandPayload,
  typeof ROUTING_KEYS.catalogCommandGetProduct
>;

export type ProductGenderTarget = 'KIDS' | 'MEN' | 'UNISEX' | 'WOMEN';

export type ProductType =
  | 'ACCESSORY'
  | 'DRESS'
  | 'HOODIE'
  | 'JACKET'
  | 'JEANS'
  | 'OTHER'
  | 'PANTS'
  | 'SHIRT'
  | 'SHOES'
  | 'SWEATER'
  | 'T_SHIRT';

export type ProductFit = 'OVERSIZED' | 'REGULAR' | 'RELAXED' | 'SLIM';

export type ProductSeason = 'ALL_SEASON' | 'MID_SEASON' | 'SUMMER' | 'WINTER';

export type ProductSortBy = 'newest' | 'price_asc' | 'price_desc' | 'relevance';

export type ProductVariantDto = Readonly<{
  availableStock: number;
  barcode?: string;
  colorHex: string;
  colorName: string;
  id: string;
  isActive: boolean;
  priceOverride?: number;
  reservedStock: number;
  size: string;
  sku: string;
  stock: number;
  weightInGrams: number;
}>;

export type ProductImageDto = Readonly<{
  altText: string;
  id: string;
  isPrimary: boolean;
  position: number;
  url: string;
  variantId?: string;
}>;

export type ProductDto = Readonly<{
  averageRating: number;
  brand: string;
  canonicalUrl?: string;
  careInstructions: string;
  categoryId: string;
  categoryName: string;
  collection?: string;
  compareAtPrice?: number;
  composition: string;
  costPrice?: number;
  createdAt: string;
  currency: string;
  description: string;
  discountPercentage: number;
  externalUrl?: string;
  fit: ProductFit;
  genderTarget: ProductGenderTarget;
  id: string;
  images: readonly ProductImageDto[];
  isActive: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  material: string;
  price: number;
  productType: ProductType;
  seoDescription?: string;
  seoTitle?: string;
  shortDescription: string;
  skuBase: string;
  season: ProductSeason;
  slug: string;
  subcategoryId?: string;
  subcategoryName?: string;
  tags: readonly string[];
  taxRate: number;
  title: string;
  totalReviews: number;
  updatedAt: string;
  variants: readonly ProductVariantDto[];
}>;

export type CategoryDto = Readonly<{
  createdAt: string;
  description?: string;
  id: string;
  imageUrl?: string;
  isActive: boolean;
  name: string;
  parentId?: string;
  slug: string;
  updatedAt: string;
}>;

export type ProductListFiltersDto = Readonly<{
  brands: readonly string[];
  categories: readonly CategoryDto[];
  colors: readonly string[];
  sizes: readonly string[];
}>;

export type ProductListResponseDto = Readonly<{
  filters: ProductListFiltersDto;
  items: readonly ProductDto[];
  total: number;
}>;

export type ListProductsCommandPayload = Readonly<{
  brand?: string;
  categorySlug?: string;
  color?: string;
  genderTarget?: ProductGenderTarget;
  includeInactive?: boolean;
  isFeatured?: boolean;
  maxPrice?: number;
  minPrice?: number;
  page?: number;
  pageSize?: number;
  productType?: ProductType;
  search?: string;
  size?: string;
  sortBy?: ProductSortBy;
}>;

export type ListProductsCommand = BaseCommand<
  ListProductsCommandPayload,
  typeof ROUTING_KEYS.catalogCommandListProducts
>;

export type GetCategoriesCommandPayload = Readonly<{
  includeInactive?: boolean;
}>;

export type GetCategoriesCommand = BaseCommand<
  GetCategoriesCommandPayload,
  typeof ROUTING_KEYS.catalogCommandGetCategories
>;

export type ProductVariantInput = Readonly<{
  barcode?: string;
  colorHex: string;
  colorName: string;
  isActive?: boolean;
  priceOverride?: number;
  reservedStock?: number;
  size: string;
  sku: string;
  stock: number;
  weightInGrams: number;
}>;

export type ProductImageInput = Readonly<{
  altText: string;
  isPrimary?: boolean;
  position: number;
  url: string;
  variantSku?: string;
}>;

export type CreateProductCommandPayload = Readonly<{
  brand: string;
  canonicalUrl?: string;
  careInstructions: string;
  categoryId?: string;
  categoryName: string;
  collection?: string;
  compareAtPrice?: number;
  composition: string;
  costPrice?: number;
  currency: string;
  description: string;
  discountPercentage?: number;
  externalUrl?: string;
  fit: ProductFit;
  genderTarget: ProductGenderTarget;
  images?: readonly ProductImageInput[];
  isActive?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  material: string;
  price: number;
  productType: ProductType;
  seoDescription?: string;
  seoTitle?: string;
  shortDescription: string;
  skuBase: string;
  season: ProductSeason;
  slug?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  tags?: readonly string[];
  taxRate?: number;
  title: string;
  variants?: readonly ProductVariantInput[];
}>;

export type CreateProductCommand = BaseCommand<
  CreateProductCommandPayload,
  typeof ROUTING_KEYS.catalogCommandCreateProduct
>;

export type UpdateProductCommandPayload = Readonly<
  Partial<Omit<CreateProductCommandPayload, 'categoryName' | 'skuBase'>> & {
    categoryName?: string;
    id: string;
    skuBase?: string;
  }
>;

export type UpdateProductCommand = BaseCommand<
  UpdateProductCommandPayload,
  typeof ROUTING_KEYS.catalogCommandUpdateProduct
>;

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

export type ProductUpdatedEventPayload = ProductCreatedEventPayload;

export type ProductUpdatedEvent = BaseEvent<
  ProductUpdatedEventPayload,
  typeof ROUTING_KEYS.catalogEventProductUpdated
>;

export type CartStatus = 'ABANDONED' | 'ACTIVE' | 'CHECKED_OUT';

export type CartItemDto = Readonly<{
  createdAt: string;
  id: string;
  imageSnapshot?: string;
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  sku: string;
  slugSnapshot: string;
  titleSnapshot: string;
  total: number;
  unitPriceSnapshot: number;
  updatedAt: string;
  variantId: string;
}>;

export type CartDto = Readonly<{
  createdAt: string;
  currency: string;
  id: string;
  items: readonly CartItemDto[];
  status: CartStatus;
  subtotal: number;
  updatedAt: string;
  userId: string;
}>;

export type GetCartCommandPayload = Readonly<{
  userId: string;
}>;

export type GetCartCommand = BaseCommand<
  GetCartCommandPayload,
  typeof ROUTING_KEYS.cartCommandGetCart
>;

export type AddCartItemCommandPayload = Readonly<{
  productId: string;
  quantity: number;
  userId: string;
  variantId: string;
}>;

export type AddCartItemCommand = BaseCommand<
  AddCartItemCommandPayload,
  typeof ROUTING_KEYS.cartCommandAddItem
>;

export type UpdateCartItemCommandPayload = Readonly<{
  itemId: string;
  quantity: number;
  userId: string;
}>;

export type UpdateCartItemCommand = BaseCommand<
  UpdateCartItemCommandPayload,
  typeof ROUTING_KEYS.cartCommandUpdateItem
>;

export type RemoveCartItemCommandPayload = Readonly<{
  itemId: string;
  userId: string;
}>;

export type RemoveCartItemCommand = BaseCommand<
  RemoveCartItemCommandPayload,
  typeof ROUTING_KEYS.cartCommandRemoveItem
>;

export type ClearCartCommandPayload = Readonly<{
  userId: string;
}>;

export type ClearCartCommand = BaseCommand<
  ClearCartCommandPayload,
  typeof ROUTING_KEYS.cartCommandClearCart
>;

export type CartCommand =
  | AddCartItemCommand
  | ClearCartCommand
  | GetCartCommand
  | RemoveCartItemCommand
  | UpdateCartItemCommand;

export type CreateOrderCommandPayload = Readonly<{
  billingAddressSnapshot?: unknown;
  cartId?: string;
  idempotencyKey: string;
  shippingAddressId?: string;
  shippingAddressSnapshot?: unknown;
  userId: string;
}>;

export type CreateOrderCommand = BaseCommand<
  CreateOrderCommandPayload,
  typeof ROUTING_KEYS.orderCommandCreateOrder
>;

export type OrderStatus =
  | 'CANCELLED'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'FAILED'
  | 'PAID'
  | 'PAYMENT_PENDING'
  | 'PENDING'
  | 'PREPARING'
  | 'REFUNDED'
  | 'SHIPPED'
  | 'STOCK_RESERVED';

export type OrderItemDto = Readonly<{
  brand?: string;
  category?: string;
  createdAt: string;
  id: string;
  productId: string;
  productImage?: string;
  productSlug: string;
  productTitle: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  sku: string;
  total: number;
  unitPrice: number;
  variantId: string;
}>;

export type OrderStatusHistoryDto = Readonly<{
  changedBy?: string;
  createdAt: string;
  id: string;
  reason?: string;
  status: OrderStatus;
}>;

export type OrderDto = Readonly<{
  billingAddressSnapshot?: unknown;
  createdAt: string;
  currency: string;
  discountTotal: number;
  grandTotal: number;
  id: string;
  idempotencyKey: string;
  items: readonly OrderItemDto[];
  orderNumber: string;
  paymentId?: string;
  paymentStatus?: string;
  shippingAddressSnapshot?: unknown;
  shippingCost: number;
  status: OrderStatus;
  statusHistory: readonly OrderStatusHistoryDto[];
  subtotal: number;
  taxTotal: number;
  updatedAt: string;
  userId: string;
}>;

export type ListOrdersCommandPayload = Readonly<{
  includeAll?: boolean;
  userId?: string;
}>;

export type ListOrdersCommand = BaseCommand<
  ListOrdersCommandPayload,
  typeof ROUTING_KEYS.orderCommandListOrders
>;

export type GetOrderCommandPayload = Readonly<{
  includeAll?: boolean;
  orderId: string;
  userId?: string;
}>;

export type GetOrderCommand = BaseCommand<
  GetOrderCommandPayload,
  typeof ROUTING_KEYS.orderCommandGetOrder
>;

export type UpdateOrderStatusCommandPayload = Readonly<{
  changedBy?: string;
  orderId: string;
  reason?: string;
  status: OrderStatus;
}>;

export type UpdateOrderStatusCommand = BaseCommand<
  UpdateOrderStatusCommandPayload,
  typeof ROUTING_KEYS.orderCommandUpdateStatus
>;

export type OrderCreatedEventPayload = Readonly<{
  grandTotal: number;
  orderId: string;
  orderNumber: string;
  userId: string;
}>;

export type OrderCreatedEvent = BaseEvent<
  OrderCreatedEventPayload,
  typeof ROUTING_KEYS.orderEventOrderCreated
>;

export type OrderStatusChangedEventPayload = Readonly<{
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  userId: string;
}>;

export type OrderStatusChangedEvent = BaseEvent<
  OrderStatusChangedEventPayload,
  typeof ROUTING_KEYS.orderEventOrderStatusChanged
>;

export type OrderCancelledEvent = BaseEvent<
  OrderStatusChangedEventPayload,
  typeof ROUTING_KEYS.orderEventOrderCancelled
>;

export type ReserveStockItemPayload = Readonly<{
  quantity: number;
  sku: string;
  variantId: string;
}>;

export type ReserveStockCommandPayload = Readonly<{
  expiresAt?: string;
  expiresInSeconds?: number;
  idempotencyKey: string;
  items: readonly ReserveStockItemPayload[];
  orderId: string;
  reservationId?: string;
  userId: string;
}>;

export type ReserveStockCommand = BaseCommand<
  ReserveStockCommandPayload,
  typeof ROUTING_KEYS.inventoryCommandReserveStock
>;

export type StockReservationReferencePayload = Readonly<
  (
    | {
        orderId: string;
        reservationId?: string;
      }
    | {
        orderId?: string;
        reservationId: string;
      }
  ) & {
    reason?: string;
  }
>;

export type ConfirmStockReservationCommandPayload = StockReservationReferencePayload;

export type ConfirmStockReservationCommand = BaseCommand<
  ConfirmStockReservationCommandPayload,
  typeof ROUTING_KEYS.inventoryCommandConfirmStock
>;

export type ReleaseStockReservationCommandPayload = StockReservationReferencePayload;

export type ReleaseStockReservationCommand = BaseCommand<
  ReleaseStockReservationCommandPayload,
  typeof ROUTING_KEYS.inventoryCommandReleaseStock
>;

export type AdjustStockMode = 'DECREMENT' | 'INCREMENT' | 'SET';

export type AdjustStockCommandPayload = Readonly<{
  idempotencyKey?: string;
  mode: AdjustStockMode;
  productId: string;
  quantity: number;
  reason: string;
  sku: string;
  variantId: string;
}>;

export type AdjustStockCommand = BaseCommand<
  AdjustStockCommandPayload,
  typeof ROUTING_KEYS.inventoryCommandAdjustStock
>;

export type InventoryItemDto = Readonly<{
  availableStock: number;
  createdAt: string;
  id: string;
  isActive: boolean;
  productId: string;
  reservedStock: number;
  sku: string;
  stockOnHand: number;
  updatedAt: string;
  variantId: string;
}>;

export type StockReservationStatus = 'CONFIRMED' | 'EXPIRED' | 'FAILED' | 'PENDING' | 'RELEASED';

export type StockReservationItemDto = Readonly<{
  inventoryItemId?: string;
  quantity: number;
  sku: string;
  variantId: string;
}>;

export type StockReservationDto = Readonly<{
  confirmedAt?: string;
  createdAt: string;
  expiresAt: string;
  failureReason?: string;
  idempotencyKey: string;
  items: readonly StockReservationItemDto[];
  orderId: string;
  releasedAt?: string;
  reservationId: string;
  status: StockReservationStatus;
  updatedAt: string;
  userId: string;
}>;

export type StockMovementType = 'ADJUST' | 'CONFIRM' | 'RELEASE' | 'RESERVE';

export type StockMovementDto = Readonly<{
  createdAt: string;
  id: string;
  inventoryItemId: string;
  quantity: number;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  reservedStockAfter: number;
  reservedStockBefore: number;
  stockOnHandAfter: number;
  stockOnHandBefore: number;
  type: StockMovementType;
}>;

export type StockReservedEventPayload = Readonly<{
  expiresAt: string;
  items: readonly StockReservationItemDto[];
  orderId: string;
  reservationId: string;
  userId: string;
}>;

export type StockReservedEvent = BaseEvent<
  StockReservedEventPayload,
  typeof ROUTING_KEYS.inventoryEventStockReserved
>;

export type StockReservationFailedEventPayload = Readonly<{
  failedItems: readonly ReserveStockItemPayload[];
  orderId: string;
  reason: string;
  reservationId: string;
  userId: string;
}>;

export type StockReservationFailedEvent = BaseEvent<
  StockReservationFailedEventPayload,
  typeof ROUTING_KEYS.inventoryEventStockReservationFailed
>;

export type StockConfirmedEventPayload = Readonly<{
  items: readonly StockReservationItemDto[];
  orderId: string;
  reservationId: string;
  userId: string;
}>;

export type StockConfirmedEvent = BaseEvent<
  StockConfirmedEventPayload,
  typeof ROUTING_KEYS.inventoryEventStockConfirmed
>;

export type StockReleasedEventPayload = Readonly<{
  items: readonly StockReservationItemDto[];
  orderId: string;
  reservationId: string;
  userId: string;
}>;

export type StockReleasedEvent = BaseEvent<
  StockReleasedEventPayload,
  typeof ROUTING_KEYS.inventoryEventStockReleased
>;

export type StockAdjustedEventPayload = Readonly<{
  inventoryItem: InventoryItemDto;
  mode: AdjustStockMode;
  movementId: string;
  productId: string;
  quantity: number;
  reason: string;
  sku: string;
  variantId: string;
}>;

export type StockAdjustedEvent = BaseEvent<
  StockAdjustedEventPayload,
  typeof ROUTING_KEYS.inventoryEventStockAdjusted
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

export type AuthTokensDto = Readonly<{
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  tokenType: 'Bearer';
}>;

export type AuthenticatedUserDto = Readonly<{
  email: string;
  role: 'ADMIN' | 'USER';
  userId: string;
}>;

export type AuthResponseDto = Readonly<{
  tokens: AuthTokensDto;
  user: AuthenticatedUserDto;
}>;

export type UserProfileDto = Readonly<{
  birthDate?: string;
  createdAt: string;
  documentNumber?: string;
  documentType?: string;
  email: string;
  firstName?: string;
  gender?: string;
  id: string;
  lastName?: string;
  phone?: string;
  preferredCategories: readonly string[];
  preferredSizes: readonly string[];
  updatedAt: string;
  userId: string;
}>;

export type AddressDto = Readonly<{
  alias: string;
  apartment?: string;
  city: string;
  country: string;
  createdAt: string;
  id: string;
  isDefault: boolean;
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  references?: string;
  street: string;
  streetNumber: string;
  updatedAt: string;
  userId: string;
}>;

export type GetProfileCommandPayload = Readonly<{
  userId: string;
}>;

export type GetProfileCommand = BaseCommand<
  GetProfileCommandPayload,
  typeof ROUTING_KEYS.userCommandGetProfile
>;

export type UpdateProfileCommandPayload = Readonly<{
  birthDate?: string;
  documentNumber?: string;
  documentType?: string;
  firstName?: string;
  gender?: string;
  lastName?: string;
  phone?: string;
  preferredCategories?: readonly string[];
  preferredSizes?: readonly string[];
  userId: string;
}>;

export type UpdateProfileCommand = BaseCommand<
  UpdateProfileCommandPayload,
  typeof ROUTING_KEYS.userCommandUpdateProfile
>;

export type ListAddressesCommandPayload = Readonly<{
  userId: string;
}>;

export type ListAddressesCommand = BaseCommand<
  ListAddressesCommandPayload,
  typeof ROUTING_KEYS.userCommandListAddresses
>;

export type CreateAddressCommandPayload = Readonly<{
  alias: string;
  apartment?: string;
  city: string;
  country: string;
  isDefault?: boolean;
  phone: string;
  postalCode: string;
  province: string;
  recipientName: string;
  references?: string;
  street: string;
  streetNumber: string;
  userId: string;
}>;

export type CreateAddressCommand = BaseCommand<
  CreateAddressCommandPayload,
  typeof ROUTING_KEYS.userCommandCreateAddress
>;

export type InitialCommand =
  | AddCartItemCommand
  | AdjustStockCommand
  | ClearCartCommand
  | ConfirmStockReservationCommand
  | CreateProductCommand
  | CreateOrderCommand
  | GetCategoriesCommand
  | GetCartCommand
  | GetOrderCommand
  | GetProductCommand
  | GetProfileCommand
  | ListOrdersCommand
  | ListProductsCommand
  | LoginUserCommand
  | ListAddressesCommand
  | RefreshTokenCommand
  | RegisterUserCommand
  | CreateAddressCommand
  | ReleaseStockReservationCommand
  | RemoveCartItemCommand
  | RequestPaymentCommand
  | ReserveStockCommand
  | UpdateCartItemCommand
  | UpdateOrderStatusCommand
  | UpdateProductCommand
  | UpdateProfileCommand;

export type InitialEvent =
  | OrderCancelledEvent
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | ProductCreatedEvent
  | ProductUpdatedEvent
  | StockAdjustedEvent
  | StockConfirmedEvent
  | StockReleasedEvent
  | StockReservationFailedEvent
  | StockReservedEvent
  | UserRegisteredEvent;
