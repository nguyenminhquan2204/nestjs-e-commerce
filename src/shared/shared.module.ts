import { Module, Global } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { HashingService } from './services/hashing.service';
import { TokenService } from './services/token.service';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './guards/access-token.guard';
import { APIKeyGuard } from './guards/api-key.guard';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from './guards/authentication.guard';
import { ShareUserRepository } from './repositories/share-user.repo';

const sharedServices = [PrismaService, HashingService, TokenService, ShareUserRepository];
@Global()
@Module({
   providers: [...sharedServices, AccessTokenGuard, APIKeyGuard, {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
   }],
   exports: [...sharedServices, AccessTokenGuard, APIKeyGuard],
   imports: [JwtModule]
})
export class SharedModule {}
