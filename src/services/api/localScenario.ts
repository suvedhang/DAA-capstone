/**
 * Local implementation of `ScenarioService` backed by localStorage.
 * Swap this for an HTTP adapter when the backend is available.
 */
import type { ScenarioRecord, ScenarioService } from "./interfaces";

const STORAGE_KEY = "aquamind.scenarios.v1";

function readAll(): ScenarioRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScenarioRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: ScenarioRecord[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const localScenarioService: ScenarioService = {
  async list() {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async save(record) {
    const all = readAll();
    const idx = all.findIndex((r) => r.id === record.id);
    if (idx >= 0) all[idx] = record;
    else all.push(record);
    writeAll(all);
  },
  async remove(id) {
    writeAll(readAll().filter((r) => r.id !== id));
  },
  async clear() {
    writeAll([]);
  },
};
