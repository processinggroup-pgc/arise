import { INITIATIVE_WIZARD_STEPS } from "@/lib/initiative-defaults";

interface InitiativeWizardTrackProps {
  activeStep: "problem" | "research" | "alignment" | "brd" | "solutions" | "mvp";
}

export function InitiativeWizardTrack({
  activeStep,
}: InitiativeWizardTrackProps): React.JSX.Element {
  const activeIndex = INITIATIVE_WIZARD_STEPS.findIndex((step) => step.id === activeStep);

  return (
    <ol className="wizard-track" aria-label="Initiative workflow">
      {INITIATIVE_WIZARD_STEPS.map((step, index) => {
        let className = "wizard-step";
        if (index < activeIndex) {
          className += " complete";
        }
        if (index === activeIndex) {
          className += " active";
        }

        return (
          <li key={step.id} className={className}>
            <span className="wizard-step-index">{index + 1}</span>
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
