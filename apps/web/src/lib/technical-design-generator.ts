import {
  ClaudeJsonGenerator,
  ClaudeTechnicalDesignGenerator,
  ResilientTechnicalDesignGenerator,
  RuleBasedTechnicalDesignGenerator,
  type TechnicalDesignGenerator,
} from "@arise/application";

let technicalDesignGenerator: TechnicalDesignGenerator | undefined;

export function getTechnicalDesignGenerator(): TechnicalDesignGenerator {
  technicalDesignGenerator ??= (() => {
    const ruleBased = new RuleBasedTechnicalDesignGenerator();
    const apiKey = process.env["ANTHROPIC_API_KEY"]?.trim();
    if (apiKey === undefined || apiKey.length === 0) {
      return ruleBased;
    }
    const model = process.env["ANTHROPIC_MODEL"]?.trim();
    return new ResilientTechnicalDesignGenerator(
      new ClaudeTechnicalDesignGenerator(
        new ClaudeJsonGenerator({
          apiKey,
          ...(model !== undefined && model.length > 0 ? { model } : {}),
        }),
      ),
    );
  })();
  return technicalDesignGenerator;
}
