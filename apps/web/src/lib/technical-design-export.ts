import type { Initiative, TechnicalDesignBundle } from "@arise/domain";

export function buildStep4HomeworkMarkdown(input: {
  initiative: Initiative;
  technicalBundle?: TechnicalDesignBundle;
}): string {
  const { initiative, technicalBundle } = input;
  if (
    technicalBundle?.architecture === undefined ||
    technicalBundle.techStack === undefined ||
    technicalBundle.dataModel === undefined ||
    technicalBundle.gapAnalysis === undefined
  ) {
    return `# Step 4 Homework — ${initiative.title}\n\nIncomplete — finish architecture, stack, data model, and gap analysis in ARISE.`;
  }

  const topRisks = [
    ...technicalBundle.gapAnalysis.technicalRisks.slice(0, 3),
    ...(technicalBundle.deeperGapCheck?.risks.slice(0, 2) ?? []),
  ].slice(0, 5);

  return [
    `# Step 4 Homework — ${initiative.title}`,
    "",
    "## Architecture (60-second summary)",
    technicalBundle.architecture.summary,
    "",
    `- Frontend: ${technicalBundle.architecture.frontend}`,
    `- Backend: ${technicalBundle.architecture.backend}`,
    `- Database: ${technicalBundle.architecture.database}`,
    `- APIs: ${technicalBundle.architecture.apis}`,
    "",
    "## Tech stack",
    `- Frontend: ${technicalBundle.techStack.frontend}`,
    `- Backend: ${technicalBundle.techStack.backend}`,
    `- Database: ${technicalBundle.techStack.database}`,
    `- Hosting: ${technicalBundle.techStack.hosting}`,
    `- Rationale: ${technicalBundle.techStack.rationale}`,
    "",
    "## Data model",
    ...technicalBundle.dataModel.entities.flatMap((entity) => [
      `### ${entity.name}`,
      `- Fields: ${entity.fields.join(", ")}`,
      `- Relationships: ${entity.relationships.join("; ")}`,
    ]),
    "",
    "## Gap analysis",
    "### Missing features",
    ...technicalBundle.gapAnalysis.missingFeatures.map((item) => `- ${item}`),
    "### Edge cases",
    ...technicalBundle.gapAnalysis.edgeCases.map((item) => `- ${item}`),
    "### User flow gaps",
    ...technicalBundle.gapAnalysis.userFlowGaps.map((item) => `- ${item}`),
    "### Silent failures",
    ...technicalBundle.gapAnalysis.silentFailures.map((item) => `- ${item}`),
    "",
    ...(technicalBundle.deeperGapCheck !== undefined
      ? [
          "## Deeper gap check",
          "### Failure modes",
          ...technicalBundle.deeperGapCheck.failureModes.map((item) => `- ${item}`),
          "### Weak assumptions",
          ...technicalBundle.deeperGapCheck.weakAssumptions.map((item) => `- ${item}`),
          "",
        ]
      : []),
    "## Top 5 technical risks",
    ...topRisks.map((risk) => `- ${risk}`),
    "",
    ...(technicalBundle.systemValidation !== undefined
      ? [
          "## System validation",
          `- User flow alignment: ${technicalBundle.systemValidation.userFlowAlignment}`,
          ...technicalBundle.systemValidation.completenessNotes.map(
            (note) => `- Completeness: ${note}`,
          ),
          "",
        ]
      : []),
    ...(technicalBundle.sessionNotesStep4 !== undefined
      ? ["## Session notes", technicalBundle.sessionNotesStep4.notes, ""]
      : []),
  ].join("\n");
}
