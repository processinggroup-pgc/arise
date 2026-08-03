import type { Deployment } from "@arise/domain";

import type { DeploymentStore } from "./deployment-store.js";

export class InMemoryDeploymentStore implements DeploymentStore {
  private readonly deployments = new Map<string, Deployment>();

  saveDeployment(deployment: Deployment): Promise<void> {
    this.deployments.set(deployment.id, deployment);
    return Promise.resolve();
  }

  findDeploymentById(id: string): Promise<Deployment | undefined> {
    return Promise.resolve(this.deployments.get(id));
  }

  findDeploymentByExternalId(
    organizationId: string,
    provider: string,
    externalId: string,
  ): Promise<Deployment | undefined> {
    return Promise.resolve(
      [...this.deployments.values()].find(
        (deployment) =>
          deployment.organizationId === organizationId &&
          deployment.provider === provider &&
          deployment.externalId === externalId,
      ),
    );
  }

  listDeploymentsForWorkItem(workItemId: string): Promise<Deployment[]> {
    return Promise.resolve(
      [...this.deployments.values()]
        .filter((deployment) => deployment.workItemId === workItemId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    );
  }
}
