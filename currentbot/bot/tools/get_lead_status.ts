import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { loadLead, storeFromKv } from "../lib/lead-state.ts";

export default defineTool({
  description: prompt`
    Read durable lead status (claim / contacted / won / lost / not_fit)
    for a company from host.kv. Use when Jacob asks who owns a lead or
    whether it was already claimed.
  `,
  effect: "read",
  inputSchema: z.object({
    company: z.string().min(1),
    signalType: z.string().optional(),
  }),
  async execute({ company, signalType }, ctx) {
    if (ctx.session.purpose === "eval") {
      return {
        ok: true,
        found: false,
        reason: "eval_skipped",
        hint: "Eval sessions skip durable lead reads.",
      };
    }
    const store = storeFromKv(ctx.host.kv);
    const record =
      (await loadLead(store, company, signalType ?? "*")) ??
      (signalType
        ? await loadLead(store, company, "*")
        : null);
    return {
      ok: true,
      found: record !== null,
      company: company.trim(),
      owner_slack_id: record?.ownerSlackId ?? null,
      record,
    };
  },
});
