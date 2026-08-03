interface StatCardProps {
  label: string;
  value: number;
  hint: string;
}

export function StatCard({ label, value, hint }: StatCardProps): React.JSX.Element {
  return (
    <article className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint">{hint}</div>
    </article>
  );
}
