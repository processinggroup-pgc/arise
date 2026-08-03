import type {
  DataModel,
  DeeperGapCheck,
  GapAnalysisReport,
  SystemArchitecture,
  SystemValidation,
  TechStack,
} from "@arise/domain";

import type { ClaudeJsonGenerator } from "./claude-json-generator.js";

export interface TechnicalDesignGenerator {
  generateArchitecture(brdContext: string): Promise<SystemArchitecture>;
  generateTechStack(brdContext: string): Promise<TechStack>;
  generateDataModel(brdContext: string): Promise<DataModel>;
  generateGapAnalysis(brdContext: string, designContext: string): Promise<GapAnalysisReport>;
  generateDeeperGapCheck(designContext: string): Promise<DeeperGapCheck>;
  validateSystem(brdContext: string, designContext: string): Promise<SystemValidation>;
}

export class RuleBasedTechnicalDesignGenerator implements TechnicalDesignGenerator {
  async generateArchitecture(_brdContext: string): Promise<SystemArchitecture> {
    return {
      frontend: "Marketing site + enrollment flow (Next.js)",
      backend: "Server actions and API routes for applications and payment plans",
      database: "Postgres for learners, applications, and payment plan records",
      apis: "Payment provider webhook + optional CRM sync",
      summary:
        "Learners browse plans on the frontend, submit applications via the backend, and data persists in Postgres with payment webhooks confirming enrollment.",
    };
  }

  async generateTechStack(_brdContext: string): Promise<TechStack> {
    return {
      frontend: "Next.js + React",
      backend: "Next.js server actions",
      database: "Supabase Postgres",
      hosting: "Vercel + Supabase",
      rationale: "Fast to ship solo, beginner-friendly, scales through MVP validation.",
    };
  }

  async generateDataModel(_brdContext: string): Promise<DataModel> {
    return {
      entities: [
        {
          name: "Learner",
          fields: ["id", "email", "name", "incomeBand"],
          relationships: ["has many Applications"],
        },
        {
          name: "Application",
          fields: ["id", "learnerId", "cohortId", "status", "selectedPlanId"],
          relationships: ["belongs to Learner", "belongs to PaymentPlan"],
        },
        {
          name: "PaymentPlan",
          fields: ["id", "name", "upfrontAmount", "installmentTerms"],
          relationships: ["has many Applications"],
        },
      ],
    };
  }

  async generateGapAnalysis(_brdContext: string, _designContext: string): Promise<GapAnalysisReport> {
    return {
      missingFeatures: ["Admin review queue for edge-case applications"],
      edgeCases: ["Learner selects plan then income changes before start date"],
      userFlowGaps: ["No saved draft if user abandons mid-application"],
      technicalRisks: ["Payment webhook retries could double-enroll without idempotency"],
      silentFailures: ["CRM sync fails but learner sees success screen"],
    };
  }

  async generateDeeperGapCheck(_designContext: string): Promise<DeeperGapCheck> {
    return {
      failureModes: ["Payment provider downtime blocks all enrollments"],
      risks: ["Over-scoping admin dashboard before first 10 enrollments"],
      weakAssumptions: ["All learners have email they check daily"],
    };
  }

  async validateSystem(_brdContext: string, _designContext: string): Promise<SystemValidation> {
    return {
      correctnessNotes: ["Three-entity model covers enroll-with-plan happy path"],
      completenessNotes: ["Add idempotency keys before production payment go-live"],
      userFlowAlignment: "Architecture supports 5-step enrollment flow from Step 3 BRD.",
    };
  }
}

export class ClaudeTechnicalDesignGenerator implements TechnicalDesignGenerator {
  constructor(private readonly claude: ClaudeJsonGenerator) {}

  generateArchitecture(brdContext: string): Promise<SystemArchitecture> {
    return this.claude.generate({
      system: "Return only valid JSON system architecture for an MVP.",
      prompt: `Design simple MVP architecture JSON (frontend, backend, database, apis, summary). Keep summary explainable in 60 seconds.\n${brdContext}`,
    });
  }

  generateTechStack(brdContext: string): Promise<TechStack> {
    return this.claude.generate({
      system: "Return only valid JSON tech stack recommendation.",
      prompt: `Recommend MVP tech stack JSON (frontend, backend, database, hosting, rationale). Fast and beginner-friendly.\n${brdContext}`,
    });
  }

  generateDataModel(brdContext: string): Promise<DataModel> {
    return this.claude.generate({
      system: "Return only valid JSON. Max 4 entities.",
      prompt: `Create data model JSON with entities array (name, fields, relationships). 2-4 entities max.\n${brdContext}`,
    });
  }

  generateGapAnalysis(brdContext: string, designContext: string): Promise<GapAnalysisReport> {
    return this.claude.generate({
      system: "Return only valid JSON gap analysis.",
      prompt: `Gap analysis JSON (missingFeatures, edgeCases, userFlowGaps, technicalRisks, silentFailures).\nBRD:\n${brdContext}\nDesign:\n${designContext}`,
    });
  }

  generateDeeperGapCheck(designContext: string): Promise<DeeperGapCheck> {
    return this.claude.generate({
      system: "Return only valid JSON.",
      prompt: `Critical gap check JSON (failureModes, risks, weakAssumptions).\n${designContext}`,
    });
  }

  validateSystem(brdContext: string, designContext: string): Promise<SystemValidation> {
    return this.claude.generate({
      system: "Return only valid JSON system validation.",
      prompt: `Validate design JSON (correctnessNotes, completenessNotes, userFlowAlignment).\nBRD:\n${brdContext}\nDesign:\n${designContext}`,
    });
  }
}

export class ResilientTechnicalDesignGenerator implements TechnicalDesignGenerator {
  private readonly fallback = new RuleBasedTechnicalDesignGenerator();

  constructor(private readonly primary: TechnicalDesignGenerator) {}

  private withFallback<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    return operation().catch(() => fallback());
  }

  generateArchitecture(brdContext: string): Promise<SystemArchitecture> {
    return this.withFallback(
      () => this.primary.generateArchitecture(brdContext),
      () => this.fallback.generateArchitecture(brdContext),
    );
  }

  generateTechStack(brdContext: string): Promise<TechStack> {
    return this.withFallback(
      () => this.primary.generateTechStack(brdContext),
      () => this.fallback.generateTechStack(brdContext),
    );
  }

  generateDataModel(brdContext: string): Promise<DataModel> {
    return this.withFallback(
      () => this.primary.generateDataModel(brdContext),
      () => this.fallback.generateDataModel(brdContext),
    );
  }

  generateGapAnalysis(brdContext: string, designContext: string): Promise<GapAnalysisReport> {
    return this.withFallback(
      () => this.primary.generateGapAnalysis(brdContext, designContext),
      () => this.fallback.generateGapAnalysis(brdContext, designContext),
    );
  }

  generateDeeperGapCheck(designContext: string): Promise<DeeperGapCheck> {
    return this.withFallback(
      () => this.primary.generateDeeperGapCheck(designContext),
      () => this.fallback.generateDeeperGapCheck(designContext),
    );
  }

  validateSystem(brdContext: string, designContext: string): Promise<SystemValidation> {
    return this.withFallback(
      () => this.primary.validateSystem(brdContext, designContext),
      () => this.fallback.validateSystem(brdContext, designContext),
    );
  }
}
