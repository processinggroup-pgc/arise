import type { RegisteredModel } from "@arise/domain";

import type { ModelRegistryStore } from "./model-registry-store.js";

export class InMemoryModelRegistryStore implements ModelRegistryStore {
  private readonly models = new Map<string, RegisteredModel>();

  saveRegisteredModel(model: RegisteredModel): Promise<void> {
    this.models.set(model.id, model);
    return Promise.resolve();
  }

  findRegisteredModelById(id: string): Promise<RegisteredModel | undefined> {
    return Promise.resolve(this.models.get(id));
  }

  listRegisteredModels(organizationId: string): Promise<RegisteredModel[]> {
    return Promise.resolve(
      [...this.models.values()].filter(
        (model) => model.organizationId === null || model.organizationId === organizationId,
      ),
    );
  }
}
