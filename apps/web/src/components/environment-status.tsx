import { validateEnvironment } from "@arise/domain";

export function EnvironmentStatus(): React.JSX.Element {
  const validation = validateEnvironment({
    NODE_ENV: process.env["NODE_ENV"],
  });

  return (
    <div
      className={`environment-pill ${validation.valid ? "valid" : "invalid"}`}
      data-testid="environment-status"
    >
      <span className="environment-dot" aria-hidden="true" />
      {validation.valid ? "Environment valid" : validation.errors.join(", ")}
    </div>
  );
}
