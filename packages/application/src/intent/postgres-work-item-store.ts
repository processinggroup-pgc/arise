import type {
  AcceptanceCriterion,
  DataClassification,
  UnresolvedQuestion,
  WorkItem,
  WorkItemRiskLevel,
  WorkItemState,
  WorkItemType,
} from "@arise/domain";

import type { PostgresQueryable } from "../persistence/postgres-tenant-session.js";
import type { WorkItemStore } from "./work-item-store.js";

interface WorkItemRow {
  id: string;
  lineage_id: string;
  version: number;
  project_id: string;
  organization_id: string;
  title: string;
  type: WorkItemType;
  state: WorkItemState;
  risk_level: WorkItemRiskLevel;
  owner_id: string;
  problem_statement: string;
  target_user: string;
  current_behavior: string;
  desired_behavior: string;
  measurable_outcome: string;
  data_classification: DataClassification;
  constraints: string[];
  non_goals: string[];
  affected_systems: string[];
  dependencies: string[];
  decision_authority: string;
  unresolved_questions: UnresolvedQuestion[];
  acceptance_criteria: AcceptanceCriterion[];
  created_at: Date;
}

function mapWorkItem(row: WorkItemRow): WorkItem {
  return {
    id: row.id,
    lineageId: row.lineage_id,
    version: row.version,
    projectId: row.project_id,
    organizationId: row.organization_id,
    title: row.title,
    type: row.type,
    state: row.state,
    riskLevel: row.risk_level,
    ownerId: row.owner_id,
    problemStatement: row.problem_statement,
    targetUser: row.target_user,
    currentBehavior: row.current_behavior,
    desiredBehavior: row.desired_behavior,
    measurableOutcome: row.measurable_outcome,
    dataClassification: row.data_classification,
    constraints: row.constraints,
    nonGoals: row.non_goals,
    affectedSystems: row.affected_systems,
    dependencies: row.dependencies,
    decisionAuthority: row.decision_authority,
    unresolvedQuestions: row.unresolved_questions,
    acceptanceCriteria: row.acceptance_criteria,
    createdAt: row.created_at,
  };
}

const WORK_ITEM_SELECT = `
  select
    id,
    lineage_id,
    version,
    project_id,
    organization_id,
    title,
    type,
    state,
    risk_level,
    owner_id,
    problem_statement,
    target_user,
    current_behavior,
    desired_behavior,
    measurable_outcome,
    data_classification,
    constraints,
    non_goals,
    affected_systems,
    dependencies,
    decision_authority,
    unresolved_questions,
    acceptance_criteria,
    created_at
  from public.arise_work_items
`;

export class PostgresWorkItemStore implements WorkItemStore {
  constructor(private readonly client: PostgresQueryable) {}

  async saveWorkItemVersion(workItem: WorkItem): Promise<void> {
    await this.client.query(
      `
      insert into public.arise_work_items (
        id,
        lineage_id,
        version,
        project_id,
        organization_id,
        title,
        type,
        state,
        risk_level,
        owner_id,
        problem_statement,
        target_user,
        current_behavior,
        desired_behavior,
        measurable_outcome,
        data_classification,
        constraints,
        non_goals,
        affected_systems,
        dependencies,
        decision_authority,
        unresolved_questions,
        acceptance_criteria,
        created_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24
      )
      on conflict (id) do update
      set
        lineage_id = excluded.lineage_id,
        version = excluded.version,
        project_id = excluded.project_id,
        organization_id = excluded.organization_id,
        title = excluded.title,
        type = excluded.type,
        state = excluded.state,
        risk_level = excluded.risk_level,
        owner_id = excluded.owner_id,
        problem_statement = excluded.problem_statement,
        target_user = excluded.target_user,
        current_behavior = excluded.current_behavior,
        desired_behavior = excluded.desired_behavior,
        measurable_outcome = excluded.measurable_outcome,
        data_classification = excluded.data_classification,
        constraints = excluded.constraints,
        non_goals = excluded.non_goals,
        affected_systems = excluded.affected_systems,
        dependencies = excluded.dependencies,
        decision_authority = excluded.decision_authority,
        unresolved_questions = excluded.unresolved_questions,
        acceptance_criteria = excluded.acceptance_criteria
      `,
      [
        workItem.id,
        workItem.lineageId,
        workItem.version,
        workItem.projectId,
        workItem.organizationId,
        workItem.title,
        workItem.type,
        workItem.state,
        workItem.riskLevel,
        workItem.ownerId,
        workItem.problemStatement,
        workItem.targetUser,
        workItem.currentBehavior,
        workItem.desiredBehavior,
        workItem.measurableOutcome,
        workItem.dataClassification,
        workItem.constraints,
        workItem.nonGoals,
        workItem.affectedSystems,
        workItem.dependencies,
        workItem.decisionAuthority,
        workItem.unresolvedQuestions,
        workItem.acceptanceCriteria,
        workItem.createdAt,
      ],
    );
  }

  async findWorkItemVersionById(id: string): Promise<WorkItem | undefined> {
    const result = (await this.client.query(`${WORK_ITEM_SELECT} where id = $1`, [id])) as {
      rows: WorkItemRow[];
    };

    const row = result.rows[0];
    return row === undefined ? undefined : mapWorkItem(row);
  }

  async findLatestByLineageId(lineageId: string): Promise<WorkItem | undefined> {
    const result = (await this.client.query(
      `${WORK_ITEM_SELECT} where lineage_id = $1 order by version desc limit 1`,
      [lineageId],
    )) as { rows: WorkItemRow[] };

    const row = result.rows[0];
    return row === undefined ? undefined : mapWorkItem(row);
  }

  async listVersionsByLineageId(lineageId: string): Promise<WorkItem[]> {
    const result = (await this.client.query(
      `${WORK_ITEM_SELECT} where lineage_id = $1 order by version asc`,
      [lineageId],
    )) as { rows: WorkItemRow[] };

    return result.rows.map(mapWorkItem);
  }

  async listWorkItemsForProject(projectId: string): Promise<WorkItem[]> {
    const result = (await this.client.query(
      `
      select distinct on (lineage_id)
        id,
        lineage_id,
        version,
        project_id,
        organization_id,
        title,
        type,
        state,
        risk_level,
        owner_id,
        problem_statement,
        target_user,
        current_behavior,
        desired_behavior,
        measurable_outcome,
        data_classification,
        constraints,
        non_goals,
        affected_systems,
        dependencies,
        decision_authority,
        unresolved_questions,
        acceptance_criteria,
        created_at
      from public.arise_work_items
      where project_id = $1
      order by lineage_id, version desc
      `,
      [projectId],
    )) as { rows: WorkItemRow[] };

    return result.rows
      .map(mapWorkItem)
      .sort((left, right) => left.title.localeCompare(right.title));
  }
}
