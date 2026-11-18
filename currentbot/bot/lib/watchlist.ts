import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export type Watchlist = {
  competitors: string[];
  priority: string[];
  pastWork: string[];
  notes: string;
};

/** Starts empty. Jacob adds/removes names from Slack via update_watchlist. */
const DEFAULT: Watchlist = {
  competitors: [],
  priority: [],
  pastWork: [],
  notes:
    "Empty by default. Add competitors / priority / pastWork from Slack via update_watchlist. Never seed fixed account lists. Never surface Nighthawk. Prefer pastWork only when Jacob explicitly asks about past wins.",
};

function pathFor(stateRoot: string) {
  return join(stateRoot, "watchlist.json");
}

function emptyClone(): Watchlist {
  return {
    competitors: [],
    priority: [],
    pastWork: [],
    notes: DEFAULT.notes,
  };
}

export function loadWatchlist(stateRoot: string): Watchlist {
  const p = pathFor(stateRoot);
  if (!existsSync(p)) return emptyClone();
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<Watchlist>;
    return {
      competitors: Array.isArray(raw.competitors) ? raw.competitors : [],
      priority: Array.isArray(raw.priority) ? raw.priority : [],
      pastWork: Array.isArray(raw.pastWork) ? raw.pastWork : [],
      notes: typeof raw.notes === "string" ? raw.notes : DEFAULT.notes,
    };
  } catch {
    return emptyClone();
  }
}

export function saveWatchlist(stateRoot: string, data: Watchlist) {
  mkdirSync(stateRoot, { recursive: true });
  writeFileSync(pathFor(stateRoot), JSON.stringify(data, null, 2));
}
