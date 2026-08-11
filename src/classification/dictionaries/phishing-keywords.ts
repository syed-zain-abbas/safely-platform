import type { WeightedKeyword } from "../classifier-config";
export const PHISHING_KEYWORDS: WeightedKeyword[] = [{ term: "verify your account", weight: 16 }, { term: "confirm your password", weight: 20 }, { term: "account suspended", weight: 16 }, { term: "sign in immediately", weight: 14 }, { term: "security alert", weight: 8 }, { term: "phishing", weight: 45 }];
