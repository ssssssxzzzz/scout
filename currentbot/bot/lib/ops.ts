/**
 * Ops notifications → SCOUT_OPS_CHANNEL_ID (secret/env).
 * Failures, zero-results, auth errors, daily heartbeat.
 */

import { resolveOpsChannel } from "./channel-map.ts";

export type OpsKind =
  | "failure"
  | "zero_results"
  | "auth_error"
  | "heartbeat"
  | "info";

export type OpsPostResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  channelId?: string;
  messageTs?: string;
};

type SlackPoster = {
  chat: {
    postMessage: (args: {
      channel: string;
      text: string;
    }) => Promise<{ ok?: boolean; ts?: string; error?: string }>;
  };
};

function formatOpsText(kind: OpsKind, title: string, detail?: string): string {
  const tag =
    kind === "failure"
      ? "FAILURE"
      : kind === "zero_results"
        ? "ZERO"
        : kind === "auth_error"
          ? "AUTH"
          : kind === "heartbeat"
            ? "HEARTBEAT"
            : "INFO";
  const body = detail && detail.trim() !== "" ? `\n${detail.trim()}` : "";
  return `[Scout ops · ${tag}] ${title}${body}`;
}

/**
 * Post to the ops channel when configured. Soft-no-op if unset or Slack fails.
 */
export async function postOps(
  getClient: () => Promise<SlackPoster>,
  kind: OpsKind,
  title: string,
  detail?: string,
): Promise<OpsPostResult> {
  const channelId = resolveOpsChannel();
  if (channelId === null) {
    return {
      ok: false,
      skipped: true,
      reason: "SCOUT_OPS_CHANNEL_ID unset",
    };
  }

  try {
    const client = await getClient();
    const posted = await client.chat.postMessage({
      channel: channelId,
      text: formatOpsText(kind, title, detail),
    });
    if (posted.ok && typeof posted.ts === "string") {
      return { ok: true, channelId, messageTs: posted.ts };
    }
    return {
      ok: false,
      channelId,
      reason: posted.error ?? "post_failed",
    };
  } catch (error) {
    return {
      ok: false,
      channelId,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export function opsChannelConfigured(): boolean {
  return resolveOpsChannel() !== null;
}
