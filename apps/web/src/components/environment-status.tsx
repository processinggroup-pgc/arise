import { hasDatabaseUrl } from "@/lib/database";

export function EnvironmentStatus(): React.JSX.Element {
  const databaseConnected = hasDatabaseUrl();
  const persistenceLabel = databaseConnected ? "PostgreSQL" : "In-memory";

  return (
    <div
      className={`environment-pill ${databaseConnected ? "valid" : "invalid"}`}
      data-testid="environment-status"
    >
      <span className="environment-dot" aria-hidden="true" />
      Environment valid · {persistenceLabel}
    </div>
  );
}
