import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SyncPaymentStatusRequestDto {
  @ApiPropertyOptional({
    description: 'Order id associated with the payment.',
    example: 'f0a9c3b2-6d1e-4f8a-9b20-7c3d2e1f4a68',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Provider payment id returned by Mercado Pago after the checkout redirect.',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  providerPaymentId?: string;
}
