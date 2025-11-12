import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { ProjectSchemasModule } from '../project-schemas/project-schemas.module';

@Module({
  imports: [forwardRef(() => ProjectSchemasModule)],
  providers: [ProjectsService, ProjectsResolver],
  exports: [ProjectsService],
})
export class ProjectsModule {}


