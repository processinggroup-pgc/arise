import type { TraceabilityLink } from "@arise/domain";

export interface TraceabilityLinkStore {
  saveTraceabilityLink(link: TraceabilityLink): Promise<void>;
  listTraceabilityLinksForWorkItemLineage(
    organizationId: string,
    workItemLineageId: string,
  ): Promise<TraceabilityLink[]>;
}
