import type { RuleTarget } from "./types";

/**
 * Reserved example.com test entries. DNR evaluates these before a network
 * request, so they are safe to exercise without visiting unsafe content.
 * Replace this bundled list with a signed, reviewed threat-intelligence feed
 * before production release.
 */
export const BUNDLED_RULES: RuleTarget[] = [
  { domain: "adult-test.example.com", category: "adult" },
  { domain: "phishing-test.example.com", category: "phishing" },
  { domain: "malware-test.example.com", category: "malware" },
  { domain: "gambling-test.example.com", category: "gambling" },
  { domain: "scam-test.example.com", category: "scam" }
];
