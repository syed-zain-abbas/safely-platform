import { parse } from "tldts";

export type UrlParseStatus = "ok" | "invalid" | "unsupported-scheme";
export type HostType = "domain" | "ipv4" | "ipv6" | "localhost" | "none";

export interface NormalizedUrl {
  /** The original, unmodified input. Never use this string as a matching key. */
  input: string;
  status: UrlParseStatus;
  protocol: "http:" | "https:" | null;
  hostname: string | null;
  /** ASCII/punycode hostname used for all comparisons and rule lookups. */
  asciiHostname: string | null;
  /** Removes exactly one leading `www.` label for a secondary matching key. */
  hostnameWithoutWww: string | null;
  /** eTLD+1 from the Public Suffix List; never infer this by simply taking two labels. */
  registrableDomain: string | null;
  publicSuffix: string | null;
  hostType: HostType;
  isIdn: boolean;
  hasCredentials: boolean;
  specifiedPort: number | null;
  effectivePort: number | null;
  origin: string | null;
  error: string | null;
}

const EMPTY_RESULT: Omit<NormalizedUrl, "input" | "status" | "error"> = {
  protocol: null,
  hostname: null,
  asciiHostname: null,
  hostnameWithoutWww: null,
  registrableDomain: null,
  publicSuffix: null,
  hostType: "none",
  isIdn: false,
  hasCredentials: false,
  specifiedPort: null,
  effectivePort: null,
  origin: null
};

function invalid(input: string, status: Exclude<UrlParseStatus, "ok">, error: string): NormalizedUrl {
  return { input, status, error, ...EMPTY_RESULT };
}

function isIpv4(hostname: string): boolean {
  const labels = hostname.split(".");
  return labels.length === 4 && labels.every((label) => /^\d{1,3}$/.test(label) && Number(label) <= 255);
}

function isIpv6(hostname: string): boolean {
  return hostname.includes(":");
}

function normalizeAsciiHostname(hostname: string): string {
  // WHATWG URL serializes domain names to lowercase ASCII/punycode. IPv6 hosts
  // are serialized with brackets, which are not useful for host comparisons.
  const unbracketed = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  return unbracketed.toLowerCase().replace(/\.$/, "");
}

function extractSpecifiedPort(input: string): number | null {
  // URL.port intentionally normalizes an explicit default port (for example
  // :443) to an empty string. Preserve the user-specified port separately.
  const schemeEnd = input.indexOf("://");
  if (schemeEnd < 0) return null;
  const authority = input.slice(schemeEnd + 3).split(/[/?#]/, 1)[0];
  const hostPort = authority.slice(authority.lastIndexOf("@") + 1);
  const portText = hostPort.startsWith("[")
    ? hostPort.slice(hostPort.indexOf("]") + 1).replace(/^:/, "")
    : hostPort.slice(hostPort.lastIndexOf(":") + 1);
  if (!/^\d+$/.test(portText)) return null;
  const port = Number(portText);
  return Number.isSafeInteger(port) && port >= 0 && port <= 65_535 ? port : null;
}

function effectivePort(protocol: "http:" | "https:", serializedPort: string): number {
  if (serializedPort) return Number(serializedPort);
  return protocol === "https:" ? 443 : 80;
}

/**
 * Safely normalizes HTTP(S) URLs for security policy decisions.
 *
 * Matching must always use `asciiHostname`, `hostnameWithoutWww`, or
 * `registrableDomain`, never a Unicode-rendered hostname or the raw input.
 */
export function normalizeUrl(input: string): NormalizedUrl {
  const value = input.trim();
  if (!value) return invalid(input, "invalid", "URL is empty.");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid(input, "invalid", "URL could not be parsed.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return invalid(input, "unsupported-scheme", "Only HTTP and HTTPS URLs are supported.");
  }

  const hostname = normalizeAsciiHostname(url.hostname);
  if (!hostname) return invalid(input, "invalid", "URL does not include a hostname.");

  const localhost = hostname === "localhost" || hostname.endsWith(".localhost");
  const ipv4 = isIpv4(hostname);
  const ipv6 = isIpv6(hostname);
  const hostType: HostType = localhost ? "localhost" : ipv4 ? "ipv4" : ipv6 ? "ipv6" : "domain";
  const domainInfo = hostType === "domain" ? parse(hostname, { allowPrivateDomains: false }) : null;

  return {
    input,
    status: "ok",
    protocol: url.protocol,
    hostname,
    asciiHostname: hostname,
    hostnameWithoutWww: hostname.startsWith("www.") ? hostname.slice(4) : hostname,
    registrableDomain: domainInfo?.domain ?? null,
    publicSuffix: domainInfo?.publicSuffix ?? null,
    hostType,
    isIdn: hostname.split(".").some((label) => label.startsWith("xn--")),
    hasCredentials: Boolean(url.username || url.password),
    specifiedPort: extractSpecifiedPort(value),
    effectivePort: effectivePort(url.protocol, url.port),
    origin: url.origin,
    error: null
  };
}

/** Safely accepts a guardian-entered domain (with or without an HTTP scheme). */
export function normalizeDomainInput(input: string): string | null {
  const candidate = input.trim();
  if (!candidate || candidate.includes("@") || candidate.includes(":") || candidate.includes("/") || candidate.includes("?") || candidate.includes("#")) return null;
  const result = normalizeUrl(`https://${candidate.replace(/^\*\./, "")}`);
  if (result.status !== "ok" || !result.asciiHostname || result.hostType !== "domain") return null;
  // A registrable domain exists only when the input is not a bare public suffix.
  if (!result.registrableDomain || result.asciiHostname === result.publicSuffix) return null;
  return result.asciiHostname;
}
