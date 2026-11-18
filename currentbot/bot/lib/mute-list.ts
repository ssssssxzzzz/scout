import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export type MuteList = {
  terms: string[];
  notes: string;
};

/** Default noise mutes — Jacob edits from Slack via update_mute_list. */
const DEFAULT_TERMS = ["clinical trials", "earnings", "restaurants"];

const DEFAULT: MuteList = {
  terms: [...DEFAULT_TERMS],
  notes:
    "Mute terms filter noise before act cards. Defaults: clinical trials, earnings, restaurants. Edit from Slack via update_mute_list.",
};

function pathFor(stateRoot: string) {
  return join(stateRoot, "mute-list.json");
}

function defaultClone(): MuteList {
  return {
    terms: [...DEFAULT_TERMS],
    notes: DEFAULT.notes,
  };
}

export function loadMuteList(stateRoot: string): MuteList {
  const p = pathFor(stateRoot);
  if (!existsSync(p)) return defaultClone();
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<MuteList>;
    const terms = Array.isArray(raw.terms)
      ? raw.terms.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      : [...DEFAULT_TERMS];
    return {
      terms,
      notes: typeof raw.notes === "string" ? raw.notes : DEFAULT.notes,
    };
  } catch {
    return defaultClone();
  }
}

export function saveMuteList(stateRoot: string, data: MuteList) {
  mkdirSync(stateRoot, { recursive: true });
  writeFileSync(pathFor(stateRoot), JSON.stringify(data, null, 2));
}
