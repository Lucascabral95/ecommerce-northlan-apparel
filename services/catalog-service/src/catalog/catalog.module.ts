import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogMessageHandlerService } from './catalog-message-handler.service';
import { CatalogService } from './catalog.service';

@Module({
  imports: [PrismaModule],
  providers: [CatalogMessageHandlerService, CatalogService],
})
export class CatalogModule {}
