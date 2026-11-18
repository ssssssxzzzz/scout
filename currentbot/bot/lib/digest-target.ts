/** Where weekday morning digests post in Slack (durable via host.kv). */

export const DIGEST_TARGET_KV_KEY = "scout:digest-target";

export type DigestTarget = {
  channelId: string;
  teamId?: string;
  userId?: string;
  /** Slack user who opted in (for confirmation). */
  userName?: string;
  /** ISO timestamp when set. */
  setAt: string;
};

export function parseDigestTarget(raw: unknown): DigestTarget | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const channelId = typeof o.channelId === "string" ? o.channelId.trim() : "";
  if (channelId === "") return null;
  return {
    channelId,
    ...(typeof o.teamId === "string" && o.teamId !== ""
      ? { teamId: o.teamId }
      : {}),
    ...(typeof o.userId === "string" && o.userId !== ""
      ? { userId: o.userId }
      : {}),
    ...(typeof o.userName === "string" && o.userName !== ""
      ? { userName: o.userName }
      : {}),
    setAt: typeof o.setAt === "string" ? o.setAt : new Date().toISOString(),
  };
}

/** Env fallback when kv is empty (optional named secret / local env). */
export function digestTargetFromEnv(): DigestTarget | null {
  const channelId = (process.env.SCOUT_DIGEST_CHANNEL_ID ?? "").trim();
  if (channelId === "") return null;
  const teamId = (process.env.SCOUT_DIGEST_TEAM_ID ?? "").trim();
  return {
    channelId,
    ...(teamId !== "" ? { teamId } : {}),
    setAt: new Date().toISOString(),
  };
}
