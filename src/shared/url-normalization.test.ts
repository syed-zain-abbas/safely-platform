import { describe, expect, it } from "vitest";
import { normalizeDomainInput, normalizeUrl } from "./url-normalization";

describe("normalizeUrl", () => {
  it("normalizes casing, default ports, and one leading www label", () => {
    const result = normalizeUrl("HTTPS://WWW.PayPal.COM:443/login");
    expect(result).toMatchObject({
      status: "ok",
      protocol: "https:",
      hostname: "www.paypal.com",
      hostnameWithoutWww: "paypal.com",
      registrableDomain: "paypal.com",
      specifiedPort: 443,
      effectivePort: 443
    });
  });

  it("does not mistake a deceptive subdomain for the registrable domain", () => {
    const result = normalizeUrl("https://www.paypal.com.evil.example.co.uk/sign-in");
    expect(result.hostname).toBe("www.paypal.com.evil.example.co.uk");
    expect(result.hostnameWithoutWww).toBe("paypal.com.evil.example.co.uk");
    expect(result.registrableDomain).toBe("example.co.uk");
  });

  it("uses ASCII punycode as the matching value for IDNs", () => {
    const result = normalizeUrl("https://раypal.com/login");
    expect(result.status).toBe("ok");
    expect(result.isIdn).toBe(true);
    expect(result.asciiHostname).toMatch(/^xn--/);
    expect(result.hostname).not.toBe("paypal.com");
  });

  it("does not allow user-info to conceal the true host", () => {
    const result = normalizeUrl("https://paypal.com@evil.example/path");
    expect(result.hostname).toBe("evil.example");
    expect(result.registrableDomain).toBe("evil.example");
    expect(result.hasCredentials).toBe(true);
  });

  it("classifies IPv4, IPv6, and localhost without fabricating registrable domains", () => {
    expect(normalizeUrl("https://127.000.000.001:8443/admin")).toMatchObject({ hostname: "127.0.0.1", hostType: "ipv4", registrableDomain: null, specifiedPort: 8443 });
    expect(normalizeUrl("https://[::1]:8080/")).toMatchObject({ hostname: "::1", hostType: "ipv6", registrableDomain: null, specifiedPort: 8080 });
    expect(normalizeUrl("http://LOCALHOST:3000/")).toMatchObject({ hostname: "localhost", hostType: "localhost", registrableDomain: null, effectivePort: 3000 });
  });

  it("returns a structured failure for malformed or unsupported URLs", () => {
    expect(normalizeUrl("https://example.com%2f.evil.test")).toMatchObject({ status: "invalid", hostname: null });
    expect(normalizeUrl("http://[::1")).toMatchObject({ status: "invalid", hostname: null });
    expect(normalizeUrl("javascript:alert(1)")).toMatchObject({ status: "unsupported-scheme", hostname: null });
  });
});

describe("normalizeDomainInput", () => {
  it("accepts domains but rejects bare public suffixes, IPs, and URL-like input", () => {
    expect(normalizeDomainInput("WWW.Example.CO.UK")).toBe("www.example.co.uk");
    expect(normalizeDomainInput("co.uk")).toBeNull();
    expect(normalizeDomainInput("127.0.0.1")).toBeNull();
    expect(normalizeDomainInput("https://example.com/path")).toBeNull();
  });
});
