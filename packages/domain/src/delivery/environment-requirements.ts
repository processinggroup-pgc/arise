import { validateEnvironment } from "../env/validate-environment.js";

export const ENVIRONMENT_REQUIREMENT_ENVIRONMENTS = ["preview", "production"] as const;
export type EnvironmentRequirementEnvironment =
  (typeof ENVIRONMENT_REQUIREMENT_ENVIRONMENTS)[number];

export interface EnvironmentRequirement {
  key: string;
  required: boolean;
  valueRef: string;
}

export interface EnvironmentRequirementsManifest {
  environment: EnvironmentRequirementEnvironment;
  requirements: EnvironmentRequirement[];
}

export interface EnvironmentRequirementsValidationResult {
  valid: boolean;
  errors: string[];
}

export interface EnvironmentRequirementsComparison {
  compatible: boolean;
  missingInPreview: string[];
  missingInProduction: string[];
  unsafeKeys: string[];
  comparedKeys: string[];
}

function assertEnvironmentRequirementEnvironment(
  environment: string,
): EnvironmentRequirementEnvironment {
  if (!(ENVIRONMENT_REQUIREMENT_ENVIRONMENTS as readonly string[]).includes(environment)) {
    throw new Error("Environment requirements environment is invalid");
  }

  return environment as EnvironmentRequirementEnvironment;
}

function normalizeRequirement(requirement: EnvironmentRequirement): EnvironmentRequirement {
  return {
    key: requirement.key.trim(),
    required: requirement.required,
    valueRef: requirement.valueRef.trim(),
  };
}

export function validateEnvironmentRequirementsManifest(
  manifest: EnvironmentRequirementsManifest,
): EnvironmentRequirementsValidationResult {
  assertEnvironmentRequirementEnvironment(manifest.environment);

  const envRecord: Record<string, string> = {};
  for (const requirement of manifest.requirements) {
    const normalized = normalizeRequirement(requirement);
    if (normalized.key.length === 0) {
      return {
        valid: false,
        errors: ["Environment requirement key is required"],
      };
    }

    envRecord[normalized.key] = normalized.valueRef;
  }

  const validation = validateEnvironment(envRecord);

  return {
    valid: validation.valid,
    errors: validation.errors,
  };
}

function requiredKeys(manifest: EnvironmentRequirementsManifest): string[] {
  return manifest.requirements
    .map(normalizeRequirement)
    .filter((requirement) => requirement.required)
    .map((requirement) => requirement.key)
    .sort((left, right) => left.localeCompare(right));
}

function unsafeKeys(manifest: EnvironmentRequirementsManifest): string[] {
  const validation = validateEnvironmentRequirementsManifest(manifest);
  if (validation.valid) {
    return [];
  }

  return manifest.requirements
    .map(normalizeRequirement)
    .filter((requirement) =>
      validation.errors.some((error) => error.startsWith(`${requirement.key} `)),
    )
    .map((requirement) => requirement.key);
}

export function compareEnvironmentRequirements(
  preview: EnvironmentRequirementsManifest,
  production: EnvironmentRequirementsManifest,
): EnvironmentRequirementsComparison {
  const previewValidation = validateEnvironmentRequirementsManifest(preview);
  const productionValidation = validateEnvironmentRequirementsManifest(production);

  const previewKeys = new Set(requiredKeys(preview));
  const productionKeys = new Set(requiredKeys(production));

  const missingInPreview = [...productionKeys].filter((key) => !previewKeys.has(key));
  const missingInProduction = [...previewKeys].filter((key) => !productionKeys.has(key));
  const unsafe = [...new Set([...unsafeKeys(preview), ...unsafeKeys(production)])].sort();
  const comparedKeys = [...new Set([...previewKeys, ...productionKeys])].sort();

  const compatible =
    previewValidation.valid &&
    productionValidation.valid &&
    missingInPreview.length === 0 &&
    unsafe.length === 0;

  return {
    compatible,
    missingInPreview,
    missingInProduction,
    unsafeKeys: unsafe,
    comparedKeys,
  };
}
