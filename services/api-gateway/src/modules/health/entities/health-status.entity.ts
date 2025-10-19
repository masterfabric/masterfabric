import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class HealthStatus {
  @Field()
  name: string;

  @Field()
  status: string;

  @Field()
  message: string;

  @Field()
  lastChecked: string;

  @Field({ nullable: true })
  responseTime?: number;
}

@ObjectType()
export class SystemHealth {
  @Field()
  overallStatus: string;

  @Field(() => [HealthStatus])
  services: HealthStatus[];

  @Field()
  timestamp: string;
}

