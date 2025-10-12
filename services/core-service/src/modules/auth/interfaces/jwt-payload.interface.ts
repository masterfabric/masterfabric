export interface JwtPayload {
  sub: string;           // userId
  email: string;
  organizationId: string; // CRITICAL for tenant isolation
}
