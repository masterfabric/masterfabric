import { Module, forwardRef } from '@nestjs/common';
import { ProjectSchemasService } from './project-schemas.service';
import { ProjectSchemasResolver } from './project-schemas.resolver';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ProjectSchemasService, ProjectSchemasResolver],
  exports: [ProjectSchemasService],
})
export class ProjectSchemasModule {}

