import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class OrganizationStatus {
  @Field()
  status: string;

  @Field({ nullable: true })
  message?: string;
}

