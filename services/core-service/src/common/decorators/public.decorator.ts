// services/core-service/src/common/decorators/public.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/api-key.guard';

/**
 * Marks a route as public (bypasses API Key guard)
 * Use for health checks or public endpoints
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);