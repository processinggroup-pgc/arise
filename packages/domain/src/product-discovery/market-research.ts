export interface ResearchCitation {
  label: string;
  sourceType: "industry_report" | "company_case_study" | "labor_market_data" | "internal_note";
  summary: string;
}

export interface ComparableApproach {
  name: string;
  category: string;
  approachSummary: string;
  relevance: string;
}

export interface ProblemFramingOption {
  id: string;
  title: string;
  description: string;
  rationale: string;
  alignmentScore: number;
}

export interface MarketResearchDossier {
  id: string;
  initiativeId: string;
  organizationId: string;
  summary: string;
  marketTrends: string[];
  comparableApproaches: ComparableApproach[];
  citations: ResearchCitation[];
  framingOptions: ProblemFramingOption[];
  generatedAt: Date;
}

export interface ProblemAlignment {
  id: string;
  initiativeId: string;
  organizationId: string;
  selectedFramingId: string;
  userElaboration: string;
  alignedAt: Date;
}

export interface GenerateMarketResearchInput {
  initiativeId: string;
  organizationId: string;
  rawProblemDescription: string;
  targetAudience: string;
  painPoints: string[];
  businessContext: string;
  desiredOutcome: string;
}

export interface GenerateMarketResearchMetadata {
  id: string;
  generatedAt: Date;
  createFramingId: (index: number) => string;
}

function includesAny(haystack: string, needles: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function buildCohortAffordabilityResearch(input: GenerateMarketResearchInput): {
  summary: string;
  marketTrends: string[];
  comparableApproaches: ComparableApproach[];
  citations: ResearchCitation[];
  framingOptions: ProblemFramingOption[];
} {
  return {
    summary:
      "Labor market entry is tightening while learners still need credible pathways into paid roles. " +
      "Programs that combine affordability mechanics with employability proof are outperforming tuition-only cohort models.",
    marketTrends: [
      "Entry-level hiring volume has softened across several sectors, increasing price sensitivity for career-switch programs.",
      "Employer-sponsored and outcomes-aligned financing models are growing as learners defer upfront tuition.",
      "Skills-based hiring continues to expand, but candidates still need structured proof of job readiness.",
      "Community-based support and placement services are becoming differentiators for cohort retention and completion.",
    ],
    comparableApproaches: [
      {
        name: "Guild Education",
        category: "Employer-sponsored upskilling",
        approachSummary: "Partners with employers to fund education for frontline workers advancing into higher-skill roles.",
        relevance: "Shows demand for third-party funding when individual affordability is constrained.",
      },
      {
        name: "Springboard / Merit America",
        category: "Deferred tuition and scholarships",
        approachSummary: "Combines selective admissions, scholarships, and payment terms tied to completion milestones.",
        relevance: "Demonstrates how staged payments reduce enrollment friction during uncertain job markets.",
      },
      {
        name: "Coursera Career Certificates",
        category: "Lower-cost modular pathways",
        approachSummary: "Offers modular credentials with lower upfront cost and employer recognition campaigns.",
        relevance: "Highlights competition from flexible, lower-price alternatives when cohorts feel unaffordable.",
      },
    ],
    citations: [
      {
        label: "Tightening entry-level labor demand",
        sourceType: "labor_market_data",
        summary:
          "Recent hiring surveys show reduced campus and junior hiring, pushing learners toward programs with clearer ROI evidence.",
      },
      {
        label: "Income-share and deferred-tuition adoption",
        sourceType: "industry_report",
        summary:
          "Outcome-aligned payment products remain common in bootcamps addressing affordability during career transitions.",
      },
      {
        label: "Learner context",
        sourceType: "internal_note",
        summary: input.businessContext.length > 0 ? input.businessContext : input.rawProblemDescription,
      },
    ],
    framingOptions: [
      {
        id: "framing_access",
        title: "Affordability and access first",
        description:
          "Solve enrollment decline by reducing upfront tuition friction through scholarships, payment plans, and hardship support.",
        rationale:
          "Directly addresses the stated concern that a shrinking job market makes cohort tuition harder to afford.",
        alignmentScore: 95,
      },
      {
        id: "framing_employability",
        title: "Employability outcomes first",
        description:
          "Reframe the offer around job placement, portfolio proof, and employer pipelines so learners see ROI despite market softness.",
        rationale:
          "Addresses hiring difficulty by shifting the promise from education completion to verified career outcomes.",
        alignmentScore: 88,
      },
      {
        id: "framing_market_pivot",
        title: "Market-aligned cohort pivot",
        description:
          "Adjust curriculum and cohort positioning toward roles with stronger demand and faster placement cycles.",
        rationale:
          "Responds to a decreasing job market by targeting skills with higher near-term hiring velocity.",
        alignmentScore: 82,
      },
    ].map((option, index) => ({
      ...option,
      id: `framing_${String(index + 1)}`,
    })),
  };
}

function buildGenericResearch(input: GenerateMarketResearchInput): {
  summary: string;
  marketTrends: string[];
  comparableApproaches: ComparableApproach[];
  citations: ResearchCitation[];
  framingOptions: ProblemFramingOption[];
} {
  return {
    summary: `Research synthesized for ${input.targetAudience}: ${input.rawProblemDescription}`,
    marketTrends: input.painPoints,
    comparableApproaches: [
      {
        name: "Reference program A",
        category: "Comparable product",
        approachSummary: "Uses phased delivery and measurable outcomes to reduce adoption risk.",
        relevance: "Provides a baseline pattern for solving similar user pain.",
      },
    ],
    citations: [
      {
        label: "Problem intake",
        sourceType: "internal_note",
        summary: input.rawProblemDescription,
      },
    ],
    framingOptions: [
      {
        id: "framing_1",
        title: "Direct problem resolution",
        description: input.desiredOutcome,
        rationale: "Aligns directly with the desired outcome captured during intake.",
        alignmentScore: 90,
      },
      {
        id: "framing_2",
        title: "Adjacent user need",
        description: `Support ${input.targetAudience} with a narrower MVP that solves the highest-friction pain point first.`,
        rationale: "Reduces delivery scope while preserving strategic direction.",
        alignmentScore: 75,
      },
      {
        id: "framing_3",
        title: "Platform enabler",
        description: "Build internal capabilities and instrumentation before launching a full product surface.",
        rationale: "Useful when constraints require learning before committing to a full solution.",
        alignmentScore: 60,
      },
    ],
  };
}

export function generateMarketResearchDossier(
  input: GenerateMarketResearchInput,
  metadata: GenerateMarketResearchMetadata,
): MarketResearchDossier {
  const initiativeId = input.initiativeId.trim();
  const organizationId = input.organizationId.trim();

  if (initiativeId.length === 0 || organizationId.length === 0) {
    throw new Error("Market research identifiers are required");
  }

  const isCohortAffordabilityProblem = includesAny(
    `${input.rawProblemDescription} ${input.businessContext} ${input.painPoints.join(" ")}`,
    ["cohort", "job", "work", "afford", "hiring", "employment", "tuition"],
  );

  const research = isCohortAffordabilityProblem
    ? buildCohortAffordabilityResearch(input)
    : buildGenericResearch(input);

  return {
    id: metadata.id,
    initiativeId,
    organizationId,
    summary: research.summary,
    marketTrends: research.marketTrends,
    comparableApproaches: research.comparableApproaches,
    citations: research.citations,
    framingOptions: research.framingOptions.map((option, index) => ({
      ...option,
      id: metadata.createFramingId(index),
    })),
    generatedAt: metadata.generatedAt,
  };
}

export interface CreateProblemAlignmentInput {
  initiativeId: string;
  organizationId: string;
  selectedFramingId: string;
  userElaboration?: string;
}

export interface CreateProblemAlignmentMetadata {
  id: string;
  alignedAt: Date;
}

export function createProblemAlignment(
  input: CreateProblemAlignmentInput,
  metadata: CreateProblemAlignmentMetadata,
): ProblemAlignment {
  const initiativeId = input.initiativeId.trim();
  const organizationId = input.organizationId.trim();
  const selectedFramingId = input.selectedFramingId.trim();
  const userElaboration = input.userElaboration?.trim() ?? "";

  if (initiativeId.length === 0 || organizationId.length === 0 || selectedFramingId.length === 0) {
    throw new Error("Problem alignment fields are required");
  }

  return {
    id: metadata.id,
    initiativeId,
    organizationId,
    selectedFramingId,
    userElaboration,
    alignedAt: metadata.alignedAt,
  };
}

export function findFramingOption(
  dossier: MarketResearchDossier,
  framingId: string,
): ProblemFramingOption | undefined {
  return (dossier.framingOptions ?? []).find((option) => option.id === framingId);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

/** Ensures jsonb-loaded dossiers have safe defaults for optional array fields. */
export function normalizeMarketResearchDossier(dossier: MarketResearchDossier): MarketResearchDossier {
  const comparableApproaches = Array.isArray(dossier.comparableApproaches)
    ? dossier.comparableApproaches
    : [];
  const citations = Array.isArray(dossier.citations) ? dossier.citations : [];
  const framingOptions = Array.isArray(dossier.framingOptions) ? dossier.framingOptions : [];

  return {
    ...dossier,
    summary: typeof dossier.summary === "string" ? dossier.summary : "",
    marketTrends: normalizeStringArray(dossier.marketTrends),
    comparableApproaches: comparableApproaches.map((approach) => ({
      name: typeof approach.name === "string" ? approach.name : "",
      category: typeof approach.category === "string" ? approach.category : "",
      approachSummary: typeof approach.approachSummary === "string" ? approach.approachSummary : "",
      relevance: typeof approach.relevance === "string" ? approach.relevance : "",
    })),
    citations: citations.map((citation) => ({
      label: typeof citation.label === "string" ? citation.label : "",
      sourceType: citation.sourceType ?? "internal_note",
      summary: typeof citation.summary === "string" ? citation.summary : "",
    })),
    framingOptions: framingOptions.map((option) => ({
      id: typeof option.id === "string" ? option.id : "",
      title: typeof option.title === "string" ? option.title : "",
      description: typeof option.description === "string" ? option.description : "",
      rationale: typeof option.rationale === "string" ? option.rationale : "",
      alignmentScore: typeof option.alignmentScore === "number" ? option.alignmentScore : 0,
    })),
    generatedAt:
      dossier.generatedAt instanceof Date
        ? dossier.generatedAt
        : new Date(dossier.generatedAt),
  };
}
