import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantUsersRepository } from './repositories/tenant-users.repository';
import { TenantRegisterDto } from './dto/tenant-register.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { TenantAuthResponse } from './dto/tenant-auth-response.dto';

@Injectable()
export class TenantAuthService {
  constructor(
    private tenantUsersRepository: TenantUsersRepository,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: TenantRegisterDto): Promise<TenantAuthResponse> {
    const { email, password } = registerDto;

    // Hash password
    const passwordHash = await this.tenantUsersRepository.hashPassword(password);

    // Create user
    const user = await this.tenantUsersRepository.create(email, passwordHash);

    // Generate JWT for tenant user
    const payload = {
      sub: (user as any).id,
      email: (user as any).email,
      organizationId: (user as any).organization_id,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: (user as any).id,
        email: (user as any).email,
        organizationId: (user as any).organization_id,
        createdAt: (user as any).created_at,
      },
    };
  }

  async login(loginDto: TenantLoginDto): Promise<TenantAuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.tenantUsersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.tenantUsersRepository.verifyPassword(
      password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT for tenant user
    const payload = {
      sub: (user as any).id,
      email: (user as any).email,
      organizationId: (user as any).organization_id,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: (user as any).id,
        email: (user as any).email,
        organizationId: (user as any).organization_id,
        createdAt: (user as any).created_at,
      },
    };
  }
}
