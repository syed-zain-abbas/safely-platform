import type { RuleTarget } from "./types";

/**
 * Deliberately non-routable test entries. Replace this bundled list with a
 * signed, reviewed threat-intelligence feed before production release.
 */
export const BUNDLED_RULES: RuleTarget[] = [
  { domain: "adult-test.invalid", category: "adult" },
  { domain: "phishing-test.invalid", category: "phishing" },
  { domain: "malware-test.invalid", category: "malware" },
  { domain: "gambling-test.invalid", category: "gambling" },
  { domain: "scam-test.invalid", category: "scam" }
];

export function normalizeDomain(input: string): string | null {
  const candidate = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^\*\./, "");
  if (!candidate || candidate.length > 253 || candidate.includes("@") || candidate.includes("..")) return null;
  try {
    const hostname = new URL(`https://${candidate}`).hostname;
    if (hostname !== candidate || !hostname.includes(".") || hostname.split(".").some((part) => !part || part.length > 63)) return null;
    return hostname;
  } catch {
    return null;
  }
}
