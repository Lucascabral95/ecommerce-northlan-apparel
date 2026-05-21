import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AUTH_REPOSITORY } from './auth.repository';
import { AuthMessageHandlerService } from './auth-message-handler.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { PrismaAuthRepository } from './prisma-auth.repository';
import { TokenService } from './token.service';
import { UserRegisteredPublisher } from './user-registered.publisher';

@Module({
  imports: [PrismaModule],
  providers: [
    AuthMessageHandlerService,
    AuthService,
    PasswordService,
    TokenService,
    UserRegisteredPublisher,
    {
      provide: AUTH_REPOSITORY,
      useClass: PrismaAuthRepository,
    },
  ],
})
export class AuthModule {}
