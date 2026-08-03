import type { TraceabilityLink } from "@arise/domain";

import type { TraceabilityLinkStore } from "./traceability-link-store.js";

export class InMemoryTraceabilityLinkStore implements TraceabilityLinkStore {
  private readonly links = new Map<string, TraceabilityLink>();
  private readonly lineageIndex = new Map<string, Set<string>>();

  saveTraceabilityLink(link: TraceabilityLink): Promise<void> {
    this.links.set(link.id, link);

    const key = this.indexKey(link.organizationId, link.workItemLineageId);
    const existing = this.lineageIndex.get(key) ?? new Set<string>();
    existing.add(link.id);
    this.lineageIndex.set(key, existing);

    return Promise.resolve();
  }

  listTraceabilityLinksForWorkItemLineage(
    organizationId: string,
    workItemLineageId: string,
  ): Promise<TraceabilityLink[]> {
    const key = this.indexKey(organizationId, workItemLineageId);
    const linkIds = this.lineageIndex.get(key);

    if (linkIds === undefined) {
      return Promise.resolve([]);
    }

    return Promise.resolve(
      [...linkIds]
        .map((linkId) => this.links.get(linkId))
        .filter((link): link is TraceabilityLink => link !== undefined),
    );
  }

  private indexKey(organizationId: string, workItemLineageId: string): string {
    return `${organizationId}:${workItemLineageId}`;
  }
}
