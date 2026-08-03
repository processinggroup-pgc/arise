import type { ToolCall } from "@arise/domain";

export interface ToolCallStore {
  saveToolCall(toolCall: ToolCall): Promise<void>;
  findToolCallById(id: string): Promise<ToolCall | undefined>;
  findToolCallByIdempotencyKey(
    agentRunId: string,
    idempotencyKey: string,
  ): Promise<ToolCall | undefined>;
  listToolCallsForAgentRun(agentRunId: string): Promise<ToolCall[]>;
}
