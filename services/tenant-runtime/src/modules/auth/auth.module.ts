import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TenantAuthResolver } from './tenant-auth.resolver';
import { TenantAuthService } from './tenant-auth.service';
import { TenantUsersRepository } from './repositories/tenant-users.repository';
import { JwtStrategy } from '../../core/auth/jwt.strategy';
import { TenantDbProvider } from '../../core/db-context/tenant-db.provider';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    TenantAuthResolver,
    TenantAuthService,
    TenantUsersRepository,
    JwtStrategy,
    TenantDbProvider,
  ],
  exports: [TenantAuthService],
})
export class AuthModule {}
