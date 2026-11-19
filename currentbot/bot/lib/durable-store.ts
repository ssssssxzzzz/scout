/**
 * Durable JSON state for Scout.
 *
 * Hosted Agent SDK wipes `ctx.stateRoot` on deploy replace. Prefer this
 * abstraction over local files or SQLite on ephemeral disk.
 *
 * Today: `host.kv` adapter (platform-durable).
 * Tomorrow: swap `createDurableStore` for a Postgres-backed impl without
 * changing callers — same get/put/delete(+optional list) surface.
 */

export type DurableJson =
  | null
  | boolean
  | number
  | string
  | DurableJson[]
  | { [key: string]: DurableJson };

/** Minimal host.kv-shaped handle (avoids coupling callers to SDK types). */
export type KvLike = {
  get(key: string): Promise<unknown>;
  put(key: string, value: DurableJson): Promise<void>;
  delete(key: string): Promise<void>;
};

/**
 * Postgres-ready store interface. `listKeys` is optional until a backend
 * that can prefix-scan is wired (host.kv today has no list).
 */
export type DurableStore = {
  get(key: string): Promise<DurableJson | undefined>;
  put(key: string, value: DurableJson): Promise<void>;
  delete(key: string): Promise<void>;
  /** Prefix scan when the backend supports it; otherwise undefined. */
  listKeys?(prefix: string): Promise<string[]>;
};

export function createHostKvStore(kv: KvLike): DurableStore {
  return {
    async get(key) {
      const raw = await kv.get(key);
      if (raw === undefined) return undefined;
      return raw as DurableJson;
    },
    async put(key, value) {
      await kv.put(key, value);
    },
    async delete(key) {
      await kv.delete(key);
    },
  };
}

/**
 * Placeholder for a future Postgres adapter. Callers should depend on
 * `DurableStore`, not this stub. Throws until Jacob wires a real DB.
 */
export function createPostgresStore(_dsnEnvName = "SCOUT_DATABASE_URL"): DurableStore {
  throw new Error(
    "Postgres durable store is not wired yet. Use createHostKvStore(host.kv). Set SCOUT_DATABASE_URL only when a real adapter ships.",
  );
}

/** Normalize company / signal keys for durable lookups. */
export function normalizeKeyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}
