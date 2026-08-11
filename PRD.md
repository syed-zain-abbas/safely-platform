# Product Requirements Document: safely-platform Chrome Extension

**Document status:** MVP specification  
**Product:** safely-platform  
**Platform:** Google Chrome extension (Manifest V3)  
**Primary outcome:** Give families a simple, privacy-respecting way to prevent accidental or intentional access to unsafe websites.

## 1. Problem statement

Families share devices and internet access, but parents and guardians cannot reliably prevent exposure to adult content, phishing, malware, gambling, scams, and known unwanted websites without deploying complex, invasive, or costly tools. Browser-level protection should be easy to configure, effective before a page is used, and transparent to the person browsing.

The MVP will provide local, policy-based Chrome browsing protection that blocks high-risk destinations and lets a guardian choose an age-appropriate protection mode.

## 2. Goals and success measures

| Goal | MVP measure |
|---|---|
| Protect against the defined unsafe categories | At least 95% block rate on a maintained, labeled validation set of 500+ malicious/unsafe test URLs; no more than 2% false-positive rate on a 500+ URL benign validation set. |
| Make setup understandable | At least 90% of usability-test participants can select a mode and add a site to the block list without assistance in five minutes. |
| Keep protection responsive | 99% of navigation decisions complete within 150 ms measured locally, excluding Chrome navigation time. |
| Respect privacy | No full URLs, page contents, search terms, typed form data, account identifiers, or browsing-history records leave the device in the MVP. |

## 3. Personas

### Primary: guardian

A parent or caregiver setting policies on a shared family computer. They want dependable protection, clear controls, and a concise explanation when content is blocked.

### Secondary: child

A child using the browser for school, entertainment, and communication. They need safe access and an understandable block page that does not expose inappropriate details.

### Secondary: family member

An adult or teenager using a shared device. They need a predictable policy, minimal disruption to legitimate sites, and an appropriate way to ask the guardian for a review.

### Internal: safety operations owner

A product/security owner who publishes signed category-rule updates and evaluates aggregate product quality without collecting browsing behavior.

## 4. Product modes

Modes are selectable from the extension settings. A single active mode applies to the Chrome profile.

| Mode | Default blocked categories | Intended use |
|---|---|---|
| Kids | Adult content, phishing, malware, gambling, scam pages | Younger children; strongest default protection. |
| Family | Adult content, phishing, malware, gambling, scam pages | Shared household protection. |
| Standard | Phishing, malware, gambling, scam pages | General safer browsing for a mature user. |
| Custom | Guardian-selected subset of adult content, phishing, malware, gambling, and scam pages | Households that need a tailored policy. |

User-defined blocked sites are blocked in every mode. The MVP does not include category allowlists; a guardian may remove a site from their own user-defined block list.

## 5. User stories

1. As a guardian, I can choose Kids, Family, Standard, or Custom mode so the browser policy suits the person using the device.
2. As a guardian, I can turn individual categories on or off in Custom mode so I control the policy precisely.
3. As a guardian, I can add a domain to a personal block list so that site is blocked regardless of the selected mode.
4. As a guardian, I can remove a domain I previously added so I can correct a mistake.
5. As a child or family member, I see a clear, neutral block page before an unsafe site is loaded so I know why access stopped.
6. As a guardian, I can protect settings with a locally stored PIN so another user cannot casually weaken protection.
7. As a safety operations owner, I can publish integrity-checked category rules so new known threats are protected without inspecting users' browsing.

## 6. Functional requirements

### 6.1 Navigation enforcement

- **FR-1:** The extension shall evaluate top-level HTTP and HTTPS navigations before the destination page becomes usable.
- **FR-2:** The extension shall block a navigation when the normalized hostname or URL matches an enabled category rule or user-defined blocked-site rule.
- **FR-3:** The extension shall route a blocked navigation to an extension-owned interstitial that identifies the broad reason: Adult content, Phishing, Malware, Gambling, Scam, or Blocked by family rule.
- **FR-4:** The interstitial shall not render destination page content, fetched preview data, or the full blocked URL. It may display the registrable domain when doing so is safe and useful.
- **FR-5:** Category enforcement shall use a signed, versioned local ruleset. The MVP shall ship with a ruleset and check for updates at most once every 24 hours when the browser is online.
- **FR-6:** If an update cannot be verified or downloaded, the extension shall retain and enforce the last verified ruleset.
- **FR-7:** User-defined site blocking shall support exact domains and subdomains. Adding `example.com` shall block `example.com` and all its subdomains. The entry UI shall reject malformed domains and public suffixes alone (for example, `com`).
- **FR-8:** A user-defined rule shall take effect within five seconds of saving and shall persist across browser restarts for that Chrome profile.

### 6.2 Modes and settings

- **FR-9:** The settings UI shall expose exactly four modes: Kids, Family, Standard, and Custom, with the defaults defined in Section 4.
- **FR-10:** Selecting Kids, Family, or Standard shall immediately apply the corresponding locked category set.
- **FR-11:** Selecting Custom shall show five independent category toggles and shall apply the selected set immediately after saving.
- **FR-12:** The extension shall show the active mode and enabled categories in its settings UI and browser-action popup.
- **FR-13:** Settings changes, including mode changes and changes to the personal block list, shall require successful local PIN verification after a guardian has enabled PIN protection.
- **FR-14:** The MVP shall provide an optional local PIN of 4-12 digits. The PIN shall be stored only as a salted, memory-hard verifier; plaintext PINs shall never be stored or transmitted.
- **FR-15:** If PIN protection is not enabled, the extension shall clearly state that settings can be changed by anyone using the Chrome profile.

### 6.3 Usability and recovery

- **FR-16:** The block page shall provide a “Go back” action and a “Ask a guardian” instruction. “Ask a guardian” is informational only in the MVP and must not send a message or record the URL.
- **FR-17:** The block page shall include a “Report possible mistake” link that opens a generic feedback form without pre-populating the URL. Submitting feedback is optional and requires affirmative consent.
- **FR-18:** The extension shall show an accessible error state if its policy engine is unavailable, stating whether browsing protection may be reduced. It shall attempt to recover automatically without user action.

## 7. Non-functional requirements

- **NFR-1 — Compatibility:** Support the current stable Chrome release and the two immediately preceding major Chrome versions on desktop operating systems supported by Chrome.
- **NFR-2 — Performance:** Local rule lookup P95 shall be at most 50 ms; end-to-end navigation-policy decision P99 shall be at most 150 ms on the supported test hardware.
- **NFR-3 — Reliability:** In automated end-to-end tests, the extension shall correctly enforce enabled rules in at least 99.5% of 10,000 repeat navigation attempts.
- **NFR-4 — Availability:** Policy checks must work while offline using the last verified local ruleset and local settings.
- **NFR-5 — Accessibility:** All extension UI and block pages shall meet WCAG 2.1 AA for keyboard navigation, color contrast, focus visibility, and screen-reader labels.
- **NFR-6 — Security updates:** Critical rule updates may be fetched on browser start and then no more than hourly for 24 hours after a verified security emergency flag; ordinary checks remain capped at once per 24 hours.
- **NFR-7 — Maintainability:** Rule and application code shall have automated tests for URL normalization, mode mapping, PIN gating, update-signature validation, and every unsafe category.

## 8. Privacy requirements

- **PR-1:** Default operation shall make block/allow decisions entirely on device.
- **PR-2:** The extension shall not transmit, store remotely, or include in analytics: full URLs, paths, query strings, referrers, page text, page titles, search queries, form inputs, downloads, IP addresses, Chrome account identifiers, or persistent device identifiers.
- **PR-3:** Ruleset updates may request only the ruleset endpoint. The request shall contain no user identifier and use standard transport metadata only as required by HTTPS.
- **PR-4:** Local settings, PIN verifier, and user-defined blocked domains shall remain in Chrome extension storage and shall not be synced or exported in the MVP.
- **PR-5:** Any optional feedback flow shall explain what is sent before submission and shall not include the blocked URL automatically.
- **PR-6:** The privacy notice shall describe data processing in plain language, distinguish local data from optional telemetry, and state retention periods.
- **PR-7:** Deleting the extension shall remove locally stored settings and user-defined blocked domains through Chrome’s normal extension-data removal behavior.

## 9. Threat model

| Threat | Risk | MVP mitigation | Residual risk |
|---|---|---|---|
| Known malicious/adult/gambling/scam destination | Exposure, fraud, malware | Local category rules evaluated before usable navigation; signed ruleset updates | Newly registered or unclassified sites may not be blocked. |
| Lookalike phishing domain | Credential theft | Phishing category rules; robust hostname normalization and IDN/punycode handling | Sophisticated, newly created phishing sites may evade rules. |
| Ruleset tampering or malicious update | Broad under- or over-blocking | HTTPS, signed versioned bundles, embedded public key, reject rollback and invalid signatures | Compromise of signing key remains high impact. |
| Local user disables protections | Unsafe access | Optional PIN-gated settings; clear status in popup | A user with OS/Chrome profile control can disable/remove the extension. |
| Extension compromise | Data exposure or policy bypass | Minimum permissions, Manifest V3, restrictive CSP, no remote executable code, dependency review, signed releases | Browser vulnerabilities and supply-chain attacks remain possible. |
| Malicious input in domain list | UI injection, malformed matching | Strict domain parsing, canonicalization, escaping, input-length limits, tests | Unicode display can still confuse users; display canonical domain. |
| Analytics becomes browsing surveillance | Sensitive behavior collection | Aggregate, opt-in telemetry with category-only counters and no identifiers | Network metadata at the telemetry provider is outside product-level data minimization. |

The MVP explicitly does not claim to protect against a user with administrative control of the device, browser developer tools/extension removal privileges, network-level attacks, encrypted malicious payloads from unknown sites, or all zero-day threats.

## 10. Analytics and quality measurement

Analytics are disabled by default and require explicit guardian opt-in. They are designed to measure product quality, not browsing behavior.

| Event | Allowed fields | Prohibited fields | Retention |
|---|---|---|---|
| Setup completed | mode selected; PIN enabled yes/no | identity, device ID, location | 30 days |
| Ruleset status | ruleset version; update success/failure; coarse error class | URL, IP, user ID | 30 days |
| Enforcement outcome | category; decision blocked/allowed; ruleset version; daily locally randomized aggregate count | domain, URL, timestamp precise enough to reconstruct browsing, session ID | 30 days |
| Settings change | setting type and new mode/category state | prior browsing data, identity | 30 days |
| Optional feedback | free-text only if user submits it; category selected | auto-attached URL, browsing history | 30 days |

Requirements:

- Analytics uploads shall batch no more than once per 24 hours and contain aggregate counts, not event-level browsing logs.
- Enforcement counts shall be capped at 100 per category per day before upload.
- No analytics identifier may persist longer than the current installation; the MVP should prefer no identifier at all.
- Product dashboards shall report aggregate adoption, ruleset health, category-level block volumes, and false-positive feedback rate only.

## 11. Out of scope for MVP

- iOS, Android, Firefox, Edge, Safari, router, DNS, or network-wide filtering.
- Per-child profiles, age verification, or identity management.
- Remote parent dashboards, cloud accounts, cross-device synchronization, or remote policy management.
- AI/ML classification of live page contents, screenshot inspection, or keystroke monitoring.
- Reading, recording, or reporting browsing history.
- Time limits, screen-time schedules, location tracking, app blocking, or social-media monitoring.
- A guardian bypass/approval workflow, category allowlists, paid subscriptions, or customer support tooling.
- A guarantee that every unsafe or newly created site will be blocked.

## 12. MVP acceptance criteria

The MVP is ready for release only when all of the following pass in release-candidate testing:

1. Each of the four modes can be selected, survives a browser restart, and results in the exact category sets specified in Section 4 across 20 automated test runs per mode.
2. For each of the five unsafe categories, at least 95 of 100 labeled blocked test URLs are intercepted and shown the correct broad-category block page before page content becomes usable.
3. At least 490 of 500 labeled benign test URLs remain accessible; no benign test URL is redirected to a block page.
4. Adding `example.com` blocks `example.com`, `www.example.com`, and `sub.example.com` within five seconds; removing the rule restores access within five seconds. This passes in 20 consecutive automated runs.
5. A malformed domain and a public suffix-only entry are rejected with an actionable validation message in 100% of the specified input-validation test cases.
6. With a PIN enabled, 100% of tested settings and block-list changes require the correct PIN; 10 consecutive incorrect PIN attempts do not reveal whether an individual digit was correct and do not change policy.
7. Offline testing blocks all URLs covered by the last verified ruleset in 100 of 100 test navigations.
8. An invalid, expired, or incorrectly signed ruleset is rejected in 100% of update-validation tests, and the prior verified ruleset remains active.
9. The navigation decision meets the Section 7 P95/P99 performance targets on supported test hardware over 10,000 navigations.
10. A privacy review verifies that test network captures contain no full URL, page content, search query, referrer, account identifier, or persistent device identifier.
11. Keyboard-only and screen-reader QA finds no critical WCAG 2.1 AA failures on the popup, settings page, domain-list controls, PIN flow, and block page.
12. Analytics remains off by default; when enabled, payload inspection confirms only the approved fields in Section 10 are sent.

## 13. Version 2 backlog

Prioritized after MVP security, privacy, and false-positive metrics are stable:

1. Guardian-request workflow with local PIN approval and an auditable, local-only request queue.
2. Per-user Chrome-profile policy templates and child-specific configurations.
3. Guardian-managed allowlist with expiration and clear precedence rules.
4. Optional encrypted sync of settings across the guardian’s devices, with an explicit account model and separate privacy review.
5. Safer Search / restricted-mode integrations where supported by third parties.
6. Managed-device support for schools and organizations through Chrome Enterprise policies.
7. Improved multilingual block pages and localized category descriptions.
8. A privacy-preserving false-positive reporting pipeline using explicit URL submission only after informed consent.
9. Expanded threat-intelligence sources, reputation expiry, and faster signed emergency-rule delivery.
10. An independent security assessment, public privacy review, and ongoing external ruleset-quality evaluation.

## 14. Release decision

The product manager, security owner, and privacy reviewer must each approve the MVP evidence against Section 12. Any failure involving transmission of prohibited browsing data, acceptance of an invalid ruleset, or a bypass that disables enabled policy without PIN authorization is a release blocker.
