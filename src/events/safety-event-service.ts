import type { SafetyCategory, ProtectionAction } from "../shared/safety-category";
export interface SafetyEvent { timestamp: number; category: SafetyCategory; action: Extract<ProtectionAction, "WARN" | "BLOCK">; riskScore: number; reasonCode: string; domain?: string; }
const KEY = "safetyEvents"; const MAX_EVENTS = 200;
export async function recordSafetyEvent(event: SafetyEvent): Promise<void> { const stored = await chrome.storage.local.get(KEY); const events = Array.isArray(stored[KEY]) ? stored[KEY] as SafetyEvent[] : []; await chrome.storage.local.set({ [KEY]: [...events, event].slice(-MAX_EVENTS) }); }
