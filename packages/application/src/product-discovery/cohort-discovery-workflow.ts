import {
  advanceInitiativeState,
  createProblemAlignment,
  findFramingOption,
  mergeCohortDiscoveryBundle,
  type BusinessConcept,
  type CohortDiscoveryBundle,
  type InitiativeState,
  type MarketResearchDossier,
  type ProblemBrief,
  type StoryMap,
  type TenantContext,
} from "@arise/domain";

import type { IdentityOperationContext } from "../identity/identity-store.js";
import { InitiativeScopeError } from "./create-initiative-with-problem.js";
import type { CohortDiscoveryStore } from "./cohort-discovery-store.js";
import { getOrCreateCohortDiscoveryBundle } from "./in-memory-cohort-discovery-store.js";
import type {
  InitiativeStore,
  MarketResearchStore,
  ProblemAlignmentStore,
  ProblemBriefStore,
} from "./product-discovery-store.js";
import { InitiativeWorkflowError } from "./run-market-research-for-initiative.js";
import type { CohortGenerator } from "./rule-based-cohort-generator.js";

export interface CohortWorkflowCommand {
  tenantContext: TenantContext;
  initiativeId: string;
}

async function loadInitiativeContext(
  command: CohortWorkflowCommand,
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

function buildContextBlock(problemBrief: ProblemBrief, dossier?: MarketResearchDossier): string {
  return [
    "Problem:",
    problemBrief.rawProblemDescription,
    "",
    "Target audience:",
    problemBrief.targetAudience,
    "",
    "Pain points:",
    ...problemBrief.painPoints.map((point) => `- ${point}`),
    "",
    "Desired outcome:",
    problemBrief.desiredOutcome,
    "",
    ...(dossier !== undefined ? ["Research summary:", dossier.summary, ""] : []),
  ].join("\n");
}

function buildBusinessPlanContext(problemBrief: ProblemBrief, bundle: CohortDiscoveryBundle): string {
  const parts = [buildContextBlock(problemBrief)];
  if (bundle.businessConcept !== undefined) {
    parts.push("Business concept:", JSON.stringify(bundle.businessConcept));
  }
  if (bundle.businessCase !== undefined) {
    parts.push("Business case:", JSON.stringify(bundle.businessCase));
  }
  if (bundle.mvpScope !== undefined) {
    parts.push("MVP scope:", JSON.stringify(bundle.mvpScope));
  }
  return parts.join("\n\n");
}

export interface DualAiSecondaryResult {
  dossier: import("@arise/domain").MarketResearchDossier;
  source: "openai" | "rule_based";
  warning?: string;
}

export async function saveDualAiComparisonForInitiative(
  command: CohortWorkflowCommand,
  initiativeStore: InitiativeStore,
  problemBriefStore: ProblemBriefStore,
  marketResearchStore: MarketResearchStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generateSecondary: (
    input: import("@arise/domain").GenerateMarketResearchInput,
    metadata: import("@arise/domain").GenerateMarketResearchMetadata,
  ) => Promise<DualAiSecondaryResult>,
): Promise<{ bundle: CohortDiscoveryBundle; warning?: string }> {
  const initiative = await loadInitiativeContext(command, initiativeStore, "research_complete");
  const problemBrief = await problemBriefStore.findProblemBriefByInitiativeId(command.initiativeId);
  const dossier = await marketResearchStore.findMarketResearchByInitiativeId(command.initiativeId);
  if (problemBrief === undefined || dossier === undefined) {
    throw new InitiativeWorkflowError("Problem brief and research dossier are required");
  }

  const researchInput = {
    initiativeId: initiative.id,
    organizationId: initiative.organizationId,
    rawProblemDescription: problemBrief.rawProblemDescription,
    targetAudience: problemBrief.targetAudience,
    painPoints: problemBrief.painPoints,
    businessContext: problemBrief.businessContext,
    desiredOutcome: problemBrief.desiredOutcome,
  };
  const researchMetadata = {
    id: operationContext.createId(),
    generatedAt: operationContext.now(),
    createFramingId: (index: number) => operationContext.createId() + `_compare_${String(index + 1)}`,
  };

  const secondary = await generateSecondary(researchInput, researchMetadata);
  const secondaryDossier = secondary.dossier;

  const bundle = await getOrCreateCohortDiscoveryBundle(
    cohortStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );

  const updated = mergeCohortDiscoveryBundle(
    bundle,
    {
      dualAiComparison: {
        claudeSummary: dossier.summary,
        openAiSummary: secondaryDossier.summary,
        keyDifferences: [
          `Claude trends: ${dossier.marketTrends.slice(0, 2).join("; ")}`,
          `ChatGPT trends: ${secondaryDossier.marketTrends.slice(0, 2).join("; ")}`,
          `Claude top framing: ${dossier.framingOptions[0]?.title ?? "n/a"}`,
          `ChatGPT top framing: ${secondaryDossier.framingOptions[0]?.title ?? "n/a"}`,
        ],
        secondarySource: secondary.source,
        ...(secondary.warning !== undefined ? { secondaryWarning: secondary.warning } : {}),
      },
    },
    operationContext.now(),
  );
  await cohortStore.saveCohortDiscoveryBundle(updated);
  return {
    bundle: updated,
    ...(secondary.warning !== undefined ? { warning: secondary.warning } : {}),
  };
}

export async function runStressTestForInitiative(
  command: CohortWorkflowCommand,
  initiativeStore: InitiativeStore,
  problemBriefStore: ProblemBriefStore,
  marketResearchStore: MarketResearchStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
): Promise<CohortDiscoveryBundle> {
  const initiative = await loadInitiativeContext(command, initiativeStore, "research_complete");
  const problemBrief = await problemBriefStore.findProblemBriefByInitiativeId(command.initiativeId);
  const dossier = await marketResearchStore.findMarketResearchByInitiativeId(command.initiativeId);
  if (problemBrief === undefined || dossier === undefined) {
    throw new InitiativeWorkflowError("Problem brief and research dossier are required");
  }

  const result = await generator.generateStressTest(buildContextBlock(problemBrief, dossier));

  const bundle = await getOrCreateCohortDiscoveryBundle(
    cohortStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );
  const updated = mergeCohortDiscoveryBundle(
    bundle,
    { stressTest: { ...result, generatedAt: operationContext.now() } },
    operationContext.now(),
  );
  await cohortStore.saveCohortDiscoveryBundle(updated);
  return updated;
}

export interface FinalizeConceptCommand extends CohortWorkflowCommand {
  selectedFramingId: string;
  userElaboration?: string;
  businessConcept: BusinessConcept;
  sessionNotesWeek1?: string;
}

export async function finalizeConceptForInitiative(
  command: FinalizeConceptCommand,
  initiativeStore: InitiativeStore,
  marketResearchStore: MarketResearchStore,
  problemAlignmentStore: ProblemAlignmentStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "research_complete");
  const dossier = await marketResearchStore.findMarketResearchByInitiativeId(command.initiativeId);
  if (dossier === undefined) {
    throw new InitiativeWorkflowError("Market research dossier was not found");
  }

  const selectedFraming = findFramingOption(dossier, command.selectedFramingId);
  if (selectedFraming === undefined) {
    throw new InitiativeWorkflowError("Selected problem framing was not found");
  }

  const alignment = createProblemAlignment(
    {
      initiativeId: initiative.id,
      organizationId: initiative.organizationId,
      selectedFramingId: selectedFraming.id,
      ...(command.userElaboration !== undefined ? { userElaboration: command.userElaboration } : {}),
    },
    { id: operationContext.createId(), alignedAt: operationContext.now() },
  );

  const bundle = await getOrCreateCohortDiscoveryBundle(
    cohortStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );
  const updatedBundle = mergeCohortDiscoveryBundle(
    bundle,
    {
      businessConcept: command.businessConcept,
      ...(command.sessionNotesWeek1 !== undefined
        ? { sessionNotesWeek1: { notes: command.sessionNotesWeek1, updatedAt: operationContext.now() } }
        : {}),
    },
    operationContext.now(),
  );

  const updatedInitiative = advanceInitiativeState(
    initiative,
    "problem_aligned",
    operationContext.now(),
  );

  await problemAlignmentStore.saveProblemAlignment(alignment);
  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);

  return { initiative: updatedInitiative, alignment, bundle: updatedBundle };
}

export async function generateBusinessCaseForInitiative(
  command: CohortWorkflowCommand,
  initiativeStore: InitiativeStore,
  problemBriefStore: ProblemBriefStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "problem_aligned");
  const problemBrief = await problemBriefStore.findProblemBriefByInitiativeId(command.initiativeId);
  if (problemBrief === undefined) {
    throw new InitiativeWorkflowError("Problem brief was not found");
  }

  const businessCase = await generator.generateBusinessCase(buildContextBlock(problemBrief));

  const bundle = await getOrCreateCohortDiscoveryBundle(
    cohortStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );
  const featureWishListSuggestions = await generator.generateFeatureWishListSuggestions(
    buildBusinessPlanContext(problemBrief, { ...bundle, businessCase }),
  );
  const updatedBundle = mergeCohortDiscoveryBundle(
    bundle,
    { businessCase, featureWishListSuggestions },
    operationContext.now(),
  );
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "business_case_complete",
    operationContext.now(),
  );

  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export interface SuggestFeatureWishListCommand extends CohortWorkflowCommand {
  force?: boolean;
}

export async function suggestFeatureWishListForInitiative(
  command: SuggestFeatureWishListCommand,
  initiativeStore: InitiativeStore,
  problemBriefStore: ProblemBriefStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
): Promise<CohortDiscoveryBundle> {
  const initiative = await loadInitiativeContext(command, initiativeStore, "business_case_complete");
  const problemBrief = await problemBriefStore.findProblemBriefByInitiativeId(command.initiativeId);
  const bundle = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (problemBrief === undefined || bundle?.businessCase === undefined) {
    throw new InitiativeWorkflowError("Business case must be completed first");
  }

  if (
    command.force !== true &&
    bundle.featureWishListSuggestions !== undefined &&
    bundle.featureWishListSuggestions.length >= 3
  ) {
    return bundle;
  }

  const featureWishListSuggestions = await generator.generateFeatureWishListSuggestions(
    buildBusinessPlanContext(problemBrief, bundle),
  );
  const updatedBundle = mergeCohortDiscoveryBundle(
    bundle,
    { featureWishListSuggestions },
    operationContext.now(),
  );
  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  return updatedBundle;
}

export interface SaveMvpScopeCommand extends CohortWorkflowCommand {
  featureWishList: string[];
  sessionNotesWeek2?: string;
}

export async function generateMvpScopeForInitiative(
  command: SaveMvpScopeCommand,
  initiativeStore: InitiativeStore,
  problemBriefStore: ProblemBriefStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "business_case_complete");
  const problemBrief = await problemBriefStore.findProblemBriefByInitiativeId(command.initiativeId);
  const bundle = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (problemBrief === undefined || bundle?.businessCase === undefined) {
    throw new InitiativeWorkflowError("Business case must be completed first");
  }

  const mvpScope = await generator.generateMvpScope(
    `${buildContextBlock(problemBrief)}\n${JSON.stringify(bundle.businessCase)}`,
    command.featureWishList,
  );

  const revenueHypothesisSuggestions = await generator.generateRevenueHypothesisSuggestions(
    buildBusinessPlanContext(problemBrief, { ...bundle, mvpScope }),
  );

  const updatedBundle = mergeCohortDiscoveryBundle(
    bundle,
    {
      mvpScope: { ...mvpScope, featureWishList: command.featureWishList },
      revenueHypothesisSuggestions,
      ...(command.sessionNotesWeek2 !== undefined
        ? { sessionNotesWeek2: { notes: command.sessionNotesWeek2, updatedAt: operationContext.now() } }
        : {}),
    },
    operationContext.now(),
  );
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "solution_selected",
    operationContext.now(),
  );

  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export interface FinalizeMvpCommand extends CohortWorkflowCommand {
  chosenModel: string;
  pricingStartingPoint: string;
  killerAssumption: string;
}

export async function finalizeMvpForInitiative(
  command: FinalizeMvpCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "solution_selected");
  const bundle = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (bundle?.mvpScope === undefined) {
    throw new InitiativeWorkflowError("MVP scope must be completed first");
  }

  const mvpStressTest = await generator.generateMvpStressTest(bundle.mvpScope);
  const simplicityCheck = await generator.generateSimplicityCheck(bundle.mvpScope);

  const updatedBundle = mergeCohortDiscoveryBundle(
    bundle,
    {
      revenueHypothesis: {
        chosenModel: command.chosenModel,
        pricingStartingPoint: command.pricingStartingPoint,
        killerAssumption: command.killerAssumption,
      },
      mvpStressTest,
      simplicityCheck,
    },
    operationContext.now(),
  );
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "mvp_finalized",
    operationContext.now(),
  );

  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function generatePersonaForInitiative(
  command: CohortWorkflowCommand,
  initiativeStore: InitiativeStore,
  problemBriefStore: ProblemBriefStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "mvp_finalized");
  const problemBrief = await problemBriefStore.findProblemBriefByInitiativeId(command.initiativeId);
  const bundle = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (problemBrief === undefined || bundle?.mvpScope === undefined) {
    throw new InitiativeWorkflowError("MVP must be finalized first");
  }

  const persona = await generator.generatePersona(
    `${buildContextBlock(problemBrief)}\n${JSON.stringify(bundle.mvpScope)}`,
  );

  const existing = await getOrCreateCohortDiscoveryBundle(
    cohortStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );
  const updatedBundle = mergeCohortDiscoveryBundle(existing, { persona }, operationContext.now());
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "persona_complete",
    operationContext.now(),
  );

  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function generateUserFlowForInitiative(
  command: CohortWorkflowCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "persona_complete");
  const bundle = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (bundle?.persona === undefined) {
    throw new InitiativeWorkflowError("Persona must be completed first");
  }

  const userFlow = await generator.generateUserFlow(bundle.persona);

  const updatedBundle = mergeCohortDiscoveryBundle(bundle, { userFlow }, operationContext.now());
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "userflow_complete",
    operationContext.now(),
  );

  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function generateStoryMapForInitiative(
  command: CohortWorkflowCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "userflow_complete");
  const bundle = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (bundle?.userFlow === undefined) {
    throw new InitiativeWorkflowError("User flow must be completed first");
  }

  const storyMap = await generator.generateStoryMap(bundle.userFlow);

  const flowAlignedFeatures = storyMap.steps.flatMap((step: StoryMap["steps"][number]) =>
    step.tasks.filter((task) => task.inMvp).map((task) => `${step.stepTitle}: ${task.title}`),
  );

  const updatedBundle = mergeCohortDiscoveryBundle(
    bundle,
    { storyMap, flowAlignedFeatures },
    operationContext.now(),
  );
  const updatedInitiative = advanceInitiativeState(
    initiative,
    "storymap_complete",
    operationContext.now(),
  );

  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function assembleBrdForInitiative(
  command: CohortWorkflowCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  generator: CohortGenerator,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "storymap_complete");
  const bundle = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (bundle?.persona === undefined || bundle.userFlow === undefined || bundle.storyMap === undefined) {
    throw new InitiativeWorkflowError("Persona, user flow, and story map are required");
  }

  const brd = await generator.assembleBrd({
    persona: bundle.persona,
    userFlow: bundle.userFlow,
    storyMap: bundle.storyMap,
    features: bundle.flowAlignedFeatures ?? [],
  });

  const updatedBundle = mergeCohortDiscoveryBundle(bundle, { brd }, operationContext.now());
  const updatedInitiative = advanceInitiativeState(initiative, "brd_draft", operationContext.now());

  await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function approveDesignForInitiative(
  command: CohortWorkflowCommand,
  initiativeStore: InitiativeStore,
  cohortStore: CohortDiscoveryStore,
  operationContext: IdentityOperationContext,
  sessionNotesWeek3?: string,
) {
  const initiative = await loadInitiativeContext(command, initiativeStore, "brd_draft");
  const bundle = await cohortStore.findCohortDiscoveryByInitiativeId(command.initiativeId);
  if (bundle?.brd === undefined) {
    throw new InitiativeWorkflowError("BRD must be assembled first");
  }

  const updatedBundle =
    sessionNotesWeek3 !== undefined
      ? mergeCohortDiscoveryBundle(
          bundle,
          { sessionNotesWeek3: { notes: sessionNotesWeek3, updatedAt: operationContext.now() } },
          operationContext.now(),
        )
      : bundle;

  const updatedInitiative = advanceInitiativeState(
    initiative,
    "design_approved",
    operationContext.now(),
  );

  if (sessionNotesWeek3 !== undefined) {
    await cohortStore.saveCohortDiscoveryBundle(updatedBundle);
  }
  await initiativeStore.saveInitiative(updatedInitiative);
  return { initiative: updatedInitiative, bundle: updatedBundle };
}

export async function saveSessionNotesForInitiative(
  command: CohortWorkflowCommand & { week: 1 | 2 | 3; notes: string },
  cohortStore: CohortDiscoveryStore,
  initiativeStore: InitiativeStore,
  operationContext: IdentityOperationContext,
): Promise<CohortDiscoveryBundle> {
  const initiative = await loadInitiativeContext(command, initiativeStore);
  const bundle = await getOrCreateCohortDiscoveryBundle(
    cohortStore,
    initiative.id,
    initiative.organizationId,
    operationContext.createId,
    operationContext.now,
  );

  const key =
    command.week === 1
      ? "sessionNotesWeek1"
      : command.week === 2
        ? "sessionNotesWeek2"
        : "sessionNotesWeek3";

  const updated = mergeCohortDiscoveryBundle(
    bundle,
    { [key]: { notes: command.notes, updatedAt: operationContext.now() } },
    operationContext.now(),
  );
  await cohortStore.saveCohortDiscoveryBundle(updated);
  return updated;
}
