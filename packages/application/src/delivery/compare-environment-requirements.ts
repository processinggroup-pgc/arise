import {
  compareEnvironmentRequirements,
  validateEnvironmentRequirementsManifest,
  type EnvironmentRequirementsComparison,
  type EnvironmentRequirementsManifest,
  type EnvironmentRequirementsValidationResult,
} from "@arise/domain";

export interface CompareEnvironmentRequirementsCommand {
  preview: EnvironmentRequirementsManifest;
  production: EnvironmentRequirementsManifest;
}

export interface CompareEnvironmentRequirementsResult {
  previewValidation: EnvironmentRequirementsValidationResult;
  productionValidation: EnvironmentRequirementsValidationResult;
  comparison: EnvironmentRequirementsComparison;
}

export function compareEnvironmentRequirementsForDelivery(
  command: CompareEnvironmentRequirementsCommand,
): CompareEnvironmentRequirementsResult {
  const previewValidation = validateEnvironmentRequirementsManifest(command.preview);
  const productionValidation = validateEnvironmentRequirementsManifest(command.production);

  return {
    previewValidation,
    productionValidation,
    comparison: compareEnvironmentRequirements(command.preview, command.production),
  };
}
