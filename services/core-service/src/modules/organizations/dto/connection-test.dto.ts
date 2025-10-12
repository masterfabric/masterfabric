import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ConnectionTestResult {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  error?: string;

  @Field({ nullable: true })
  responseTime?: number;
}

