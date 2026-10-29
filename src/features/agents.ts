/**
 * F9 — Multi-Agent and MCP Tool Integration (standalone port).
 *
 * Compatible agents use specialized tools with EXPLICIT permissions:
 * an agent may call ONLY the tools on its allow-list. Coordinated
 * execution runs tasks in order; a denied task is recorded as a
 * denial and its execute function is NEVER called.
 */

export type AgentDef = {
  name: string;
  allowedTools: string[]; // namespaced "<server>.<tool>"
};

export type AgentTask = {
  agent: string;
  tool: string;
  args: Record<string, unknown>;
  execute: () => Promise<unknown>;
};

export type AgentResult = {
  agent: string;
  tool: string;
  status: "ok" | "denied" | "failed";
  result?: unknown;
  reason?: string;
};

export async function runAgents(agents: AgentDef[], tasks: AgentTask[]): Promise<AgentResult[]> {
  const out: AgentResult[] = [];
  for (const task of tasks) {
    const agent = agents.find((a) => a.name === task.agent);
    if (!agent) {
      out.push({ agent: task.agent, tool: task.tool, status: "denied", reason: "unknown agent" });
      continue;
    }
    if (!agent.allowedTools.includes(task.tool)) {
      out.push({
        agent: task.agent,
        tool: task.tool,
        status: "denied",
        reason: `agent "${task.agent}" is not permitted to call "${task.tool}"`,
      });
      continue;
    }
    try {
      const result = await task.execute();
      out.push({ agent: task.agent, tool: task.tool, status: "ok", result });
    } catch (e) {
      out.push({
        agent: task.agent,
        tool: task.tool,
        status: "failed",
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}
