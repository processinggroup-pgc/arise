import { describe, expect, it } from "vitest";

// Executable specification to implement during Milestone 2.
describe("policy engine", () => {
  it.todo("blocks a destructive production migration without elevated approval");
  it.todo("requires approval for RLS policy modification");
  it.todo("allows a read-only repository operation");
  it.todo("does not honor an expired exception");
});
