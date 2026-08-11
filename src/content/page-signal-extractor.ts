import type { PageSafetySignals } from "../shared/page-safety-signals";
export interface ExtractorOptions { maxVisibleText?: number; }
const limit = (value: string, max: number) => value.replace(/\s+/g, " ").trim().toLowerCase().slice(0, max);
const terms = (text: string, values: string[]) => values.filter((term) => text.includes(term));
export function extractPageSafetySignals(options: ExtractorOptions = {}): PageSafetySignals {
  const max = options.maxVisibleText ?? 7_500;
  const title = limit(document.title, 500);
  const metaDescription = limit(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "", 1_000);
  const headings = [...document.querySelectorAll("h1,h2,h3")].slice(0, 30).map((heading) => limit(heading.textContent ?? "", 300)).filter(Boolean);
  const visibleText = limit(document.body?.innerText ?? "", max);
  const text = `${title} ${metaDescription} ${headings.join(" ")} ${visibleText}`;
  const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")];
  const downloads = links.filter((link) => link.hasAttribute("download") || /\.(exe|msi|dmg|pkg|apk|zip|scr|bat)(?:$|[?#])/i.test(link.href));
  const extensions = [...new Set(downloads.map((link) => link.href.match(/\.(exe|msi|dmg|pkg|apk|zip|scr|bat)(?:$|[?#])/i)?.[1]?.toLowerCase()).filter((value): value is string => Boolean(value)))];
  return { hostname: location.hostname.toLowerCase(), title, metaDescription, headings, visibleText, hasPasswordField: Boolean(document.querySelector('input[type="password"]')), formCount: document.forms.length, externalLinkCount: links.filter((link) => { try { return new URL(link.href).hostname !== location.hostname; } catch { return false; } }).length, downloadLinkCount: downloads.length, suspiciousDownloadExtensions: extensions, loginTerms: terms(text, ["sign in", "log in", "password", "account"]), paymentTerms: terms(text, ["credit card", "payment", "billing", "bank account"]) };
}
