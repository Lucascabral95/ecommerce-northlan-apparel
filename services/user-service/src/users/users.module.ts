import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserMessageHandlerService } from './user-message-handler.service';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  providers: [UserMessageHandlerService, UsersService],
})
export class UsersModule {}
