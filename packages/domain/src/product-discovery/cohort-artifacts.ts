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

export interface DualAiComparison {
  claudeSummary: string;
  ruleBasedSummary: string;
  keyDifferences: string[];
}

export interface CohortDiscoveryBundle {
  id: string;
  initiativeId: string;
  organizationId: string;
  richIcp?: RichIcp;
  dualAiComparison?: DualAiComparison;
  stressTest?: StressTestResult;
  businessConcept?: BusinessConcept;
  sessionNotesWeek1?: SessionNotes;
  businessCase?: BusinessCase;
  mvpScope?: MvpScope;
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
