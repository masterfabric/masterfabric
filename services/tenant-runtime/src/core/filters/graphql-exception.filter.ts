import { Catch, ArgumentsHost } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { ConflictException } from '@nestjs/common';

@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    
    // Transform PostgreSQL errors
    if (exception.code === '23505') {
      return new ConflictException('Duplicate entry');
    }
    
    if (exception.code === '23503') {
      return new ConflictException('Referenced record not found');
    }
    
    // Return the original exception for other cases
    return exception;
  }
}
