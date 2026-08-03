import Link from "next/link";

import type { WorkItem } from "@arise/domain";

import { StatusBadge } from "./status-badge";

interface WorkItemTableProps {
  workItems: WorkItem[];
  emptyMessage?: string;
}

export function WorkItemTable({
  workItems,
  emptyMessage = "No work items yet.",
}: WorkItemTableProps): React.JSX.Element {
  if (workItems.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Type</th>
          <th>State</th>
          <th>Risk</th>
        </tr>
      </thead>
      <tbody>
        {workItems.map((workItem) => (
          <tr key={workItem.id}>
            <td>
              <Link className="table-link" href={`/work-items/${workItem.id}`}>
                {workItem.title}
              </Link>
            </td>
            <td>
              <StatusBadge kind="type" value={workItem.type} />
            </td>
            <td>
              <StatusBadge kind="state" value={workItem.state} />
            </td>
            <td>
              <StatusBadge kind="risk" value={workItem.riskLevel} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
