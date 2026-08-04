import type {
  BrdDocument,
  BusinessCase,
  BusinessConcept,
  MvpScope,
  Persona,
  StoryMap,
  UserFlow,
} from "@arise/domain";

import type { ClaudeJsonGenerator } from "./claude-json-generator.js";

export interface CohortGenerator {
  generateBusinessCase(context: string): Promise<BusinessCase>;
  generateBusinessConceptSuggestions(context: string): Promise<BusinessConcept>;
  generateFeatureWishListSuggestions(context: string): Promise<string[]>;
  generateRevenueHypothesisSuggestions(context: string): Promise<{
    chosenModel: string;
    pricingStartingPoint: string;
    killerAssumption: string;
  }>;
  generateMvpScope(context: string, wishList: string[]): Promise<MvpScope>;
  generateMvpStressTest(mvpScope: MvpScope): Promise<{
    unnecessary: string[];
    removable: string[];
    overbuilt: string[];
  }>;
  generateSimplicityCheck(mvpScope: MvpScope): Promise<string>;
  generateStressTest(context: string): Promise<{
    failureModes: string[];
    nonUsers: string[];
    wrongAssumptions: string[];
  }>;
  generatePersona(context: string): Promise<Persona>;
  generateUserFlow(persona: Persona): Promise<UserFlow>;
  generateStoryMap(userFlow: UserFlow): Promise<StoryMap>;
  assembleBrd(input: {
    persona: Persona;
    userFlow: UserFlow;
    storyMap: StoryMap;
    features: string[];
  }): Promise<BrdDocument>;
}

export class RuleBasedCohortGenerator implements CohortGenerator {
  async generateBusinessCase(context: string): Promise<BusinessCase> {
    return {
      icp: "Career changers facing income instability",
      problem: context.slice(0, 200),
      valueProposition: "Affordable cohort access with clear ROI during a soft job market",
      revenueModelOptions: ["Tiered tuition", "Income-share agreement", "Employer sponsorship"],
      acquisitionStrategy: "Community partnerships and outcome-focused content marketing",
      risks: ["Prolonged hiring downturn", "Price sensitivity", "Completion rate pressure"],
    };
  }

  async generateBusinessConceptSuggestions(_context: string): Promise<BusinessConcept> {
    return {
      problem: "Career changers cannot afford upfront cohort tuition during income instability",
      customer: "Underemployed professionals considering paid upskilling programs",
      solution: "Flexible-payment cohort enrollment with clear ROI and job-outcome messaging",
      whyNow: "A soft job market increases price sensitivity while reskilling demand stays high",
      topRisks: [
        "Prolonged hiring downturn reduces enrollment urgency",
        "Financial stress lowers cohort completion rates",
        "Free alternatives capture price-sensitive learners",
      ],
    };
  }

  async generateFeatureWishListSuggestions(_context: string): Promise<string[]> {
    return [
      "Problem-specific landing page with clear value proposition",
      "Flexible payment plan selection at enrollment",
      "Minimal qualification and application form",
      "Enrollment confirmation with cohort access grant",
      "Automated email reminders for incomplete applications",
    ];
  }

  async generateRevenueHypothesisSuggestions(_context: string): Promise<{
    chosenModel: string;
    pricingStartingPoint: string;
    killerAssumption: string;
  }> {
    return {
      chosenModel: "Tiered tuition with deferred payment option",
      pricingStartingPoint: "$49/month starter tier or $299 upfront cohort seat",
      killerAssumption: "Learners will commit before income stabilizes if payment flexibility is clear",
    };
  }

  async generateMvpScope(_context: string, wishList: string[]): Promise<MvpScope> {
    return {
      featureWishList: wishList,
      coreFeatures: wishList.slice(0, 2),
      notToBuild: wishList.slice(2),
      userFlowSummary: "Discover → qualify → enroll with flexible payment",
      fastestPathToValue: "Show payment options within 2 minutes of landing",
    };
  }

  async generateMvpStressTest(mvpScope: MvpScope) {
    return {
      unnecessary: mvpScope.featureWishList.slice(2),
      removable: ["Advanced analytics dashboard"],
      overbuilt: mvpScope.coreFeatures.length > 2 ? mvpScope.coreFeatures.slice(2) : [],
    };
  }

  async generateSimplicityCheck(_mvpScope: MvpScope): Promise<string> {
    return "Cut to one core enrollment flow and defer community features until 10 paid enrollments.";
  }

  async generateStressTest(_context: string) {
    return {
      failureModes: ["Users cannot afford even reduced tuition", "Job market recovery reduces urgency"],
      nonUsers: ["Fully employed upskillers", "Free bootcamp seekers"],
      wrongAssumptions: ["Everyone wants a cohort", "Price is the only blocker"],
    };
  }

  async generatePersona(_context: string): Promise<Persona> {
    return {
      name: "Jordan Lee",
      role: "Underemployed marketing coordinator",
      incomeLevel: "$38k–$52k",
      dailyWorkflow: "Job boards mornings, freelance gigs afternoons, cohort research evenings",
      toolsUsed: ["LinkedIn", "Notion", "ChatGPT", "Skool"],
      frustrations: ["Upfront tuition", "Unclear job outcomes", "Too many competing programs"],
      triedBefore: ["Free YouTube courses", "MOOC certificates", "Delayed enrollment"],
      payTrigger: "Guaranteed flexible payment plan with a clear 90-day job search plan",
    };
  }

  async generateUserFlow(_persona: Persona): Promise<UserFlow> {
    return {
      steps: [
        { stepNumber: 1, userAction: "Land on cohort page", systemResponse: "Show problem-specific headline" },
        { stepNumber: 2, userAction: "Check affordability options", systemResponse: "Display payment plans" },
        { stepNumber: 3, userAction: "Start application", systemResponse: "Collect minimal info" },
        { stepNumber: 4, userAction: "Select plan", systemResponse: "Confirm terms" },
        { stepNumber: 5, userAction: "Enroll", systemResponse: "Grant cohort access" },
      ],
      valueDelivered: "Enrolled with an affordable plan in under 5 minutes",
    };
  }

  async generateStoryMap(userFlow: UserFlow): Promise<StoryMap> {
    return {
      steps: userFlow.steps.map((step: UserFlow["steps"][number]) => ({
        stepTitle: step.userAction,
        tasks: [
          { title: step.systemResponse, inMvp: true },
          { title: "Track analytics", inMvp: false },
        ],
      })),
    };
  }

  async assembleBrd(input: {
    persona: Persona;
    userFlow: UserFlow;
    storyMap: StoryMap;
    features: string[];
  }): Promise<BrdDocument> {
    return {
      personaSummary: `${input.persona.name} — ${input.persona.role}`,
      userFlowSummary: input.userFlow.valueDelivered,
      storyMapSummary: `${String(input.storyMap.steps.length)} journey steps defined`,
      coreFeatures: input.features,
      successMetrics: ["Time to first value < 2 min", "Enrollment conversion rate", "Completion rate"],
      fullDocument: [
        "# Build-ready BRD",
        "",
        "## Persona",
        input.persona.name,
        "",
        "## User flow",
        input.userFlow.valueDelivered,
        "",
        "## Features",
        ...input.features.map((feature) => `- ${feature}`),
      ].join("\n"),
    };
  }
}

export class ClaudeCohortGenerator implements CohortGenerator {
  constructor(private readonly claude: ClaudeJsonGenerator) {}

  generateBusinessCase(context: string): Promise<BusinessCase> {
    return this.claude.generate({
      system: "Return only valid JSON for a business case.",
      prompt: `Create business case JSON (icp, problem, valueProposition, revenueModelOptions, acquisitionStrategy, risks).\n${context}`,
    });
  }

  generateBusinessConceptSuggestions(context: string): Promise<BusinessConcept> {
    return this.claude.generate({
      system:
        "Return only valid JSON with keys problem, customer, solution, whyNow, topRisks (array of exactly 3 strings).",
      prompt: `Suggest a concise business concept JSON grounded in this research:\n${context}`,
    });
  }

  async generateFeatureWishListSuggestions(context: string): Promise<string[]> {
    const result = await this.claude.generate<{ features: string[] }>({
      system: 'Return only valid JSON with key "features" — array of exactly 5 concise MVP feature ideas.',
      prompt: `Suggest 5 MVP feature wish-list items grounded in this business plan:\n${context}`,
    });
    return result.features.slice(0, 5);
  }

  generateRevenueHypothesisSuggestions(context: string): Promise<{
    chosenModel: string;
    pricingStartingPoint: string;
    killerAssumption: string;
  }> {
    return this.claude.generate({
      system: "Return only valid JSON with keys chosenModel, pricingStartingPoint, killerAssumption.",
      prompt: `Suggest a revenue hypothesis JSON based on this business plan and MVP scope:\n${context}`,
    });
  }

  generateMvpScope(context: string, wishList: string[]): Promise<MvpScope> {
    return this.claude.generate({
      system: "Return only valid JSON. coreFeatures max 2 items.",
      prompt: `Scope MVP JSON (featureWishList, coreFeatures, notToBuild, userFlowSummary, fastestPathToValue).\nWish list:\n${wishList.join("\n")}\n${context}`,
    });
  }

  generateMvpStressTest(mvpScope: MvpScope): Promise<{
    unnecessary: string[];
    removable: string[];
    overbuilt: string[];
  }> {
    return this.claude.generate({
      system: "Return only valid JSON.",
      prompt: `Stress test MVP JSON (unnecessary, removable, overbuilt).\n${JSON.stringify(mvpScope)}`,
    });
  }

  async generateSimplicityCheck(mvpScope: MvpScope): Promise<string> {
    const result = await this.claude.generate<{ recommendation: string }>({
      system: 'Return only valid JSON with key "recommendation".',
      prompt: `30% reduction recommendation JSON.\n${JSON.stringify(mvpScope)}`,
    });
    return result.recommendation;
  }

  generateStressTest(context: string): Promise<{
    failureModes: string[];
    nonUsers: string[];
    wrongAssumptions: string[];
  }> {
    return this.claude.generate({
      system: "Return only valid JSON.",
      prompt: `Stress test JSON (failureModes, nonUsers, wrongAssumptions).\n${context}`,
    });
  }

  generatePersona(context: string): Promise<Persona> {
    return this.claude.generate({
      system: "Return only valid JSON persona.",
      prompt: `Persona JSON (name, role, incomeLevel, dailyWorkflow, toolsUsed, frustrations, triedBefore, payTrigger).\n${context}`,
    });
  }

  generateUserFlow(persona: Persona): Promise<UserFlow> {
    return this.claude.generate({
      system: "Return only valid JSON. Max 5 steps.",
      prompt: `User flow JSON (steps, valueDelivered).\n${JSON.stringify(persona)}`,
    });
  }

  generateStoryMap(userFlow: UserFlow): Promise<StoryMap> {
    return this.claude.generate({
      system: "Return only valid JSON.",
      prompt: `Story map JSON (steps with tasks and inMvp flags).\n${JSON.stringify(userFlow)}`,
    });
  }

  assembleBrd(input: {
    persona: Persona;
    userFlow: UserFlow;
    storyMap: StoryMap;
    features: string[];
  }): Promise<BrdDocument> {
    return this.claude.generate({
      system: "Return only valid JSON BRD.",
      prompt: `BRD JSON (personaSummary, userFlowSummary, storyMapSummary, coreFeatures, successMetrics, fullDocument).\n${JSON.stringify(input)}`,
    });
  }
}

export class ResilientCohortGenerator implements CohortGenerator {
  private readonly fallback = new RuleBasedCohortGenerator();

  constructor(private readonly primary: CohortGenerator) {}

  private async withFallback<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      return fallback();
    }
  }

  generateBusinessCase(context: string): Promise<BusinessCase> {
    return this.withFallback(
      () => this.primary.generateBusinessCase(context),
      () => this.fallback.generateBusinessCase(context),
    );
  }

  generateBusinessConceptSuggestions(context: string): Promise<BusinessConcept> {
    return this.withFallback(
      () => this.primary.generateBusinessConceptSuggestions(context),
      () => this.fallback.generateBusinessConceptSuggestions(context),
    );
  }

  generateFeatureWishListSuggestions(context: string): Promise<string[]> {
    return this.withFallback(
      () => this.primary.generateFeatureWishListSuggestions(context),
      () => this.fallback.generateFeatureWishListSuggestions(context),
    );
  }

  generateRevenueHypothesisSuggestions(context: string): Promise<{
    chosenModel: string;
    pricingStartingPoint: string;
    killerAssumption: string;
  }> {
    return this.withFallback(
      () => this.primary.generateRevenueHypothesisSuggestions(context),
      () => this.fallback.generateRevenueHypothesisSuggestions(context),
    );
  }

  generateMvpScope(context: string, wishList: string[]): Promise<MvpScope> {
    return this.withFallback(
      () => this.primary.generateMvpScope(context, wishList),
      () => this.fallback.generateMvpScope(context, wishList),
    );
  }

  generateMvpStressTest(mvpScope: MvpScope) {
    return this.withFallback(
      () => this.primary.generateMvpStressTest(mvpScope),
      () => this.fallback.generateMvpStressTest(mvpScope),
    );
  }

  generateSimplicityCheck(mvpScope: MvpScope): Promise<string> {
    return this.withFallback(
      () => this.primary.generateSimplicityCheck(mvpScope),
      () => this.fallback.generateSimplicityCheck(mvpScope),
    );
  }

  generateStressTest(context: string) {
    return this.withFallback(
      () => this.primary.generateStressTest(context),
      () => this.fallback.generateStressTest(context),
    );
  }

  generatePersona(context: string): Promise<Persona> {
    return this.withFallback(
      () => this.primary.generatePersona(context),
      () => this.fallback.generatePersona(context),
    );
  }

  generateUserFlow(persona: Persona): Promise<UserFlow> {
    return this.withFallback(
      () => this.primary.generateUserFlow(persona),
      () => this.fallback.generateUserFlow(persona),
    );
  }

  generateStoryMap(userFlow: UserFlow): Promise<StoryMap> {
    return this.withFallback(
      () => this.primary.generateStoryMap(userFlow),
      () => this.fallback.generateStoryMap(userFlow),
    );
  }

  assembleBrd(input: {
    persona: Persona;
    userFlow: UserFlow;
    storyMap: StoryMap;
    features: string[];
  }): Promise<BrdDocument> {
    return this.withFallback(
      () => this.primary.assembleBrd(input),
      () => this.fallback.assembleBrd(input),
    );
  }
}
