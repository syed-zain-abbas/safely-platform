import type { SafetyCategory } from "./safety-category";
export interface ClassificationResult { category: SafetyCategory; confidence: number; categoryScores: Record<SafetyCategory, number>; reasons: string[]; uncertaintyFlags: string[]; }
