import type { ProtectionMode } from "../shared/types";
import type { ProtectionAction, SafetyCategory } from "../shared/safety-category";
export const policyFor = (mode: ProtectionMode, category: SafetyCategory): ProtectionAction => {
  if (category === "SAFE" || category === "UNKNOWN") return category === "UNKNOWN" && mode === "kids" ? "WARN" : "ALLOW";
  if (mode === "standard") return ["PHISHING", "MALWARE"].includes(category) ? "BLOCK" : ["SCAM", "SUSPICIOUS_DOWNLOAD"].includes(category) ? "WARN" : "ALLOW";
  if (mode === "family") return ["ADULT", "GAMBLING", "PHISHING", "MALWARE", "SCAM"].includes(category) ? "BLOCK" : ["DRUGS", "GRAPHIC_VIOLENCE", "SUSPICIOUS_DOWNLOAD"].includes(category) ? "WARN" : "ALLOW";
  return ["SUSPICIOUS_DOWNLOAD"].includes(category) ? "WARN" : "BLOCK";
};
