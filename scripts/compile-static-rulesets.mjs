/* Downloads public domain-only category lists and builds a conservative 30k
   static DNR release. Run this only in the release-maintenance environment. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const sources = {
  adult: ["https://blocklistproject.github.io/Lists/alt-version/porn-nl.txt", 12000],
  phishing: ["https://blocklistproject.github.io/Lists/alt-version/phishing-nl.txt", 7000],
  malware: ["https://blocklistproject.github.io/Lists/alt-version/malware-nl.txt", 5000],
  gambling: ["https://blocklistproject.github.io/Lists/alt-version/gambling-nl.txt", 3000],
  scam: ["https://blocklistproject.github.io/Lists/alt-version/scam-nl.txt", 3000]
};
const output = resolve("public/rulesets");
const valid = (value) => /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i.test(value) && value.includes(".") && !value.includes("..");
const hash = (value) => { let h = 2166136261; for (const char of value) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return h >>> 0; };
await mkdir(output, { recursive: true });
for (const [category, [url, cap]] of Object.entries(sources)) {
  const response = await fetch(url, { headers: { "User-Agent": "safely-platform-ruleset-builder/0.1" } });
  if (!response.ok) throw new Error(`${category}: ${response.status} ${response.statusText}`);
  const domains = [...new Set((await response.text()).split(/\r?\n/).map((line) => line.trim().toLowerCase()).filter((line) => line && !line.startsWith("#") && valid(line)))];
  // Stable hash sampling avoids alphabetical bias when the source is larger than the release budget.
  const selected = domains.sort((left, right) => hash(left) - hash(right) || left.localeCompare(right)).slice(0, cap);
  const rules = selected.map((domain, index) => ({ id: index + 1, priority: 1, action: { type: "block" }, condition: { urlFilter: `||${domain}^`, resourceTypes: ["main_frame"] } }));
  await writeFile(resolve(output, `${category}.json`), JSON.stringify(rules));
  console.log(`${category}: ${rules.length} rules`);
}
