import type { ClassificationResult } from "./classification-result";
import type { PageSafetySignals } from "./page-safety-signals";
import type { ProtectionAction } from "./safety-category";
export interface PageSignalsMessage { type: "PAGE_SIGNALS"; signals: PageSafetySignals; }
export interface ClassificationResultMessage { type: "CLASSIFICATION_RESULT"; result: ClassificationResult; }
export interface PolicyDecisionMessage { type: "POLICY_DECISION"; action: ProtectionAction; category: string; reasonCode: string; }
export type ExtensionMessage = PageSignalsMessage | ClassificationResultMessage | PolicyDecisionMessage | { type: "GET_STATUS" };
