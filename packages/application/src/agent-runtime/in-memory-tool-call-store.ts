import type { ToolCall } from "@arise/domain";

import type { ToolCallStore } from "./tool-call-store.js";

export class InMemoryToolCallStore implements ToolCallStore {
  private readonly calls = new Map<string, ToolCall>();

  saveToolCall(toolCall: ToolCall): Promise<void> {
    this.calls.set(toolCall.id, toolCall);
    return Promise.resolve();
  }

  findToolCallById(id: string): Promise<ToolCall | undefined> {
    return Promise.resolve(this.calls.get(id));
  }

  findToolCallByIdempotencyKey(
    agentRunId: string,
    idempotencyKey: string,
  ): Promise<ToolCall | undefined> {
    return Promise.resolve(
      [...this.calls.values()].find(
        (call) => call.agentRunId === agentRunId && call.idempotencyKey === idempotencyKey,
      ),
    );
  }

  listToolCallsForAgentRun(agentRunId: string): Promise<ToolCall[]> {
    return Promise.resolve(
      [...this.calls.values()]
        .filter((call) => call.agentRunId === agentRunId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime()),
    );
  }
}
