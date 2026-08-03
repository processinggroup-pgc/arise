import type {
  CohortDiscoveryBundle,
  Initiative,
  MarketResearchDossier,
  ProblemAlignment,
  ProblemBrief,
} from "@arise/domain";

export function buildWeek1HomeworkMarkdown(input: {
  initiative: Initiative;
  problemBrief: ProblemBrief;
  dossier?: MarketResearchDossier;
  alignment?: ProblemAlignment;
  bundle?: CohortDiscoveryBundle;
}): string {
  const { initiative, problemBrief, dossier, alignment, bundle } = input;
  return [
    `# Week 1 Homework — ${initiative.title}`,
    "",
    "## Problem",
    problemBrief.rawProblemDescription,
    "",
    "## ICP",
    `- Audience: ${problemBrief.targetAudience}`,
    ...(problemBrief.icpRole.length > 0 ? [`- Role: ${problemBrief.icpRole}`] : []),
    ...(problemBrief.icpBudgetRange.length > 0 ? [`- Budget: ${problemBrief.icpBudgetRange}`] : []),
    "",
    "## Pain points",
    ...problemBrief.painPoints.map((point) => `- ${point}`),
    "",
    ...(dossier !== undefined
      ? ["## AI research summary", dossier.summary, ""]
      : []),
    ...(bundle?.dualAiComparison !== undefined
      ? [
          "## Dual-AI comparison",
          `Claude: ${bundle.dualAiComparison.claudeSummary}`,
          `Rule-based: ${bundle.dualAiComparison.ruleBasedSummary}`,
          "",
        ]
      : []),
    ...(bundle?.stressTest !== undefined
      ? [
          "## Stress test",
          "### Failure modes",
          ...bundle.stressTest.failureModes.map((item) => `- ${item}`),
          "### Non-users",
          ...bundle.stressTest.nonUsers.map((item) => `- ${item}`),
          "### Wrong assumptions",
          ...bundle.stressTest.wrongAssumptions.map((item) => `- ${item}`),
          "",
        ]
      : []),
    ...(bundle?.businessConcept !== undefined
      ? [
          "## Finalized concept",
          `- Problem: ${bundle.businessConcept.problem}`,
          `- Customer: ${bundle.businessConcept.customer}`,
          `- Solution: ${bundle.businessConcept.solution}`,
          `- Why now: ${bundle.businessConcept.whyNow}`,
          "### Top 3 risks",
          ...bundle.businessConcept.topRisks.map((risk) => `- ${risk}`),
          "",
        ]
      : []),
    ...(alignment !== undefined ? [`## Selected framing ID: ${alignment.selectedFramingId}`, ""] : []),
    ...(bundle?.sessionNotesWeek1 !== undefined
      ? ["## Session notes", bundle.sessionNotesWeek1.notes, ""]
      : []),
  ].join("\n");
}

export function buildWeek2HomeworkMarkdown(input: {
  initiative: Initiative;
  bundle?: CohortDiscoveryBundle;
}): string {
  const { initiative, bundle } = input;
  if (bundle?.businessCase === undefined || bundle.mvpScope === undefined) {
    return `# Week 2 Homework — ${initiative.title}\n\nIncomplete — finish business case and MVP scope in ARISE.`;
  }

  return [
    `# Week 2 Homework — ${initiative.title}`,
    "",
    "## Business case",
    `- ICP: ${bundle.businessCase.icp}`,
    `- Problem: ${bundle.businessCase.problem}`,
    `- Value: ${bundle.businessCase.valueProposition}`,
    `- Acquisition: ${bundle.businessCase.acquisitionStrategy}`,
    "### Revenue options",
    ...bundle.businessCase.revenueModelOptions.map((option) => `- ${option}`),
    "### Risks",
    ...bundle.businessCase.risks.map((risk) => `- ${risk}`),
    "",
    "## MVP definition",
    "### Core features (1–2)",
    ...bundle.mvpScope.coreFeatures.map((feature) => `- ${feature}`),
    "### What NOT to build",
    ...bundle.mvpScope.notToBuild.map((item) => `- ${item}`),
    `- Fastest path to value: ${bundle.mvpScope.fastestPathToValue}`,
    "",
    ...(bundle.revenueHypothesis !== undefined
      ? [
          "## Revenue hypothesis",
          `- Model: ${bundle.revenueHypothesis.chosenModel}`,
          `- Pricing: ${bundle.revenueHypothesis.pricingStartingPoint}`,
          `- Killer assumption: ${bundle.revenueHypothesis.killerAssumption}`,
          "",
        ]
      : []),
    ...(bundle.simplicityCheck !== undefined
      ? ["## 30% reduction check", bundle.simplicityCheck, ""]
      : []),
    ...(bundle.sessionNotesWeek2 !== undefined
      ? ["## Session notes", bundle.sessionNotesWeek2.notes, ""]
      : []),
  ].join("\n");
}

export function buildWeek3HomeworkMarkdown(input: {
  initiative: Initiative;
  bundle?: CohortDiscoveryBundle;
}): string {
  const { initiative, bundle } = input;
  if (bundle?.persona === undefined || bundle.userFlow === undefined || bundle.brd === undefined) {
    return `# Week 3 Homework — ${initiative.title}\n\nIncomplete — finish persona, flow, story map, and BRD in ARISE.`;
  }

  return [
    `# Week 3 Homework — ${initiative.title}`,
    "",
    "## Persona",
    `- Name: ${bundle.persona.name}`,
    `- Role: ${bundle.persona.role}`,
    `- Income: ${bundle.persona.incomeLevel}`,
    `- Pay trigger: ${bundle.persona.payTrigger}`,
    "",
    "## User flow",
    ...bundle.userFlow.steps.map(
      (step) => `${String(step.stepNumber)}. ${step.userAction} → ${step.systemResponse}`,
    ),
    `- Value delivered: ${bundle.userFlow.valueDelivered}`,
    "",
    ...(bundle.storyMap !== undefined
      ? [
          "## Story map",
          ...bundle.storyMap.steps.flatMap((step) => [
            `### ${step.stepTitle}`,
            ...step.tasks.map((task) => `- ${task.title}${task.inMvp ? " (MVP)" : ""}`),
          ]),
          "",
        ]
      : []),
    "## BRD",
    bundle.brd.fullDocument,
    "",
    ...(bundle.sessionNotesWeek3 !== undefined
      ? ["## Session notes", bundle.sessionNotesWeek3.notes, ""]
      : []),
  ].join("\n");
}
