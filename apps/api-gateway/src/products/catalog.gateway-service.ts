import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CategoryDto,
  CreateProductCommandPayload,
  EXCHANGE_NAMES,
  ListProductsCommandPayload,
  ProductDto,
  ProductListResponseDto,
  ROUTING_KEYS,
  UpdateProductCommandPayload,
} from '@northlane/contracts';
import { RabbitMqClient } from '@northlane/shared';
import { createGatewayCommandEnvelope } from '../messaging/command-envelope';
import { ListProductsQueryDto } from './products.dto';

type CatalogRoutingKey =
  | typeof ROUTING_KEYS.catalogCommandCreateProduct
  | typeof ROUTING_KEYS.catalogCommandGetCategories
  | typeof ROUTING_KEYS.catalogCommandGetProduct
  | typeof ROUTING_KEYS.catalogCommandListProducts
  | typeof ROUTING_KEYS.catalogCommandUpdateProduct;

@Injectable()
export class CatalogGatewayService {
  constructor(private readonly rabbitMqClient: RabbitMqClient) {}

  listProducts(
    query: ListProductsQueryDto,
    correlationId: string,
    options: { includeInactive?: boolean } = {},
  ): Promise<ProductListResponseDto> {
    return this.requestCatalog<ProductListResponseDto, ListProductsCommandPayload>(
      ROUTING_KEYS.catalogCommandListProducts,
      {
        brand: normalizeString(query.brand),
        categorySlug: normalizeString(query.categorySlug),
        color: normalizeString(query.color),
        genderTarget: query.genderTarget,
        includeInactive: options.includeInactive,
        isFeatured: parseOptionalBoolean(query.isFeatured, 'isFeatured'),
        maxPrice: parseOptionalNumber(query.maxPrice, 'maxPrice'),
        minPrice: parseOptionalNumber(query.minPrice, 'minPrice'),
        page: parseOptionalInteger(query.page, 'page'),
        pageSize: parseOptionalInteger(query.pageSize, 'pageSize'),
        productType: query.productType,
        search: normalizeString(query.search),
        size: normalizeString(query.size),
        sortBy: query.sortBy,
      },
      correlationId,
    );
  }

  getProductBySlug(slug: string, correlationId: string): Promise<ProductDto> {
    return this.requestCatalog(ROUTING_KEYS.catalogCommandGetProduct, { slug }, correlationId);
  }

  listCategories(correlationId: string, includeInactive = false): Promise<readonly CategoryDto[]> {
    return this.requestCatalog(ROUTING_KEYS.catalogCommandGetCategories, { includeInactive }, correlationId);
  }

  createProduct(payload: CreateProductCommandPayload, correlationId: string): Promise<ProductDto> {
    return this.requestCatalog(ROUTING_KEYS.catalogCommandCreateProduct, payload, correlationId);
  }

  updateProduct(id: string, payload: Omit<UpdateProductCommandPayload, 'id'>, correlationId: string): Promise<ProductDto> {
    return this.requestCatalog(ROUTING_KEYS.catalogCommandUpdateProduct, { ...payload, id }, correlationId);
  }

  private async requestCatalog<TResponse, TPayload>(
    routingKey: CatalogRoutingKey,
    payload: TPayload,
    correlationId: string,
  ): Promise<TResponse> {
    try {
      return await this.rabbitMqClient.request<TResponse>({
        correlationId,
        exchange: EXCHANGE_NAMES.catalog,
        message: createGatewayCommandEnvelope(routingKey, payload, correlationId),
        routingKey,
      });
    } catch (error) {
      throw mapRpcError(error);
    }
  }
}

function normalizeString(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function parseOptionalBoolean(value: string | undefined, fieldName: string): boolean | undefined {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  throw new BadRequestException(`${fieldName} must be "true" or "false".`);
}

function parseOptionalInteger(value: string | undefined, fieldName: string): number | undefined {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new BadRequestException(`${fieldName} must be a positive integer.`);
  }

  return parsedValue;
}

function parseOptionalNumber(value: string | undefined, fieldName: string): number | undefined {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new BadRequestException(`${fieldName} must be a number greater than or equal to zero.`);
  }

  return parsedValue;
}

function mapRpcError(error: unknown): Error {
  const candidate = error as Error & { code?: unknown };
  if (candidate.code === 'BAD_REQUEST') {
    return new BadRequestException(candidate.message);
  }

  if (candidate.code === 'CONFLICT') {
    return new ConflictException(candidate.message);
  }

  if (candidate.code === 'NOT_FOUND') {
    return new NotFoundException(candidate.message);
  }

  return candidate instanceof Error ? candidate : new Error('Catalog service request failed.');
}
