export interface WeightedKeyword { term: string; weight: number; }
export const CLASSIFIER_CONFIG = { maxScore: 100, titleMultiplier: 3, metaMultiplier: 2, headingMultiplier: 2, textMultiplier: 1, reportThreshold: 25, suspiciousThreshold: 50, highThreshold: 70, veryHighThreshold: 85 } as const;
