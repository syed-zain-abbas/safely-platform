import { CLASSIFIER_CONFIG, type WeightedKeyword } from "./classifier-config";
import { ADULT_KEYWORDS } from "./dictionaries/adult-keywords";
import { DOWNLOAD_KEYWORDS } from "./dictionaries/download-keywords";
import { DRUGS_KEYWORDS } from "./dictionaries/drugs-keywords";
import { GAMBLING_KEYWORDS } from "./dictionaries/gambling-keywords";
import { HATE_KEYWORDS } from "./dictionaries/hate-keywords";
import { PHISHING_KEYWORDS } from "./dictionaries/phishing-keywords";
import { SCAM_KEYWORDS } from "./dictionaries/scam-keywords";
import { VIOLENCE_KEYWORDS } from "./dictionaries/violence-keywords";
import type { ClassificationResult } from "../shared/classification-result";
import type { PageSafetySignals } from "../shared/page-safety-signals";
import { SAFETY_CATEGORIES, type SafetyCategory } from "../shared/safety-category";

const dictionaries: Partial<Record<SafetyCategory, WeightedKeyword[]>> = { ADULT: ADULT_KEYWORDS, GAMBLING: GAMBLING_KEYWORDS, PHISHING: PHISHING_KEYWORDS, SCAM: SCAM_KEYWORDS, DRUGS: DRUGS_KEYWORDS, GRAPHIC_VIOLENCE: VIOLENCE_KEYWORDS, HATE_EXTREMISM: HATE_KEYWORDS, SUSPICIOUS_DOWNLOAD: DOWNLOAD_KEYWORDS };
const contextTerms = ["medical", "treatment", "recovery", "education", "lesson", "research", "academic", "university", "history", "news", "journalism", "legal", "cybersecurity", "tutorial", "prevention", "health"];
const count = (text: string, term: string) => text.split(term).length - 1;
const escapeRegExp = (value: string) => value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
const hasContextTerm = (text: string, term: string) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text);
const scores = (): Record<SafetyCategory, number> => Object.fromEntries(SAFETY_CATEGORIES.map((category) => [category, 0])) as Record<SafetyCategory, number>;

export function classifyPage(signals: PageSafetySignals): ClassificationResult {
  const categoryScores = scores(); const reasons: string[] = []; const uncertaintyFlags: string[] = [];
  const areas = [[signals.title, CLASSIFIER_CONFIG.titleMultiplier, "title"], [signals.metaDescription, CLASSIFIER_CONFIG.metaMultiplier, "description"], [signals.headings.join(" "), CLASSIFIER_CONFIG.headingMultiplier, "heading"], [signals.visibleText, CLASSIFIER_CONFIG.textMultiplier, "page text"]] as const;
  for (const [category, words] of Object.entries(dictionaries) as [SafetyCategory, WeightedKeyword[]][]) for (const keyword of words) {
    // Avoid double-counting a short term contained in an already matched phrase
    // (for example, "casino" inside "online casino").
    if (words.some((other) => other.term.length > keyword.term.length && other.term.includes(keyword.term) && areas.some(([text]) => text.includes(other.term)))) continue;
    let found = 0; let strongest = "";
    for (const [text, multiplier, area] of areas) { const hits = Math.min(3, count(text, keyword.term)); if (hits) { found += hits * multiplier; strongest = area; } }
    if (found) { categoryScores[category] += keyword.weight * found; if (found >= 2) reasons.push(`${category} indicators found in ${strongest}`); }
  }
  if (signals.hasPasswordField && signals.loginTerms.length && signals.paymentTerms.length) { categoryScores.PHISHING += 22; reasons.push("Password form combined with login and payment language"); }
  const executableDownloads = signals.suspiciousDownloadExtensions.filter((extension) => ["exe", "msi", "dmg", "pkg", "apk", "scr", "bat"].includes(extension));
  if (signals.downloadLinkCount && executableDownloads.length) { categoryScores.SUSPICIOUS_DOWNLOAD += Math.min(30, 10 + executableDownloads.length * 5); reasons.push("Suspicious executable download links detected"); }
  const fullText = `${signals.title} ${signals.metaDescription} ${signals.headings.join(" ")} ${signals.visibleText}`;
  if (contextTerms.some((term) => hasContextTerm(fullText, term))) { for (const category of ["DRUGS", "GAMBLING", "PHISHING", "ADULT", "GRAPHIC_VIOLENCE", "HATE_EXTREMISM"] as SafetyCategory[]) categoryScores[category] = Math.round(categoryScores[category] * 0.45); uncertaintyFlags.push("Educational, medical, research, news, or recovery context detected"); }
  for (const category of SAFETY_CATEGORIES) categoryScores[category] = Math.min(CLASSIFIER_CONFIG.maxScore, categoryScores[category]);
  const ranked = (Object.entries(categoryScores) as [SafetyCategory, number][]).filter(([category]) => category !== "SAFE" && category !== "UNKNOWN").sort((a, b) => b[1] - a[1]);
  const [topCategory, topScore] = ranked[0] ?? ["UNKNOWN", 0]; const second = ranked[1]?.[1] ?? 0;
  if (topScore < CLASSIFIER_CONFIG.suspiciousThreshold || topScore - second < 12) { if (topScore >= 20) uncertaintyFlags.push("Evidence is weak or conflicting"); return { category: topScore < 20 ? "SAFE" : "UNKNOWN", confidence: Math.round(topScore) / 100, categoryScores, reasons, uncertaintyFlags }; }
  return { category: topCategory, confidence: Math.round(topScore) / 100, categoryScores, reasons, uncertaintyFlags };
}
