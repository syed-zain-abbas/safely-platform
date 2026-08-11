import { describe, expect, it, vi } from "vitest";
import { createDnrRulePlan, DnrRuleService, DynamicRuleUpdateError, type DynamicRuleApi } from "./dnr-rule-service";
import type { CategorySettings, RuleTarget } from "../shared/types";

const allCategories: CategorySettings = { adult: true, phishing: true, malware: true, gambling: true, scam: true };
const builtIns: RuleTarget[] = [
  { domain: "adult.example", category: "adult" },
  { domain: "phish.example", category: "phishing" }
];
const baseConfiguration = {
  builtInBlockedDomains: builtIns,
  enabledCategories: allCategories,
  userAllowlist: ["safe.example"],
  userBlocklist: ["blocked.example"],
  redirectEnabled: true
};

describe("createDnrRulePlan", () => {
  it("creates deterministic collision-free allow and redirect rules", () => {
    const hasher = () => 99; // Deliberately force collision probing.
    const first = createDnrRulePlan(baseConfiguration, hasher);
    const second = createDnrRulePlan(baseConfiguration, hasher);
    expect(first.rules.map((rule) => rule.id)).toEqual([99, 100, 101, 102]);
    expect(second.rules.map((rule) => rule.id)).toEqual(first.rules.map((rule) => rule.id));
    const allow = first.rules.find((rule) => rule.condition.urlFilter === "||safe.example^");
    expect(allow).toMatchObject({ priority: 100, action: { type: "allow" } });
    const block = first.rules.find((rule) => rule.condition.urlFilter === "||blocked.example^");
    expect(block).toMatchObject({ priority: 20, action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } } });
  });

  it("excludes disabled categories and reports invalid list input", () => {
    const plan = createDnrRulePlan({ ...baseConfiguration, enabledCategories: { ...allCategories, phishing: false }, userBlocklist: ["blocked.example", "not a domain"] });
    expect(plan.rules.some((rule) => rule.condition.urlFilter === "||phish.example^")).toBe(false);
    expect(plan.invalidDomains).toEqual(["not a domain"]);
  });

  it("uses block rather than redirect when host access is unavailable", () => {
    const plan = createDnrRulePlan({ ...baseConfiguration, redirectEnabled: false });
    expect(plan.rules.filter((rule) => rule.action.type !== "allow").every((rule) => rule.action.type === "block")).toBe(true);
  });
});

describe("DnrRuleService", () => {
  it("removes previous rules and adds the complete new plan atomically", async () => {
    const previous = [{ id: 7 }] as chrome.declarativeNetRequest.Rule[];
    const api: DynamicRuleApi = { getDynamicRules: vi.fn().mockResolvedValue(previous), updateDynamicRules: vi.fn().mockResolvedValue(undefined) };
    await new DnrRuleService(api).synchronize(baseConfiguration);
    expect(api.updateDynamicRules).toHaveBeenCalledWith(expect.objectContaining({ removeRuleIds: [7], addRules: expect.any(Array) }));
  });

  it("attempts to restore the previous rules if an update fails", async () => {
    const previous = [{ id: 7, priority: 1, action: { type: "block" }, condition: { urlFilter: "||previous.example^", resourceTypes: ["main_frame"] } }] as chrome.declarativeNetRequest.Rule[];
    const api: DynamicRuleApi = {
      getDynamicRules: vi.fn().mockResolvedValueOnce(previous).mockResolvedValueOnce([]),
      updateDynamicRules: vi.fn().mockRejectedValueOnce(new Error("quota")).mockResolvedValueOnce(undefined)
    };
    await expect(new DnrRuleService(api).synchronize(baseConfiguration)).rejects.toBeInstanceOf(DynamicRuleUpdateError);
    expect(api.updateDynamicRules).toHaveBeenLastCalledWith({ removeRuleIds: [], addRules: previous });
  });
});
