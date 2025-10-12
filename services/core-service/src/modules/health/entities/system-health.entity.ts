import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class ServiceHealth {
  @Field()
  name: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  responseTime?: number;

  @Field({ nullable: true })
  lastChecked?: string;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType()
export class SystemHealth {
  @Field()
  overallStatus: string;

  @Field(() => [ServiceHealth])
  services: ServiceHealth[];

  @Field()
  timestamp: string;
}
