import { describe, expect, it } from "vitest";

import { extractSymbolsFromSource } from "./symbol-extraction.js";

const sampleSource = `export function listMemberships() {
  return [];
}

export class MembershipService {
  list() {}
}

export interface MembershipSummary {
  id: string;
}

export type MembershipRole = "owner" | "member";
`;

describe("extractSymbolsFromSource", () => {
  it("extracts exported functions, classes, interfaces and types", () => {
    expect(extractSymbolsFromSource(sampleSource)).toEqual([
      { name: "listMemberships", kind: "function", line: 1 },
      { name: "MembershipService", kind: "class", line: 5 },
      { name: "MembershipSummary", kind: "interface", line: 9 },
      { name: "MembershipRole", kind: "type", line: 13 },
    ]);
  });
});
