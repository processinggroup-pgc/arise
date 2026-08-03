import type { Project } from "@arise/domain";

import type { ProjectStore } from "./project-store.js";

export class InMemoryProjectStore implements ProjectStore {
  private readonly projects = new Map<string, Project>();

  findProjectById(projectId: string): Promise<Project | undefined> {
    return Promise.resolve(this.projects.get(projectId));
  }

  saveProject(project: Project): Promise<void> {
    this.projects.set(project.id, project);
    return Promise.resolve();
  }

  listProjectsForOrganization(organizationId: string): Promise<Project[]> {
    return Promise.resolve(
      [...this.projects.values()].filter((project) => project.organizationId === organizationId),
    );
  }
}
