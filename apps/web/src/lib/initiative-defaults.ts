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
  { id: "problem", label: "Problem intake" },
  { id: "research", label: "Market research" },
  { id: "alignment", label: "Problem alignment" },
  { id: "brd", label: "BRD draft" },
  { id: "solutions", label: "Solution options" },
  { id: "mvp", label: "MVP backlog" },
] as const;
