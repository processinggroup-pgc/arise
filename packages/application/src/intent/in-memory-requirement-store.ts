import type { Requirement, RequirementAcceptanceCriterion } from "@arise/domain";

import type { RequirementStore } from "./requirement-store.js";

export class InMemoryRequirementStore implements RequirementStore {
  private readonly requirements = new Map<string, Requirement>();
  private readonly acceptanceCriteria = new Map<string, RequirementAcceptanceCriterion>();

  saveRequirement(requirement: Requirement): Promise<void> {
    this.requirements.set(requirement.id, requirement);
    return Promise.resolve();
  }

  findRequirementById(requirementId: string): Promise<Requirement | undefined> {
    return Promise.resolve(this.requirements.get(requirementId));
  }

  listRequirementsForWorkItemLineage(workItemLineageId: string): Promise<Requirement[]> {
    return Promise.resolve(
      [...this.requirements.values()]
        .filter((requirement) => requirement.workItemLineageId === workItemLineageId)
        .sort((left, right) => left.statement.localeCompare(right.statement)),
    );
  }

  saveAcceptanceCriterion(criterion: RequirementAcceptanceCriterion): Promise<void> {
    this.acceptanceCriteria.set(criterion.id, criterion);
    return Promise.resolve();
  }

  listAcceptanceCriteriaForRequirement(
    requirementId: string,
  ): Promise<RequirementAcceptanceCriterion[]> {
    return Promise.resolve(
      [...this.acceptanceCriteria.values()]
        .filter((criterion) => criterion.requirementId === requirementId)
        .sort((left, right) => left.automatedTestRef.localeCompare(right.automatedTestRef)),
    );
  }

  findAcceptanceCriterionByTestRef(
    organizationId: string,
    automatedTestRef: string,
  ): Promise<RequirementAcceptanceCriterion | undefined> {
    return Promise.resolve(
      [...this.acceptanceCriteria.values()].find(
        (criterion) =>
          criterion.organizationId === organizationId &&
          criterion.automatedTestRef === automatedTestRef,
      ),
    );
  }
}
