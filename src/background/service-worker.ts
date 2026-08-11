import { BUNDLED_RULES } from "../shared/rules";
import { getSettings, saveSettings } from "../shared/storage";
import { enabledCategories, type Category, type StatusMessage } from "../shared/types";

const DYNAMIC_RULE_LIMIT = 4_000;
const BLOCKED_PATH = "/blocked.html";
const WARNING_PATH = "/warning.html";
const WEB_ORIGINS = ["http://*/*", "https://*/*"];

function redirectPath(category: Category): string {
  return category === "phishing" || category === "scam" ? WARNING_PATH : BLOCKED_PATH;
}

function toRule(id: number, domain: string, category: Category, priority: number, canRedirect: boolean): chrome.declarativeNetRequest.Rule {
  return {
    id,
    priority,
    action: canRedirect
      ? { type: chrome.declarativeNetRequest.RuleActionType.REDIRECT, redirect: { extensionPath: redirectPath(category) } }
      : { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: { urlFilter: `||${domain}^`, resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME] }
  };
}

async function applyRules(): Promise<void> {
  const settings = await getSettings();
  const categories = enabledCategories(settings);
  const categoryRules = BUNDLED_RULES.filter((rule) => categories[rule.category]);
  const customRules = settings.blockedDomains.map((domain) => ({ domain, category: "adult" as Category }));
  const targets = [...categoryRules, ...customRules].slice(0, DYNAMIC_RULE_LIMIT);
  // Redirecting a public navigation needs host access. Blocking does not.
  const canRedirect = await chrome.permissions.contains({ origins: WEB_ORIGINS });
  const previous = await chrome.declarativeNetRequest.getDynamicRules();
  const addRules = targets.map((target, index) => toRule(index + 1, target.domain, target.category, index >= categoryRules.length ? 2 : 1, canRedirect));
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: previous.map((rule) => rule.id), addRules });
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
  await applyRules();
});

chrome.runtime.onStartup.addListener(() => { void applyRules(); });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) void applyRules();
});

chrome.permissions.onAdded.addListener(() => { void applyRules(); });
chrome.permissions.onRemoved.addListener(() => { void applyRules(); });

chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    void getSettings().then((settings) => {
      const response: StatusMessage = { type: "SAFELY_STATUS", mode: settings.mode, enabledCategories: enabledCategories(settings) };
      sendResponse(response);
    });
    return true;
  }
  return false;
});
