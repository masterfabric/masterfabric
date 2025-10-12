export class AuthResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
    organizationSlug: string;
  };
}
