import type { Incident } from "@arise/domain";

export interface IncidentStore {
  saveIncident(incident: Incident): Promise<void>;
  findIncidentById(id: string): Promise<Incident | undefined>;
  listIncidentsForOrganization(organizationId: string): Promise<Incident[]>;
  listIncidentsForWorkItem(workItemId: string): Promise<Incident[]>;
}
