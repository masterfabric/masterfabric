import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { SchemaService } from './schema.service';
import { CreateSchemaDto } from './dto/create-schema.dto';

@Resolver()
export class SchemaResolver {
  constructor(private readonly schemaService: SchemaService) {}

  @Mutation(() => Boolean)
  async createTable(@Args('input') input: CreateSchemaDto): Promise<boolean> {
    await this.schemaService.createTable(input);
    return true;
  }

  @Query(() => String)
  async getSchemaDefinitions(): Promise<string> {
    // This would return the current schema definitions
    // For now, return a simple message
    return 'Schema definitions retrieved';
  }
}
