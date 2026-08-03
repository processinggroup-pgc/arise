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
    return new ResilientCohortGenerator(
      new ClaudeCohortGenerator(new ClaudeJsonGenerator({ apiKey: apiKey.trim() })),
    );
  })();
  return cohortGenerator;
}
