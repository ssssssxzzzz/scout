import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";

export default defineTool({
  description: prompt`
    Read the latest ZoomInfo brief artifact from the workspace
    (bot/sandbox/workspace/latest-brief.md). Use this for Slack briefings.
    Interpret for land/maintain/expand. Label Observed vs Inference.
  `,
  effect: "read",
  async execute(_args, ctx) {
    const candidates = [
      join(ctx.workspaceDir, "latest-brief.md"),
      join(ctx.workspaceDir, "sandbox", "workspace", "latest-brief.md"),
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        return { path: p, markdown: readFileSync(p, "utf8") };
      }
    }
    return {
      path: null,
      markdown:
        "No latest-brief.md yet. Ask Jacob/coordinator to refresh ZoomInfo scan into bot/sandbox/workspace/latest-brief.md.",
    };
  },
});
