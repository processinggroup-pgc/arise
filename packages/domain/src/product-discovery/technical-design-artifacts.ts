import type { SessionNotes } from "./cohort-artifacts.js";

export interface SystemArchitecture {
  frontend: string;
  backend: string;
  database: string;
  apis: string;
  summary: string;
}

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  hosting: string;
  rationale: string;
}

export interface DataModelEntity {
  name: string;
  fields: string[];
  relationships: string[];
}

export interface DataModel {
  entities: DataModelEntity[];
}

export interface GapAnalysisReport {
  missingFeatures: string[];
  edgeCases: string[];
  userFlowGaps: string[];
  technicalRisks: string[];
  silentFailures: string[];
}

export interface DeeperGapCheck {
  failureModes: string[];
  risks: string[];
  weakAssumptions: string[];
}

export interface SystemValidation {
  correctnessNotes: string[];
  completenessNotes: string[];
  userFlowAlignment: string;
}

export interface TechnicalDesignBundle {
  id: string;
  initiativeId: string;
  organizationId: string;
  architecture?: SystemArchitecture;
  techStack?: TechStack;
  dataModel?: DataModel;
  gapAnalysis?: GapAnalysisReport;
  deeperGapCheck?: DeeperGapCheck;
  systemValidation?: SystemValidation;
  sessionNotesStep4?: SessionNotes;
  updatedAt: Date;
}

export interface CreateTechnicalDesignBundleInput {
  initiativeId: string;
  organizationId: string;
}

export interface CreateTechnicalDesignBundleMetadata {
  id: string;
  updatedAt: Date;
}

export function createTechnicalDesignBundle(
  input: CreateTechnicalDesignBundleInput,
  metadata: CreateTechnicalDesignBundleMetadata,
): TechnicalDesignBundle {
  const initiativeId = input.initiativeId.trim();
  const organizationId = input.organizationId.trim();

  if (initiativeId.length === 0 || organizationId.length === 0) {
    throw new Error("Technical design bundle identifiers are required");
  }

  return {
    id: metadata.id,
    initiativeId,
    organizationId,
    updatedAt: metadata.updatedAt,
  };
}

export function mergeTechnicalDesignBundle(
  bundle: TechnicalDesignBundle,
  patch: Partial<Omit<TechnicalDesignBundle, "id" | "initiativeId" | "organizationId">>,
  updatedAt: Date,
): TechnicalDesignBundle {
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

/** Ensures jsonb-loaded bundles have safe defaults for optional array fields. */
export function normalizeTechnicalDesignBundle(
  bundle: TechnicalDesignBundle,
): TechnicalDesignBundle {
  const normalized: TechnicalDesignBundle = { ...bundle };

  if (bundle.dataModel !== undefined) {
    const entities = Array.isArray(bundle.dataModel.entities) ? bundle.dataModel.entities : [];
    normalized.dataModel = {
      entities: entities.map((entity) => ({
        name: typeof entity.name === "string" ? entity.name : "",
        fields: normalizeStringArray(entity.fields),
        relationships: normalizeStringArray(entity.relationships),
      })),
    };
  }

  if (bundle.gapAnalysis !== undefined) {
    normalized.gapAnalysis = {
      missingFeatures: normalizeStringArray(bundle.gapAnalysis.missingFeatures),
      edgeCases: normalizeStringArray(bundle.gapAnalysis.edgeCases),
      userFlowGaps: normalizeStringArray(bundle.gapAnalysis.userFlowGaps),
      technicalRisks: normalizeStringArray(bundle.gapAnalysis.technicalRisks),
      silentFailures: normalizeStringArray(bundle.gapAnalysis.silentFailures),
    };
  }

  if (bundle.deeperGapCheck !== undefined) {
    normalized.deeperGapCheck = {
      failureModes: normalizeStringArray(bundle.deeperGapCheck.failureModes),
      risks: normalizeStringArray(bundle.deeperGapCheck.risks),
      weakAssumptions: normalizeStringArray(bundle.deeperGapCheck.weakAssumptions),
    };
  }

  if (bundle.systemValidation !== undefined) {
    normalized.systemValidation = {
      correctnessNotes: normalizeStringArray(bundle.systemValidation.correctnessNotes),
      completenessNotes: normalizeStringArray(bundle.systemValidation.completenessNotes),
      userFlowAlignment:
        typeof bundle.systemValidation.userFlowAlignment === "string"
          ? bundle.systemValidation.userFlowAlignment
          : "",
    };
  }

  return normalized;
}
