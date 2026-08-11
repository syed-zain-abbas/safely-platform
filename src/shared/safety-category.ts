export const SAFETY_CATEGORIES = ["SAFE", "ADULT", "GAMBLING", "PHISHING", "SCAM", "MALWARE", "DRUGS", "GRAPHIC_VIOLENCE", "HATE_EXTREMISM", "SUSPICIOUS_DOWNLOAD", "UNKNOWN"] as const;
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];
export type ProtectionAction = "ALLOW" | "WARN" | "BLOCK";
