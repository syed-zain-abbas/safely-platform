export const CATEGORIES = ["adult", "phishing", "malware", "gambling", "scam"] as const;
export type Category = (typeof CATEGORIES)[number];
export type ProtectionMode = "kids" | "family" | "standard" | "custom";

export type CategorySettings = Record<Category, boolean>;

export interface Settings {
  mode: ProtectionMode;
  customCategories: CategorySettings;
  blockedDomains: string[];
  pin: PinVerifier | null;
  analyticsEnabled: boolean;
}

export interface PinVerifier {
  salt: string;
  hash: string;
  iterations: number;
}

export interface RuleTarget {
  domain: string;
  category: Category;
}

export interface StatusMessage {
  type: "SAFELY_STATUS";
  enabledCategories: CategorySettings;
  mode: ProtectionMode;
}

export const MODE_CATEGORIES: Record<Exclude<ProtectionMode, "custom">, CategorySettings> = {
  kids: { adult: true, phishing: true, malware: true, gambling: true, scam: true },
  family: { adult: true, phishing: true, malware: true, gambling: true, scam: true },
  standard: { adult: false, phishing: true, malware: true, gambling: true, scam: true }
};

export const DEFAULT_SETTINGS: Settings = {
  mode: "family",
  customCategories: { adult: true, phishing: true, malware: true, gambling: true, scam: true },
  blockedDomains: [],
  pin: null,
  analyticsEnabled: false
};

export function enabledCategories(settings: Settings): CategorySettings {
  return settings.mode === "custom" ? settings.customCategories : MODE_CATEGORIES[settings.mode];
}
