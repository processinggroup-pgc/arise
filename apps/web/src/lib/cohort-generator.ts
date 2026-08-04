import {
  ClaudeCohortGenerator,
  ClaudeJsonGenerator,
  ResilientCohortGenerator,
  RuleBasedCohortGenerator,
  type CohortGenerator,
} from "@arise/application";

let cohortGenerator: CohortGenerator | undefined;

export function getCohortGenerator(): CohortGenerator {
  cohortGenerator ??= (() => {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    const ruleBased = new RuleBasedCohortGenerator();
    if (apiKey === undefined || apiKey.trim().length === 0) {
      return ruleBased;
    }
    const model = process.env["ANTHROPIC_MODEL"]?.trim();
    return new ResilientCohortGenerator(
      new ClaudeCohortGenerator(
        new ClaudeJsonGenerator({
          apiKey: apiKey.trim(),
          ...(model !== undefined && model.length > 0 ? { model } : {}),
        }),
      ),
    );
  })();
  return cohortGenerator;
}
