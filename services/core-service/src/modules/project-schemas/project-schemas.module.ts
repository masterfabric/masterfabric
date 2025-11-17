import { Module, forwardRef } from '@nestjs/common';
import { ProjectSchemasService } from './project-schemas.service';
import { ProjectSchemasResolver } from './project-schemas.resolver';
import { ProjectSchemasDocsService } from './project-schemas-docs.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ProjectSchemasService, ProjectSchemasResolver, ProjectSchemasDocsService],
  exports: [ProjectSchemasService, ProjectSchemasDocsService],
})
export class ProjectSchemasModule {}

