import type { ClassificationResult } from "../shared/classification-result";
import type { ProtectionMode } from "../shared/types";
import type { ProtectionAction } from "../shared/safety-category";
import { policyFor } from "./protection-policy";
export interface PolicyDecision { action: ProtectionAction; reasonCode: string; }
export function decide(result: ClassificationResult, mode: ProtectionMode): PolicyDecision {
  if (result.category === "SAFE" || result.category === "UNKNOWN" || result.confidence < 0.5) return { action: "ALLOW", reasonCode: "low_or_uncertain_content_risk" };
  return { action: policyFor(mode, result.category), reasonCode: `content_${result.category.toLowerCase()}` };
}
