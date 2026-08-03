export const COHORT_AFFORDABILITY_DEFAULTS = {
  title: "Improve cohort affordability during a soft job market",
  rawProblemDescription:
    "People are having trouble finding work and the job market is steadily decreasing, so people may have difficulty affording my cohorts.",
  targetAudience: "Career changers and underemployed professionals considering paid cohort programs",
  painPoints:
    "Fewer entry-level roles reduce confidence in upskilling ROI\nUpfront cohort tuition is harder to justify during income instability\nProspective learners delay enrollment until hiring conditions improve",
  businessContext:
    "Cohort enrollment depends on learners believing they can afford tuition and secure employment after completion.",
  desiredOutcome:
    "Increase qualified cohort enrollments without lowering completion quality or placement standards.",
} as const;

export const INITIATIVE_WIZARD_STEPS = [
  { id: "problem", label: "Problem & ICP" },
  { id: "research", label: "AI idea refinement" },
  { id: "alignment", label: "Finalize concept" },
  { id: "business-case", label: "Business case" },
  { id: "mvp-scope", label: "MVP scoping" },
  { id: "mvp-finalize", label: "MVP finalize" },
  { id: "persona", label: "Persona" },
  { id: "userflow", label: "User flow" },
  { id: "storymap", label: "Story map" },
  { id: "brd", label: "BRD build" },
  { id: "architecture", label: "Architecture" },
  { id: "tech-stack", label: "Tech stack" },
  { id: "data-model", label: "Data model" },
  { id: "gap-analysis", label: "Gap analysis" },
  { id: "system-validation", label: "System validation" },
  { id: "platform-connect", label: "Connect platforms" },
  { id: "mvp-build", label: "MVP build" },
  { id: "uat-test", label: "UAT" },
  { id: "enhancements", label: "Enhancements" },
] as const;

export type InitiativeWizardStepId = (typeof INITIATIVE_WIZARD_STEPS)[number]["id"];
