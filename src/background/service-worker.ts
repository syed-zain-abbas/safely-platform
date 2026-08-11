import { BUNDLED_RULES } from "../shared/category-rules";
import { getSettings, saveSettings } from "../shared/storage";
import { enabledCategories, type Category, type StatusMessage } from "../shared/types";
import { DnrRuleService } from "./dnr-rule-service";
import { classifyPage } from "../classification/local-classifier";
import { decide } from "../policy/risk-engine";
import { recordSafetyEvent } from "../events/safety-event-service";
import type { ExtensionMessage } from "../shared/extension-messages";

const WEB_ORIGINS = ["http://*/*", "https://*/*"];
const dnrRules = new DnrRuleService();

async function syncContentClassifier(): Promise<void> {
  const settings = await getSettings();
  const hasPermission = await chrome.permissions.contains({ permissions: ["scripting"], origins: WEB_ORIGINS });
  if (!hasPermission) return;
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: ["safely-page-classifier"] });
  if (!settings.contentAnalysisEnabled) { if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: ["safely-page-classifier"] }); return; }
  if (registered.length) return;
  await chrome.scripting.registerContentScripts([{ id: "safely-page-classifier", js: ["content-script.js"], matches: WEB_ORIGINS, runAt: "document_idle", persistAcrossSessions: true }]);
}

async function applyRules(): Promise<void> {
  const settings = await getSettings();
  // Redirecting a public navigation needs host access. Blocking remains the
  // least-privilege fallback when the guardian has not approved it.
  const canRedirect = await chrome.permissions.contains({ origins: WEB_ORIGINS });
  try {
    await dnrRules.synchronize({
      builtInBlockedDomains: BUNDLED_RULES,
      enabledCategories: enabledCategories(settings),
      userAllowlist: settings.allowedDomains,
      userBlocklist: settings.blockedDomains,
      redirectEnabled: canRedirect,
      redirectPath: "/blocked.html"
    });
  } catch (error) {
    console.error("safely-platform could not update its dynamic rules", error);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
  await applyRules();
  await syncContentClassifier();
});

chrome.runtime.onStartup.addListener(() => { void applyRules(); });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) { void applyRules(); void syncContentClassifier(); }
});

chrome.permissions.onAdded.addListener(() => { void applyRules(); void syncContentClassifier(); });
chrome.permissions.onRemoved.addListener(() => { void applyRules(); void syncContentClassifier(); });

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    void getSettings().then((settings) => {
      const response: StatusMessage = { type: "SAFELY_STATUS", mode: settings.mode, enabledCategories: enabledCategories(settings) };
      sendResponse(response);
    });
    return true;
  }
  if (message.type === "PAGE_SIGNALS") {
    void getSettings().then(async (settings) => {
      if (!settings.contentAnalysisEnabled || settings.allowedDomains.includes(message.signals.hostname)) return;
      const result = classifyPage(message.signals); const decision = decide(result, settings.mode);
      if (import.meta.env.DEV) console.log("Safely Debug", { domain: message.signals.hostname, classification: result.category, confidence: result.confidence, policy: settings.mode, decision, reasons: result.reasons });
      if (decision.action === "WARN" || decision.action === "BLOCK") await recordSafetyEvent({ timestamp: Date.now(), category: result.category, action: decision.action, riskScore: Math.round(result.confidence * 100), reasonCode: decision.reasonCode, ...(settings.saveBlockedDomainHistory ? { domain: message.signals.hostname } : {}) });
      sendResponse({ type: "POLICY_DECISION", action: decision.action, category: result.category, reasonCode: decision.reasonCode });
    });
    return true;
  }
  return false;
});
