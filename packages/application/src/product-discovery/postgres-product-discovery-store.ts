import type {
  Initiative,
  InitiativeState,
  MarketResearchDossier,
  ProblemAlignment,
  ProblemBrief,
} from "@arise/domain";

import type { PostgresQueryable } from "../persistence/postgres-tenant-session.js";
import type {
  InitiativeStore,
  MarketResearchStore,
  ProblemAlignmentStore,
  ProblemBriefStore,
} from "./product-discovery-store.js";

interface InitiativeRow {
  id: string;
  organization_id: string;
  title: string;
  state: InitiativeState;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

interface ProblemBriefRow {
  id: string;
  initiative_id: string;
  organization_id: string;
  raw_problem_description: string;
  target_audience: string;
  pain_points: string[];
  business_context: string;
  desired_outcome: string;
  created_at: Date;
}

interface MarketResearchRow {
  id: string;
  initiative_id: string;
  organization_id: string;
  summary: string;
  market_trends: string[];
  comparable_approaches: MarketResearchDossier["comparableApproaches"];
  citations: MarketResearchDossier["citations"];
  framing_options: MarketResearchDossier["framingOptions"];
  generated_at: Date;
}

interface ProblemAlignmentRow {
  id: string;
  initiative_id: string;
  organization_id: string;
  selected_framing_id: string;
  user_elaboration: string;
  aligned_at: Date;
}

function mapInitiative(row: InitiativeRow): Initiative {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    state: row.state,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProblemBrief(row: ProblemBriefRow): ProblemBrief {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    organizationId: row.organization_id,
    rawProblemDescription: row.raw_problem_description,
    targetAudience: row.target_audience,
    painPoints: row.pain_points,
    businessContext: row.business_context,
    desiredOutcome: row.desired_outcome,
    createdAt: row.created_at,
  };
}

function mapMarketResearch(row: MarketResearchRow): MarketResearchDossier {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    organizationId: row.organization_id,
    summary: row.summary,
    marketTrends: row.market_trends,
    comparableApproaches: row.comparable_approaches,
    citations: row.citations,
    framingOptions: row.framing_options,
    generatedAt: row.generated_at,
  };
}

function mapProblemAlignment(row: ProblemAlignmentRow): ProblemAlignment {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    organizationId: row.organization_id,
    selectedFramingId: row.selected_framing_id,
    userElaboration: row.user_elaboration,
    alignedAt: row.aligned_at,
  };
}

export class PostgresInitiativeStore implements InitiativeStore {
  constructor(private readonly client: PostgresQueryable) {}

  async saveInitiative(initiative: Initiative): Promise<void> {
    await this.client.query(
      `
      insert into public.initiatives (
        id, organization_id, title, state, owner_id, created_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (id) do update
      set
        organization_id = excluded.organization_id,
        title = excluded.title,
        state = excluded.state,
        owner_id = excluded.owner_id,
        updated_at = excluded.updated_at
      `,
      [
        initiative.id,
        initiative.organizationId,
        initiative.title,
        initiative.state,
        initiative.ownerId,
        initiative.createdAt,
        initiative.updatedAt,
      ],
    );
  }

  async findInitiativeById(initiativeId: string): Promise<Initiative | undefined> {
    const result = (await this.client.query(
      `
      select id, organization_id, title, state, owner_id, created_at, updated_at
      from public.initiatives
      where id = $1
      `,
      [initiativeId],
    )) as { rows: InitiativeRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapInitiative(row);
  }

  async listInitiativesForOrganization(organizationId: string): Promise<Initiative[]> {
    const result = (await this.client.query(
      `
      select id, organization_id, title, state, owner_id, created_at, updated_at
      from public.initiatives
      where organization_id = $1
      order by updated_at desc
      `,
      [organizationId],
    )) as { rows: InitiativeRow[] };

    return result.rows.map(mapInitiative);
  }
}

export class PostgresProblemBriefStore implements ProblemBriefStore {
  constructor(private readonly client: PostgresQueryable) {}

  async saveProblemBrief(problemBrief: ProblemBrief): Promise<void> {
    await this.client.query(
      `
      insert into public.problem_briefs (
        id,
        initiative_id,
        organization_id,
        raw_problem_description,
        target_audience,
        pain_points,
        business_context,
        desired_outcome,
        created_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      on conflict (initiative_id) do update
      set
        organization_id = excluded.organization_id,
        raw_problem_description = excluded.raw_problem_description,
        target_audience = excluded.target_audience,
        pain_points = excluded.pain_points,
        business_context = excluded.business_context,
        desired_outcome = excluded.desired_outcome
      `,
      [
        problemBrief.id,
        problemBrief.initiativeId,
        problemBrief.organizationId,
        problemBrief.rawProblemDescription,
        problemBrief.targetAudience,
        problemBrief.painPoints,
        problemBrief.businessContext,
        problemBrief.desiredOutcome,
        problemBrief.createdAt,
      ],
    );
  }

  async findProblemBriefByInitiativeId(initiativeId: string): Promise<ProblemBrief | undefined> {
    const result = (await this.client.query(
      `
      select
        id,
        initiative_id,
        organization_id,
        raw_problem_description,
        target_audience,
        pain_points,
        business_context,
        desired_outcome,
        created_at
      from public.problem_briefs
      where initiative_id = $1
      `,
      [initiativeId],
    )) as { rows: ProblemBriefRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapProblemBrief(row);
  }
}

export class PostgresMarketResearchStore implements MarketResearchStore {
  constructor(private readonly client: PostgresQueryable) {}

  async saveMarketResearchDossier(dossier: MarketResearchDossier): Promise<void> {
    await this.client.query(
      `
      insert into public.market_research_dossiers (
        id,
        initiative_id,
        organization_id,
        summary,
        market_trends,
        comparable_approaches,
        citations,
        framing_options,
        generated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      on conflict (initiative_id) do update
      set
        organization_id = excluded.organization_id,
        summary = excluded.summary,
        market_trends = excluded.market_trends,
        comparable_approaches = excluded.comparable_approaches,
        citations = excluded.citations,
        framing_options = excluded.framing_options,
        generated_at = excluded.generated_at
      `,
      [
        dossier.id,
        dossier.initiativeId,
        dossier.organizationId,
        dossier.summary,
        dossier.marketTrends,
        dossier.comparableApproaches,
        dossier.citations,
        dossier.framingOptions,
        dossier.generatedAt,
      ],
    );
  }

  async findMarketResearchByInitiativeId(
    initiativeId: string,
  ): Promise<MarketResearchDossier | undefined> {
    const result = (await this.client.query(
      `
      select
        id,
        initiative_id,
        organization_id,
        summary,
        market_trends,
        comparable_approaches,
        citations,
        framing_options,
        generated_at
      from public.market_research_dossiers
      where initiative_id = $1
      `,
      [initiativeId],
    )) as { rows: MarketResearchRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapMarketResearch(row);
  }
}

export class PostgresProblemAlignmentStore implements ProblemAlignmentStore {
  constructor(private readonly client: PostgresQueryable) {}

  async saveProblemAlignment(alignment: ProblemAlignment): Promise<void> {
    await this.client.query(
      `
      insert into public.problem_alignments (
        id,
        initiative_id,
        organization_id,
        selected_framing_id,
        user_elaboration,
        aligned_at
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict (initiative_id) do update
      set
        organization_id = excluded.organization_id,
        selected_framing_id = excluded.selected_framing_id,
        user_elaboration = excluded.user_elaboration,
        aligned_at = excluded.aligned_at
      `,
      [
        alignment.id,
        alignment.initiativeId,
        alignment.organizationId,
        alignment.selectedFramingId,
        alignment.userElaboration,
        alignment.alignedAt,
      ],
    );
  }

  async findProblemAlignmentByInitiativeId(
    initiativeId: string,
  ): Promise<ProblemAlignment | undefined> {
    const result = (await this.client.query(
      `
      select
        id,
        initiative_id,
        organization_id,
        selected_framing_id,
        user_elaboration,
        aligned_at
      from public.problem_alignments
      where initiative_id = $1
      `,
      [initiativeId],
    )) as { rows: ProblemAlignmentRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapProblemAlignment(row);
  }
}
