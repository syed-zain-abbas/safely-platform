import { normalizeDomainInput } from "../shared/url-normalization";
import { CATEGORIES, type Category, type RuleTarget } from "../shared/types";

export interface ImportedRuleset { version: 1; generatedAt: string; rules: RuleTarget[]; }
export interface RulesetImportResult { ruleset: ImportedRuleset; rejected: string[]; }
const MAX_IMPORTED_RULES = 4_000;

/** Parses a guardian-provided local JSON file; it performs no network access. */
export function parseLocalRuleset(json: string): RulesetImportResult {
  const raw: unknown = JSON.parse(json);
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { rules?: unknown }).rules)) throw new Error("Ruleset must be JSON with a rules array.");
  const rejected: string[] = []; const unique = new Map<string, RuleTarget>();
  for (const entry of (raw as { rules: unknown[] }).rules) {
    if (!entry || typeof entry !== "object") { rejected.push("invalid entry"); continue; }
    const { domain, category } = entry as Partial<RuleTarget>;
    const normalized = typeof domain === "string" ? normalizeDomainInput(domain) : null;
    if (!normalized || typeof category !== "string" || !CATEGORIES.includes(category as Category)) { rejected.push(String(domain ?? "invalid entry")); continue; }
    unique.set(`${category}:${normalized}`, { domain: normalized, category: category as Category });
  }
  const rules = [...unique.values()].slice(0, MAX_IMPORTED_RULES);
  if (unique.size > MAX_IMPORTED_RULES) rejected.push(`Ruleset exceeds ${MAX_IMPORTED_RULES} dynamic-rule limit.`);
  return { ruleset: { version: 1, generatedAt: new Date().toISOString(), rules }, rejected };
}
