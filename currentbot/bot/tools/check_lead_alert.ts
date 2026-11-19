import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  checkAlertDedup,
  recordAlert,
  storeFromKv,
} from "../lib/alert-dedup.ts";
import { isSuppressed, storeFromKv as suppressStore } from "../lib/suppression.ts";
import { whyNowFromBreakdown } from "../lib/why-now.ts";

export default defineTool({
  description: prompt`
    Check whether Scout should alert on company + signal_type:
    suppression store, then 14d cooldown (configurable), with score-jump
    re-alert. Optionally record the alert after a successful post
    (record=true). Durable via host.kv — not SQLite / stateRoot.
  `,
  effect: "idempotent",
  inputSchema: z.object({
    company: z.string().min(1),
    signalType: z.string().min(1),
    score: z.number().describe("Current lead score from score_lead."),
    record: z
      .boolean()
      .optional()
      .describe("When true and shouldAlert, write the cooldown record."),
  }),
  async execute({ company, signalType, score, record }, ctx) {
    if (ctx.session.purpose === "eval") {
      return {
        ok: true,
        shouldAlert: true,
        reason: "eval_skipped_durable",
        hint: "Eval sessions skip durable dedup writes.",
      };
    }

    const kv = ctx.host.kv;
    const suppress = await isSuppressed(
      suppressStore(kv),
      company,
      signalType,
    );
    if (suppress.suppressed) {
      const why = whyNowFromBreakdown({}, { status: "suppressed" });
      return {
        ok: true,
        shouldAlert: false,
        reason: "suppressed",
        match: suppress.match,
        whyNow: why.whyNow,
      };
    }

    const store = storeFromKv(kv);
    const decision = await checkAlertDedup(store, company, signalType, score);
    if (!decision.shouldAlert) {
      const why = whyNowFromBreakdown({}, { status: "cooldown" });
      return {
        ok: true,
        shouldAlert: false,
        reason: decision.reason,
        prior: decision.prior,
        cooldownDays: decision.cooldownDays,
        scoreJumpRealert: decision.scoreJumpRealert,
        whyNow: why.whyNow,
      };
    }

    let recorded = null;
    if (record === true) {
      recorded = await recordAlert(store, company, signalType, score);
    }

    return {
      ok: true,
      shouldAlert: true,
      reason: decision.reason,
      prior: decision.prior,
      cooldownDays: decision.cooldownDays,
      scoreJumpRealert: decision.scoreJumpRealert,
      recorded,
    };
  },
});
