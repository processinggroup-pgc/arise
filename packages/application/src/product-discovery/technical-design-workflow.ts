import {
  advanceInitiativeState,
  mergeTechnicalDesignBundle,
  type CohortDiscoveryBundle,
  type InitiativeState,
  type TechnicalDesignBundle,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { InitiativeScopeError } from "./create-initiative-with-problem.js";
import type { CohortDiscoveryStore } from "./cohort-discovery-store.js";
import { getOrCreateTechnicalDesignBundle } from "./in-memory-technical-design-store.js";
import type { InitiativeStore } from "./product-discovery-store.js";
import { InitiativeWorkflowError } from "./run-market-research-for-initiative.js";
import type { TechnicalDesignGenerator } from "./rule-based-technical-design-generator.js";
import type { TechnicalDesignStore } from "./technical-design-store.js";

export interface TechnicalDesignCommand {
  tenantContext: TenantContext;
  initiativeId: string;
}

async function loadInitiative(
  command: TechnicalDesignCommand,
  initiativeStore: InitiativeStore,
  expectedState?: InitiativeState,
) {
  const initiative = await initiativeStore.findInitiativeById(command.initiativeId);
  if (initiative === undefined) {
    throw new InitiativeWorkflowError("Initiative was not found");
  }
  if (initiative.organizationId !== command.tenantContext.organizationId) {
    throw new InitiativeScopeError("Initiative is outside the tenant scope");
  }
  if (expectedState !== undefined && initiative.state !== expectedState) {
    throw new InitiativeWorkflowError(`Initiative must be in ${expectedState} state`);
  }
  return initiative;
}

function buildBrdContext(cohortBundle: CohortDiscoveryBundle): string {
  if (cohortBundle.brd !== undefined) {
    return cohortBundle.brd.fullDocument;
  }

  return JSON.stringify({
    persona: cohortBundle.persona,
    userFlow: cohortBundle.userFlow,
    storyMap: cohortBundle.storyMap,
    features: cohortBundle.flowAlignedFeatures,
    mvpScope: cohortBundle.mvpScope,
  });
}

function buildDesignContext(bundle: TechnicalDesignBundle): string {
  return JSON.stringify({
    architecture: bundle.architecture,
    techStack: bundle.techStack,
    dataModel: bundle.dataModel,
    gapAnalysis: bundle.gapAnalysis,
    deeperGapCheck: bundle.deeperGapCheck,
  });
}

async function requireCohortBrd(
  cohortStore: CohortDiscoveryStore,
  initiativeId: string,
): Promise<CohortDiscoveryBundle> {
  const cohortBundle = await cohortStore.findCohortDiscoveryByInitiativeId(initiativeId);
  if (cohortBundle?.brd === undefined) {
    throw new InitiativeWorkflowError("Step 3 BRD must be completed before technical design");
  }
  return cohortBundle;
}

export async function generateArchitectureForInitiative(
  command: TechnicalDesignCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  technicalStore: TechnicalDesignStore,
  operationContext: IdentityOperationContext,
  generator: TechnicalDesignGenerator,
) {
  const initiative = await loadInitiative(command, initiativeStore, "design_approved");
  const cohortBundle = await requireCohortBrd(cohortStore, command.initiativeId);
  const brdContext = buildBrdContext(cohortBundle);

  const architecture = await generator.generateArchitecture(brdContext);
  const bundle = await getOrCreateTechnicalDesignBundle(
    technicalStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );
  const updatedBundle = mergeTechnicalDesignBundle(bundle, { architecture }, operationContext.now());
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "architecture_complete",
    operationContext.now(),
  );

  await technicalStore.saveTechnicalDesignBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function generateTechStackForInitiative(
  command: TechnicalDesignCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  technicalStore: TechnicalDesignStore,
  operationContext: IdentityOperationContext,
  generator: TechnicalDesignGenerator,
) {
  const initiative = await loadInitiative(command, initiativeStore, "architecture_complete");
  const cohortBundle = await requireCohortBrd(cohortStore, command.initiativeId);
  const brdContext = buildBrdContext(cohortBundle);

  const techStack = await generator.generateTechStack(brdContext);
  const bundle = await technicalStore.findTechnicalDesignByInitiativeId(command.initiativeId);
  if (bundle === undefined) {
    throw new InitiativeWorkflowError("Architecture must be completed first");
  }

  const updatedBundle = mergeTechnicalDesignBundle(bundle, { techStack }, operationContext.now());
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "stack_selected",
    operationContext.now(),
  );

  await technicalStore.saveTechnicalDesignBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function generateDataModelForInitiative(
  command: TechnicalDesignCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  technicalStore: TechnicalDesignStore,
  operationContext: IdentityOperationContext,
  generator: TechnicalDesignGenerator,
) {
  const initiative = await loadInitiative(command, initiativeStore, "stack_selected");
  const cohortBundle = await requireCohortBrd(cohortStore, command.initiativeId);
  const brdContext = buildBrdContext(cohortBundle);

  const dataModel = await generator.generateDataModel(brdContext);
  const bundle = await technicalStore.findTechnicalDesignByInitiativeId(command.initiativeId);
  if (bundle === undefined) {
    throw new InitiativeWorkflowError("Tech stack must be selected first");
  }

  const updatedBundle = mergeTechnicalDesignBundle(bundle, { dataModel }, operationContext.now());
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "data_model_complete",
    operationContext.now(),
  );

  await technicalStore.saveTechnicalDesignBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function generateGapAnalysisForInitiative(
  command: TechnicalDesignCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  technicalStore: TechnicalDesignStore,
  operationContext: IdentityOperationContext,
  generator: TechnicalDesignGenerator,
) {
  const initiative = await loadInitiative(command, initiativeStore, "data_model_complete");
  const cohortBundle = await requireCohortBrd(cohortStore, command.initiativeId);
  const brdContext = buildBrdContext(cohortBundle);
  const bundle = await technicalStore.findTechnicalDesignByInitiativeId(command.initiativeId);
  if (bundle === undefined || bundle.dataModel === undefined) {
    throw new InitiativeWorkflowError("Data model must be completed first");
  }

  const designContext = buildDesignContext(bundle);
  const gapAnalysis = await generator.generateGapAnalysis(brdContext, designContext);
  const deeperGapCheck = await generator.generateDeeperGapCheck(designContext);

  const updatedBundle = mergeTechnicalDesignBundle(
    bundle,
    { gapAnalysis, deeperGapCheck },
    operationContext.now(),
  );
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "gap_analysis_complete",
    operationContext.now(),
  );

  await technicalStore.saveTechnicalDesignBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function approveTechnicalDesignForInitiative(
  command: TechnicalDesignCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  technicalStore: TechnicalDesignStore,
  operationContext: IdentityOperationContext,
  generator: TechnicalDesignGenerator,
  sessionNotesStep4?: string,
) {
  const initiative = await loadInitiative(command, initiativeStore, "gap_analysis_complete");
  const cohortBundle = await requireCohortBrd(cohortStore, command.initiativeId);
  const brdContext = buildBrdContext(cohortBundle);
  const bundle = await technicalStore.findTechnicalDesignByInitiativeId(command.initiativeId);
  if (bundle?.gapAnalysis === undefined) {
    throw new InitiativeWorkflowError("Gap analysis must be completed first");
  }

  const systemValidation = await generator.validateSystem(brdContext, buildDesignContext(bundle));
  const updatedBundle = mergeTechnicalDesignBundle(
    bundle,
    {
      systemValidation,
      ...(sessionNotesStep4 !== undefined
        ? { sessionNotesStep4: { notes: sessionNotesStep4, updatedAt: operationContext.now() } }
        : {}),
    },
    operationContext.now(),
  );
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "technical_design_approved",
    operationContext.now(),
  );

  await technicalStore.saveTechnicalDesignBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}
