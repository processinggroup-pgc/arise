import { describe, expect, it } from "vitest";

import { createTenantContext } from "@arise/domain";

import { createProjectForOrganization } from "../project/create-project.js";
import { InMemoryProjectStore } from "../project/in-memory-project-store.js";
import { createWorkItemForProject } from "../intent/create-work-item.js";
import { InMemoryWorkItemStore } from "../intent/in-memory-work-item-store.js";
import {
  AgentRunScopeError,
  createAgentRunForWorkItem,
  RegisteredModelNotFoundError,
} from "./create-agent-run.js";
import { InMemoryAgentRunStore } from "./in-memory-agent-run-store.js";
import { InMemoryModelRegistryStore } from "./in-memory-model-registry-store.js";
import { registerPlatformModel } from "./register-model.js";

const tenantContext = createTenantContext({
  organizationId: "org_123",
  userId: "user_owner",
  correlationId: "corr_agent_run",
});

const operationContext = {
  createId: (() => {
    let counter = 0;
    return () => `generated_${String(++counter)}`;
  })(),
  now: () => new Date("2026-08-03T12:00:00.000Z"),
};

async function seedWorkItem(): Promise<{
  workItemId: string;
  workItemStore: InMemoryWorkItemStore;
}> {
  const projectStore = new InMemoryProjectStore();
  const workItemStore = new InMemoryWorkItemStore();

  const project = await createProjectForOrganization(
    {
      tenantContext,
      name: "Agent Runtime",
    },
    projectStore,
    operationContext,
  );

  const workItem = await createWorkItemForProject(
    {
      tenantContext,
      projectId: project.id,
      title: "Assess onboarding flow",
      type: "feature",
      riskLevel: "medium",
      ownerId: "user_owner",
      problemStatement: "Users struggle to connect repositories during onboarding.",
      targetUser: "Platform engineer",
      desiredBehavior: "Repository connection completes in one guided step.",
      dataClassification: "internal",
      acceptanceCriteria: [
        {
          given: "A project without a repository",
          when: "The user connects GitHub",
          then: "The repository appears as connected",
        },
      ],
    },
    projectStore,
    workItemStore,
    operationContext,
  );

  return {
    workItemId: workItem.id,
    workItemStore,
  };
}

describe("createAgentRunForWorkItem", () => {
  it("creates a tenant-scoped run with validated input contract and model identity", async () => {
    const seeded = await seedWorkItem();
    const modelStore = new InMemoryModelRegistryStore();
    const agentRunStore = new InMemoryAgentRunStore();

    const model = await registerPlatformModel(
      {
        provider: "openai",
        name: "gpt-4.1",
        version: "2026-08-01",
        capabilities: ["text", "tool_use"],
        status: "active",
      },
      modelStore,
      operationContext,
    );

    const result = await createAgentRunForWorkItem(
      {
        tenantContext,
        workItemId: seeded.workItemId,
        agentType: "discovery",
        registeredModelId: model.id,
        inputContract: {
          role: "Discovery Agent",
          outputSchemaRef: "schemas/discovery-output.schema.json",
          allowedTools: ["repository.read_file", "repository.search"],
          budget: {
            maxActions: 25,
            maxCostUsd: 5,
            maxTokens: 32_000,
          },
          contextItems: [
            {
              sourceType: "repository_file",
              sourceRef: "packages/domain/src/index.ts",
              trustLevel: "untrusted",
              contentHash: "hash_1",
              rank: 1,
            },
          ],
        },
      },
      seeded.workItemStore,
      modelStore,
      agentRunStore,
      operationContext,
    );

    expect(result.run.modelName).toBe("gpt-4.1");
    expect(result.run.status).toBe("pending");
    expect(result.inputContract.role).toBe("Discovery Agent");
    expect(await agentRunStore.listAgentRunsForWorkItem(seeded.workItemId)).toHaveLength(1);
  });

  it("blocks runs when the registered model is missing", async () => {
    const seeded = await seedWorkItem();

    await expect(
      createAgentRunForWorkItem(
        {
          tenantContext,
          workItemId: seeded.workItemId,
          agentType: "discovery",
          registeredModelId: "model_missing",
          inputContract: {
            role: "Discovery Agent",
            outputSchemaRef: "schemas/discovery-output.schema.json",
            allowedTools: ["repository.read_file"],
            budget: {
              maxActions: 10,
              maxCostUsd: 2,
              maxTokens: 16_000,
            },
            contextItems: [],
          },
        },
        seeded.workItemStore,
        new InMemoryModelRegistryStore(),
        new InMemoryAgentRunStore(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(RegisteredModelNotFoundError);
  });

  it("blocks runs outside the tenant scope", async () => {
    const seeded = await seedWorkItem();
    const foreignTenant = createTenantContext({
      organizationId: "org_other",
      userId: "user_other",
      correlationId: "corr_foreign",
    });

    await expect(
      createAgentRunForWorkItem(
        {
          tenantContext: foreignTenant,
          workItemId: seeded.workItemId,
          agentType: "discovery",
          registeredModelId: "model_1",
          inputContract: {
            role: "Discovery Agent",
            outputSchemaRef: "schemas/discovery-output.schema.json",
            allowedTools: ["repository.read_file"],
            budget: {
              maxActions: 10,
              maxCostUsd: 2,
              maxTokens: 16_000,
            },
            contextItems: [],
          },
        },
        seeded.workItemStore,
        new InMemoryModelRegistryStore(),
        new InMemoryAgentRunStore(),
        operationContext,
      ),
    ).rejects.toBeInstanceOf(AgentRunScopeError);
  });
});
