import { notFound } from "next/navigation";

import {
  buildWeek1HomeworkMarkdown,
  buildWeek2HomeworkMarkdown,
  buildWeek3HomeworkMarkdown,
} from "@/lib/cohort-export";
import { getInitiativeDetail } from "@/lib/initiative-queries";

interface ExportPageProps {
  params: Promise<{ initiativeId: string; week: string }>;
}

export async function GET(_request: Request, { params }: ExportPageProps): Promise<Response> {
  const { initiativeId, week } = await params;
  const detail = await getInitiativeDetail(initiativeId);

  if (detail === null) {
    notFound();
  }

  let markdown: string;
  let filename: string;

  switch (week) {
    case "1":
      markdown = buildWeek1HomeworkMarkdown(detail);
      filename = "week-1-homework.md";
      break;
    case "2":
      markdown = buildWeek2HomeworkMarkdown({
        initiative: detail.initiative,
        ...(detail.bundle !== undefined ? { bundle: detail.bundle } : {}),
      });
      filename = "week-2-homework.md";
      break;
    case "3":
      markdown = buildWeek3HomeworkMarkdown({
        initiative: detail.initiative,
        ...(detail.bundle !== undefined ? { bundle: detail.bundle } : {}),
      });
      filename = "week-3-homework.md";
      break;
    default:
      notFound();
  }

  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
