import { describe, expect, it } from "vitest";
import { parseLocalRuleset } from "./local-ruleset-import";

describe("parseLocalRuleset", () => {
  it("normalizes, de-duplicates, and retains valid category rules", () => {
    const result = parseLocalRuleset(JSON.stringify({ rules: [{ domain: "WWW.Example.COM", category: "adult" }, { domain: "www.example.com", category: "adult" }, { domain: "bad input", category: "scam" }] }));
    expect(result.ruleset.rules).toEqual([{ domain: "www.example.com", category: "adult" }]);
    expect(result.rejected).toEqual(["bad input"]);
  });

  it("rejects invalid ruleset shapes", () => expect(() => parseLocalRuleset("[]")).toThrow("rules array"));
});
