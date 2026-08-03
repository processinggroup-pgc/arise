export const ORGANIZATION_PLANS = ["starter", "team", "enterprise"] as const;
export type OrganizationPlan = (typeof ORGANIZATION_PLANS)[number];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  dataRegion: string;
  createdAt: Date;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  plan: string;
  dataRegion: string;
}

export interface CreateOrganizationMetadata {
  id: string;
  createdAt: Date;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeOrganizationSlug(value: string): string {
  const slug = value.trim().toLowerCase().replace(/\s+/g, "-");

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("Organization slug is invalid");
  }

  return slug;
}

function assertOrganizationPlan(plan: string): OrganizationPlan {
  if (!(ORGANIZATION_PLANS as readonly string[]).includes(plan)) {
    throw new Error("Organization plan is invalid");
  }

  return plan as OrganizationPlan;
}

export function createOrganization(
  input: CreateOrganizationInput,
  metadata: CreateOrganizationMetadata,
): Organization {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error("Organization name is required");
  }

  return {
    id: metadata.id,
    name,
    slug: normalizeOrganizationSlug(input.slug),
    plan: assertOrganizationPlan(input.plan),
    dataRegion: input.dataRegion.trim(),
    createdAt: metadata.createdAt,
  };
}
