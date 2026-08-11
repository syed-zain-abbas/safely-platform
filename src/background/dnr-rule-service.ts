import { normalizeDomainInput } from "../shared/url-normalization";
import type { Category, CategorySettings, RuleTarget } from "../shared/types";

const MAX_DNR_RULE_ID = 2_147_483_647;
const DEFAULT_REDIRECT_PATH = "/blocked.html";

export interface DnrRuleConfiguration {
  builtInBlockedDomains: RuleTarget[];
  enabledCategories: CategorySettings;
  userAllowlist: string[];
  userBlocklist: string[];
  /** Redirect requires host access; use false only for the least-privilege block fallback. */
  redirectEnabled: boolean;
  redirectPath?: string;
}

export interface DnrRulePlan {
  rules: chrome.declarativeNetRequest.Rule[];
  invalidDomains: string[];
}

export interface DynamicRuleApi {
  getDynamicRules(): Promise<chrome.declarativeNetRequest.Rule[]>;
  updateDynamicRules(update: chrome.declarativeNetRequest.UpdateRuleOptions): Promise<void>;
}

export class DynamicRuleUpdateError extends Error {
  public readonly rollbackError?: unknown;

  constructor(message: string, public readonly cause: unknown, rollbackError?: unknown) {
    super(message);
    this.name = "DynamicRuleUpdateError";
    this.rollbackError = rollbackError;
  }
}

type PlannedRule = {
  key: string;
  domain: string;
  kind: "allow" | "block";
  priority: number;
};

type RuleIdHasher = (key: string) => number;

/** FNV-1a produces a stable positive 31-bit rule-ID candidate. */
function defaultRuleIdHasher(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % MAX_DNR_RULE_ID + 1;
}

function sanitizeDomains(domains: string[], invalidDomains: string[]): string[] {
  const normalized = new Set<string>();
  for (const domain of domains) {
    const valid = normalizeDomainInput(domain);
    if (valid) normalized.add(valid);
    else invalidDomains.push(domain);
  }
  return [...normalized].sort();
}

function toRule(id: number, planned: PlannedRule, configuration: DnrRuleConfiguration): chrome.declarativeNetRequest.Rule {
  const action: chrome.declarativeNetRequest.RuleAction = planned.kind === "allow"
    ? { type: "allow" as chrome.declarativeNetRequest.RuleActionType }
    : configuration.redirectEnabled
      ? {
          type: "redirect" as chrome.declarativeNetRequest.RuleActionType,
          redirect: { extensionPath: configuration.redirectPath ?? DEFAULT_REDIRECT_PATH }
        }
      : { type: "block" as chrome.declarativeNetRequest.RuleActionType };
  return {
    id,
    priority: planned.priority,
    action,
    condition: {
      urlFilter: `||${planned.domain}^`,
      resourceTypes: ["main_frame" as chrome.declarativeNetRequest.ResourceType]
    }
  };
}

/**
 * Creates a deterministic plan. Sorting by key before probing means a hash
 * collision resolves identically on every device and update.
 */
export function createDnrRulePlan(configuration: DnrRuleConfiguration, hasher: RuleIdHasher = defaultRuleIdHasher): DnrRulePlan {
  const invalidDomains: string[] = [];
  const allowlist = sanitizeDomains(configuration.userAllowlist, invalidDomains);
  const blocklist = sanitizeDomains(configuration.userBlocklist, invalidDomains);
  const builtIns: PlannedRule[] = configuration.builtInBlockedDomains
    .filter((target) => configuration.enabledCategories[target.category])
    .flatMap((target) => {
      const domain = normalizeDomainInput(target.domain);
      if (!domain) { invalidDomains.push(target.domain); return []; }
      return [{ key: `builtin:${target.category}:${domain}`, domain, kind: "block" as const, priority: 10 }];
    });
  const candidates: PlannedRule[] = [
    ...builtIns,
    ...blocklist.map((domain) => ({ key: `user-block:${domain}`, domain, kind: "block" as const, priority: 20 })),
    // Allow rules take precedence, including over an accidental duplicate block entry.
    ...allowlist.map((domain) => ({ key: `user-allow:${domain}`, domain, kind: "allow" as const, priority: 100 }))
  ].sort((left, right) => left.key.localeCompare(right.key));

  const usedIds = new Set<number>();
  const rules = candidates.map((candidate) => {
    let id = hasher(candidate.key);
    if (!Number.isInteger(id) || id < 1 || id > MAX_DNR_RULE_ID) throw new Error(`Hasher produced an invalid DNR rule ID for ${candidate.key}.`);
    while (usedIds.has(id)) id = id === MAX_DNR_RULE_ID ? 1 : id + 1;
    usedIds.add(id);
    return toRule(id, candidate, configuration);
  });
  return { rules, invalidDomains };
}

/** Owns all dynamic DNR rules for safely-platform and restores the last known state on failure. */
export class DnrRuleService {
  constructor(private readonly api: DynamicRuleApi = chrome.declarativeNetRequest) {}

  async synchronize(configuration: DnrRuleConfiguration): Promise<DnrRulePlan> {
    const plan = createDnrRulePlan(configuration);
    const previousRules = await this.api.getDynamicRules();
    try {
      await this.api.updateDynamicRules({
        removeRuleIds: previousRules.map((rule) => rule.id),
        addRules: plan.rules
      });
      return plan;
    } catch (cause) {
      let rollbackError: unknown;
      try {
        // Query again: a partial platform failure may have left a mixed state.
        const currentRules = await this.api.getDynamicRules();
        await this.api.updateDynamicRules({
          removeRuleIds: currentRules.map((rule) => rule.id),
          addRules: previousRules
        });
      } catch (error) {
        rollbackError = error;
      }
      throw new DynamicRuleUpdateError("Unable to update safer-browsing rules; the previous rules were restored when possible.", cause, rollbackError);
    }
  }
}
