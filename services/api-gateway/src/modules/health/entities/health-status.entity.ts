import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class HealthStatus {
  @Field()
  service: string;

  @Field()
  status: string;

  @Field()
  message: string;

  @Field()
  timestamp: string;

  @Field({ nullable: true })
  responseTime?: number;
}

@ObjectType()
export class SystemHealth {
  @Field()
  overall: string;

  @Field(() => [HealthStatus])
  services: HealthStatus[];

  @Field()
  timestamp: string;
}

