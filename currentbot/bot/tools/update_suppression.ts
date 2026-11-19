import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  addSuppression,
  ensureSuppressionSeed,
  removeSuppression,
  storeFromKv,
} from "../lib/suppression.ts";

export default defineTool({
  description: prompt`
    Add or remove a company (optional signal_type) from the durable
    suppression store. Use when Jacob taps Suppress or says suppress /
    stop alerting for an account. Not the mute-list (noise terms).
  `,
  effect: "write",
  inputSchema: z.object({
    action: z.enum(["add", "remove"]),
    company: z.string().min(1),
    signalType: z
      .string()
      .optional()
      .describe("Optional; omit for company-wide suppress."),
    reason: z.string().optional(),
    expiresAt: z
      .string()
      .optional()
      .describe("Optional ISO expiry; omit for no expiry."),
  }),
  async execute({ action, company, signalType, reason, expiresAt }, ctx) {
    if (ctx.session.purpose === "eval") {
      return {
        ok: true,
        action,
        company,
        reason: "eval_skipped",
        hint: "Eval sessions do not write suppression kv.",
      };
    }

    const store = storeFromKv(ctx.host.kv);
    await ensureSuppressionSeed(store);
    const list =
      action === "add"
        ? await addSuppression(store, {
            company,
            ...(signalType !== undefined ? { signalType } : {}),
            ...(reason !== undefined ? { reason } : {}),
            ...(expiresAt !== undefined ? { expiresAt } : {}),
          })
        : await removeSuppression(store, company, signalType);

    return {
      ok: true,
      action,
      company: company.trim(),
      signalType: signalType?.trim() || null,
      count: list.items.length,
      items: list.items,
    };
  },
});
