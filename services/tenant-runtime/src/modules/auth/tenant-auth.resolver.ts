import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { TenantAuthService } from './tenant-auth.service';
import { TenantRegisterDto } from './dto/tenant-register.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { TenantAuthResponse } from './dto/tenant-auth-response.dto';

@Resolver()
export class TenantAuthResolver {
  constructor(private readonly tenantAuthService: TenantAuthService) {}

  @Mutation(() => TenantAuthResponse)
  async tenantRegister(@Args('input') input: TenantRegisterDto): Promise<TenantAuthResponse> {
    return this.tenantAuthService.register(input);
  }

  @Mutation(() => TenantAuthResponse)
  async tenantLogin(@Args('input') input: TenantLoginDto): Promise<TenantAuthResponse> {
    return this.tenantAuthService.login(input);
  }
}
