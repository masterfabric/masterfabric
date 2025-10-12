import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TenantUsersService } from './tenant-users.service';
import { TenantUsersResolver } from './tenant-users.resolver';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [TenantUsersService, TenantUsersResolver],
  exports: [TenantUsersService],
})
export class TenantUsersModule {}

