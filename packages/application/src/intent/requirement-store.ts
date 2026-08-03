import type { Requirement, RequirementAcceptanceCriterion } from "@arise/domain";

export interface RequirementStore {
  saveRequirement(requirement: Requirement): Promise<void>;
  findRequirementById(requirementId: string): Promise<Requirement | undefined>;
  listRequirementsForWorkItemLineage(workItemLineageId: string): Promise<Requirement[]>;
  saveAcceptanceCriterion(criterion: RequirementAcceptanceCriterion): Promise<void>;
  listAcceptanceCriteriaForRequirement(
    requirementId: string,
  ): Promise<RequirementAcceptanceCriterion[]>;
  findAcceptanceCriterionByTestRef(
    organizationId: string,
    automatedTestRef: string,
  ): Promise<RequirementAcceptanceCriterion | undefined>;
}
