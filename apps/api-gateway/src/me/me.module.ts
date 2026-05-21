import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../security/jwt-auth.guard';
import { MeController } from './me.controller';
import { MeGatewayService } from './me.gateway-service';

@Module({
  controllers: [MeController],
  providers: [JwtAuthGuard, MeGatewayService],
})
export class MeModule {}
