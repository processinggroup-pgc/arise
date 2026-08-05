export interface RichIcp {
  role: string;
  incomeLevel: string;
  dailyWorkflow: string;
  toolsUsed: string[];
  onlineHangouts: string[];
  budgetRange: string;
}

export interface StressTestResult {
  failureModes: string[];
  nonUsers: string[];
  wrongAssumptions: string[];
  generatedAt: Date;
}

export interface BusinessConcept {
  problem: string;
  customer: string;
  solution: string;
  whyNow: string;
  topRisks: string[];
}

export interface SessionNotes {
  notes: string;
  updatedAt: Date;
}

export interface BusinessCase {
  icp: string;
  problem: string;
  valueProposition: string;
  revenueModelOptions: string[];
  acquisitionStrategy: string;
  risks: string[];
}

export interface MvpScope {
  featureWishList: string[];
  coreFeatures: string[];
  notToBuild: string[];
  userFlowSummary: string;
  fastestPathToValue: string;
}

export interface RevenueHypothesis {
  chosenModel: string;
  pricingStartingPoint: string;
  killerAssumption: string;
}

export interface MvpStressTest {
  unnecessary: string[];
  removable: string[];
  overbuilt: string[];
}

export interface Persona {
  name: string;
  role: string;
  incomeLevel: string;
  dailyWorkflow: string;
  toolsUsed: string[];
  frustrations: string[];
  triedBefore: string[];
  payTrigger: string;
}

export interface UserFlowStep {
  stepNumber: number;
  userAction: string;
  systemResponse: string;
}

export interface UserFlow {
  steps: UserFlowStep[];
  valueDelivered: string;
}

export interface StoryMapTask {
  title: string;
  inMvp: boolean;
}

export interface StoryMapStep {
  stepTitle: string;
  tasks: StoryMapTask[];
}

export interface StoryMap {
  steps: StoryMapStep[];
}

export interface BrdDocument {
  personaSummary: string;
  userFlowSummary: string;
  storyMapSummary: string;
  coreFeatures: string[];
  successMetrics: string[];
  fullDocument: string;
}

export type DualAiSecondarySource = "openai" | "rule_based";

export interface DualAiComparison {
  claudeSummary: string;
  openAiSummary: string;
  keyDifferences: string[];
  /** Which generator produced openAiSummary. Omitted on bundles saved before this field existed. */
  secondarySource?: DualAiSecondarySource;
  /** Set when secondarySource is rule_based (missing key or OpenAI API failure). */
  secondaryWarning?: string;
}

export interface CohortDiscoveryBundle {
  id: string;
  initiativeId: string;
  organizationId: string;
  richIcp?: RichIcp;
  dualAiComparison?: DualAiComparison;
  stressTest?: StressTestResult;
  /** AI-suggested business concept for finalize step (wizard alignment). User may edit before submitting. */
  businessConceptSuggestions?: BusinessConcept;
  businessConcept?: BusinessConcept;
  sessionNotesWeek1?: SessionNotes;
  businessCase?: BusinessCase;
  /** AI-suggested feature wish list for MVP scoping (Step 2). User may edit before scoping. */
  featureWishListSuggestions?: string[];
  mvpScope?: MvpScope;
  /** AI-suggested revenue fields for MVP finalize (Step 2). User may edit before submitting. */
  revenueHypothesisSuggestions?: RevenueHypothesis;
  revenueHypothesis?: RevenueHypothesis;
  mvpStressTest?: MvpStressTest;
  simplicityCheck?: string;
  sessionNotesWeek2?: SessionNotes;
  persona?: Persona;
  userFlow?: UserFlow;
  storyMap?: StoryMap;
  flowAlignedFeatures?: string[];
  brd?: BrdDocument;
  sessionNotesWeek3?: SessionNotes;
  updatedAt: Date;
}

export interface CreateCohortDiscoveryBundleInput {
  initiativeId: string;
  organizationId: string;
}

export interface CreateCohortDiscoveryBundleMetadata {
  id: string;
  updatedAt: Date;
}

export function createCohortDiscoveryBundle(
  input: CreateCohortDiscoveryBundleInput,
  metadata: CreateCohortDiscoveryBundleMetadata,
): CohortDiscoveryBundle {
  const initiativeId = input.initiativeId.trim();
  const organizationId = input.organizationId.trim();

  if (initiativeId.length === 0 || organizationId.length === 0) {
    throw new Error("Cohort discovery bundle identifiers are required");
  }

  return {
    id: metadata.id,
    initiativeId,
    organizationId,
    updatedAt: metadata.updatedAt,
  };
}

export function mergeCohortDiscoveryBundle(
  bundle: CohortDiscoveryBundle,
  patch: Partial<Omit<CohortDiscoveryBundle, "id" | "initiativeId" | "organizationId">>,
  updatedAt: Date,
): CohortDiscoveryBundle {
  return {
    ...bundle,
    ...patch,
    updatedAt,
  };
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeBusinessConcept(concept: BusinessConcept): BusinessConcept {
  return {
    problem: typeof concept.problem === "string" ? concept.problem : "",
    customer: typeof concept.customer === "string" ? concept.customer : "",
    solution: typeof concept.solution === "string" ? concept.solution : "",
    whyNow: typeof concept.whyNow === "string" ? concept.whyNow : "",
    topRisks: normalizeStringArray(concept.topRisks),
  };
}

function normalizeBusinessCase(businessCase: BusinessCase): BusinessCase {
  return {
    icp: typeof businessCase.icp === "string" ? businessCase.icp : "",
    problem: typeof businessCase.problem === "string" ? businessCase.problem : "",
    valueProposition:
      typeof businessCase.valueProposition === "string" ? businessCase.valueProposition : "",
    revenueModelOptions: normalizeStringArray(businessCase.revenueModelOptions),
    acquisitionStrategy:
      typeof businessCase.acquisitionStrategy === "string" ? businessCase.acquisitionStrategy : "",
    risks: normalizeStringArray(businessCase.risks),
  };
}

function normalizeRevenueHypothesis(hypothesis: RevenueHypothesis): RevenueHypothesis {
  return {
    chosenModel: typeof hypothesis.chosenModel === "string" ? hypothesis.chosenModel : "",
    pricingStartingPoint:
      typeof hypothesis.pricingStartingPoint === "string" ? hypothesis.pricingStartingPoint : "",
    killerAssumption:
      typeof hypothesis.killerAssumption === "string" ? hypothesis.killerAssumption : "",
  };
}

function normalizeStressTest(stressTest: StressTestResult): StressTestResult {
  return {
    failureModes: normalizeStringArray(stressTest.failureModes),
    nonUsers: normalizeStringArray(stressTest.nonUsers),
    wrongAssumptions: normalizeStringArray(stressTest.wrongAssumptions),
    generatedAt:
      stressTest.generatedAt instanceof Date
        ? stressTest.generatedAt
        : new Date(stressTest.generatedAt),
  };
}

function normalizeMvpScope(scope: MvpScope): MvpScope {
  return {
    featureWishList: normalizeStringArray(scope.featureWishList),
    coreFeatures: normalizeStringArray(scope.coreFeatures),
    notToBuild: normalizeStringArray(scope.notToBuild),
    userFlowSummary: typeof scope.userFlowSummary === "string" ? scope.userFlowSummary : "",
    fastestPathToValue: typeof scope.fastestPathToValue === "string" ? scope.fastestPathToValue : "",
  };
}

function normalizeUserFlow(userFlow: UserFlow): UserFlow {
  const steps = Array.isArray(userFlow.steps) ? userFlow.steps : [];
  return {
    steps: steps.map((step) => ({
      stepNumber: typeof step.stepNumber === "number" ? step.stepNumber : 0,
      userAction: typeof step.userAction === "string" ? step.userAction : "",
      systemResponse: typeof step.systemResponse === "string" ? step.systemResponse : "",
    })),
    valueDelivered: typeof userFlow.valueDelivered === "string" ? userFlow.valueDelivered : "",
  };
}

function normalizeStoryMap(storyMap: StoryMap): StoryMap {
  const steps = Array.isArray(storyMap.steps) ? storyMap.steps : [];
  return {
    steps: steps.map((step) => ({
      stepTitle: typeof step.stepTitle === "string" ? step.stepTitle : "",
      tasks: Array.isArray(step.tasks)
        ? step.tasks.map((task) => ({
            title: typeof task.title === "string" ? task.title : "",
            inMvp: task.inMvp === true,
          }))
        : [],
    })),
  };
}

function normalizeDualAiComparison(comparison: DualAiComparison): DualAiComparison {
  return {
    claudeSummary: typeof comparison.claudeSummary === "string" ? comparison.claudeSummary : "",
    openAiSummary: typeof comparison.openAiSummary === "string" ? comparison.openAiSummary : "",
    keyDifferences: normalizeStringArray(comparison.keyDifferences),
    ...(comparison.secondarySource !== undefined ? { secondarySource: comparison.secondarySource } : {}),
    ...(comparison.secondaryWarning !== undefined
      ? { secondaryWarning: comparison.secondaryWarning }
      : {}),
  };
}

function normalizeMvpStressTest(stressTest: MvpStressTest): MvpStressTest {
  return {
    unnecessary: normalizeStringArray(stressTest.unnecessary),
    removable: normalizeStringArray(stressTest.removable),
    overbuilt: normalizeStringArray(stressTest.overbuilt),
  };
}

function normalizePersona(persona: Persona): Persona {
  return {
    name: typeof persona.name === "string" ? persona.name : "",
    role: typeof persona.role === "string" ? persona.role : "",
    incomeLevel: typeof persona.incomeLevel === "string" ? persona.incomeLevel : "",
    dailyWorkflow: typeof persona.dailyWorkflow === "string" ? persona.dailyWorkflow : "",
    toolsUsed: normalizeStringArray(persona.toolsUsed),
    frustrations: normalizeStringArray(persona.frustrations),
    triedBefore: normalizeStringArray(persona.triedBefore),
    payTrigger: typeof persona.payTrigger === "string" ? persona.payTrigger : "",
  };
}

function normalizeBrdDocument(brd: BrdDocument): BrdDocument {
  return {
    personaSummary: typeof brd.personaSummary === "string" ? brd.personaSummary : "",
    userFlowSummary: typeof brd.userFlowSummary === "string" ? brd.userFlowSummary : "",
    storyMapSummary: typeof brd.storyMapSummary === "string" ? brd.storyMapSummary : "",
    coreFeatures: normalizeStringArray(brd.coreFeatures),
    successMetrics: normalizeStringArray(brd.successMetrics),
    fullDocument: typeof brd.fullDocument === "string" ? brd.fullDocument : "",
  };
}

/** Ensures jsonb-loaded bundles have safe defaults for optional suggestion fields. */
export function normalizeCohortDiscoveryBundle(bundle: CohortDiscoveryBundle): CohortDiscoveryBundle {
  const normalized: CohortDiscoveryBundle = { ...bundle };

  if (bundle.businessConceptSuggestions !== undefined) {
    normalized.businessConceptSuggestions = normalizeBusinessConcept(bundle.businessConceptSuggestions);
  }
  if (bundle.businessConcept !== undefined) {
    normalized.businessConcept = normalizeBusinessConcept(bundle.businessConcept);
  }
  if (bundle.businessCase !== undefined) {
    normalized.businessCase = normalizeBusinessCase(bundle.businessCase);
  }
  if (bundle.featureWishListSuggestions !== undefined) {
    normalized.featureWishListSuggestions = normalizeStringArray(bundle.featureWishListSuggestions);
  }
  if (bundle.revenueHypothesisSuggestions !== undefined) {
    normalized.revenueHypothesisSuggestions = normalizeRevenueHypothesis(
      bundle.revenueHypothesisSuggestions,
    );
  }
  if (bundle.revenueHypothesis !== undefined) {
    normalized.revenueHypothesis = normalizeRevenueHypothesis(bundle.revenueHypothesis);
  }
  if (bundle.stressTest !== undefined) {
    normalized.stressTest = normalizeStressTest(bundle.stressTest);
  }
  if (bundle.dualAiComparison !== undefined) {
    normalized.dualAiComparison = normalizeDualAiComparison(bundle.dualAiComparison);
  }
  if (bundle.mvpScope !== undefined) {
    normalized.mvpScope = normalizeMvpScope(bundle.mvpScope);
  }
  if (bundle.mvpStressTest !== undefined) {
    normalized.mvpStressTest = normalizeMvpStressTest(bundle.mvpStressTest);
  }
  if (bundle.persona !== undefined) {
    normalized.persona = normalizePersona(bundle.persona);
  }
  if (bundle.userFlow !== undefined) {
    normalized.userFlow = normalizeUserFlow(bundle.userFlow);
  }
  if (bundle.storyMap !== undefined) {
    normalized.storyMap = normalizeStoryMap(bundle.storyMap);
  }
  if (bundle.flowAlignedFeatures !== undefined) {
    normalized.flowAlignedFeatures = normalizeStringArray(bundle.flowAlignedFeatures);
  }
  if (bundle.brd !== undefined) {
    normalized.brd = normalizeBrdDocument(bundle.brd);
  }

  return normalized;
}
