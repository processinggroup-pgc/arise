import type { Incident } from "@arise/domain";

import type { IncidentStore } from "./incident-store.js";

export class InMemoryIncidentStore implements IncidentStore {
  private readonly incidents = new Map<string, Incident>();

  saveIncident(incident: Incident): Promise<void> {
    this.incidents.set(incident.id, incident);
    return Promise.resolve();
  }

  findIncidentById(id: string): Promise<Incident | undefined> {
    return Promise.resolve(this.incidents.get(id));
  }

  listIncidentsForOrganization(organizationId: string): Promise<Incident[]> {
    return Promise.resolve(
      [...this.incidents.values()].filter((incident) => incident.organizationId === organizationId),
    );
  }

  listIncidentsForWorkItem(workItemId: string): Promise<Incident[]> {
    return Promise.resolve(
      [...this.incidents.values()].filter((incident) => incident.workItemId === workItemId),
    );
  }
}
