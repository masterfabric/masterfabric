// services/tenant-runtime/src/core/decorators/public.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/api-key.guard';

/**
 * Decorator to mark routes as public (bypass API Key authentication)
 * Usage: @Public() on resolvers or controllers
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

