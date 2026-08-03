import Link from "next/link";

export default function WorkItemNotFound(): React.JSX.Element {
  return (
    <main className="main-content">
      <h1 className="page-title">Work item not found</h1>
      <p className="page-description">The requested work item does not exist in this workspace.</p>
      <Link className="button-link" href="/work-items">
        Back to work items
      </Link>
    </main>
  );
}
