import type { Deployment } from "@arise/domain";

export interface DeploymentStore {
  saveDeployment(deployment: Deployment): Promise<void>;
  findDeploymentById(id: string): Promise<Deployment | undefined>;
  findDeploymentByExternalId(
    organizationId: string,
    provider: string,
    externalId: string,
  ): Promise<Deployment | undefined>;
  listDeploymentsForWorkItem(workItemId: string): Promise<Deployment[]>;
}
