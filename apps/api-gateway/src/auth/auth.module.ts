import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGatewayService } from './auth.gateway-service';

@Module({
  controllers: [AuthController],
  providers: [AuthGatewayService],
})
export class AuthModule {}
