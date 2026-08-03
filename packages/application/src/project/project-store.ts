import type { Project } from "@arise/domain";

export interface ProjectStore {
  findProjectById(projectId: string): Promise<Project | undefined>;
  saveProject(project: Project): Promise<void>;
  listProjectsForOrganization(organizationId: string): Promise<Project[]>;
}
