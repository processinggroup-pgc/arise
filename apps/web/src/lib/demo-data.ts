import {
  createOrganization,
  createOrganizationMembership,
  createProject,
  createWorkItem,
} from "@arise/domain";

import { getIdentityStore } from "./identity-store";
import { getProjectStore, getWorkItemStore } from "./stores";

export const DEMO_ORG_ID = "org_demo";
export const DEMO_USER_ID = "user_demo";
export const DEMO_PROJECT_ID = "project_demo";

const DEMO_CREATED_AT = new Date("2026-08-03T12:00:00.000Z");

let seeded = false;

async function seedWorkItem(input: {
  id: string;
  lineageId: string;
  title: string;
  type: "feature" | "bug" | "improvement" | "spike";
  state:
    | "draft"
    | "assessing"
    | "not_ready"
    | "ready_for_recommendation"
    | "recommendation_pending"
    | "plan_approved"
    | "implementing"
    | "verifying"
    | "preview_ready"
    | "release_review"
    | "released";
  riskLevel: "low" | "medium" | "high";
  problemStatement: string;
  targetUser: string;
  desiredBehavior: string;
  acceptanceCriteria: Array<{ given: string; when: string; then: string }>;
}): Promise<void> {
  const workItem = createWorkItem(
    {
      projectId: DEMO_PROJECT_ID,
      organizationId: DEMO_ORG_ID,
      title: input.title,
      type: input.type,
      state: input.state,
      riskLevel: input.riskLevel,
      ownerId: DEMO_USER_ID,
      problemStatement: input.problemStatement,
      targetUser: input.targetUser,
      desiredBehavior: input.desiredBehavior,
      dataClassification: "internal",
      acceptanceCriteria: input.acceptanceCriteria,
    },
    {
      id: input.id,
      lineageId: input.lineageId,
      createdAt: DEMO_CREATED_AT,
    },
  );

  await getWorkItemStore().saveWorkItemVersion(workItem);
}

export async function ensureDemoData(): Promise<void> {
  if (process.env["DATABASE_URL"] !== undefined && process.env["DATABASE_URL"].length > 0) {
    return;
  }

  if (seeded) {
    return;
  }

  seeded = true;

  const identityStore = getIdentityStore();
  const existingOrganization = await identityStore.findOrganizationById(DEMO_ORG_ID);
  if (existingOrganization !== undefined) {
    return;
  }

  const organization = createOrganization(
    {
      name: "ARISE Demo Org",
      slug: "arise-demo",
      plan: "team",
      dataRegion: "us-east-1",
    },
    {
      id: DEMO_ORG_ID,
      createdAt: DEMO_CREATED_AT,
    },
  );

  const membership = createOrganizationMembership(
    {
      organizationId: DEMO_ORG_ID,
      userId: DEMO_USER_ID,
      role: "owner",
      status: "active",
    },
    {
      id: "membership_demo",
      createdAt: DEMO_CREATED_AT,
    },
  );

  const project = createProject(
    {
      organizationId: DEMO_ORG_ID,
      name: "Customer Portal",
      description: "Next.js delivery workspace for governed agent runs.",
    },
    {
      id: DEMO_PROJECT_ID,
      createdAt: DEMO_CREATED_AT,
    },
  );

  await identityStore.saveOrganization(organization);
  await identityStore.saveMembership(membership);
  await getProjectStore().saveProject(project);

  await seedWorkItem({
    id: "wi_memberships",
    lineageId: "lineage_memberships",
    title: "Tenant-safe membership listing",
    type: "feature",
    state: "implementing",
    riskLevel: "medium",
    problemStatement: "Operators cannot inspect memberships safely across tenants.",
    targetUser: "Platform operator",
    desiredBehavior: "Membership lists are scoped to the active organization only.",
    acceptanceCriteria: [
      {
        given: "a tenant context for organization A",
        when: "memberships are listed",
        then: "only organization A memberships are returned",
      },
    ],
  });

  await seedWorkItem({
    id: "wi_vercel",
    lineageId: "lineage_vercel",
    title: "Vercel preview provisioning",
    type: "feature",
    state: "verifying",
    riskLevel: "high",
    problemStatement: "Preview environments are created manually after each work item.",
    targetUser: "Delivery lead",
    desiredBehavior: "Preview deployments are provisioned automatically after verification gates pass.",
    acceptanceCriteria: [
      {
        given: "a work item with passing verification",
        when: "preview provisioning runs",
        then: "a Vercel preview URL is attached to the work item",
      },
    ],
  });

  await seedWorkItem({
    id: "wi_budget",
    lineageId: "lineage_budget",
    title: "Budget threshold enforcement",
    type: "improvement",
    state: "plan_approved",
    riskLevel: "medium",
    problemStatement: "Agent runs can exceed work item budgets without pause.",
    targetUser: "Operations lead",
    desiredBehavior: "Runs pause when projected cost exceeds the approved threshold.",
    acceptanceCriteria: [
      {
        given: "a work item near its budget threshold",
        when: "a costly agent action is requested",
        then: "execution pauses until budget approval is granted",
      },
    ],
  });

  await seedWorkItem({
    id: "wi_release",
    lineageId: "lineage_release",
    title: "Release evidence generation",
    type: "feature",
    state: "released",
    riskLevel: "low",
    problemStatement: "Release reviewers lack a consolidated evidence package.",
    targetUser: "Release approver",
    desiredBehavior: "Release evidence summarizes tests, policy checks, and approvals.",
    acceptanceCriteria: [
      {
        given: "a work item in release review",
        when: "release evidence is generated",
        then: "reviewers receive requirement coverage and gate summaries",
      },
    ],
  });

  await seedWorkItem({
    id: "wi_index",
    lineageId: "lineage_index",
    title: "Repository index onboarding",
    type: "spike",
    state: "assessing",
    riskLevel: "medium",
    problemStatement: "New repositories lack an indexed map for agent context retrieval.",
    targetUser: "Technical consultant",
    desiredBehavior: "Repository files, symbols, and tests are indexed before agent runs.",
    acceptanceCriteria: [
      {
        given: "a connected GitHub repository",
        when: "onboarding completes",
        then: "repository intelligence artifacts are available to agents",
      },
    ],
  });
}
