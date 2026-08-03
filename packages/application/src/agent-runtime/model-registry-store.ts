import type { RegisteredModel } from "@arise/domain";

export interface ModelRegistryStore {
  saveRegisteredModel(model: RegisteredModel): Promise<void>;
  findRegisteredModelById(id: string): Promise<RegisteredModel | undefined>;
  listRegisteredModels(organizationId: string): Promise<RegisteredModel[]>;
}
