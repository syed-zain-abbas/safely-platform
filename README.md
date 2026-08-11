# safely-platform

A privacy-respecting Chrome Manifest V3 extension scaffold for family safer browsing. It uses Chrome's `declarativeNetRequest` API for browser-enforced top-level navigation redirects and keeps settings and user-defined blocked domains in `chrome.storage.local`.

## Included surfaces

- Manifest V3 service worker that derives dynamic block rules from settings.
- React popup, options page, blocked page, and phishing/scam warning page.
- Four modes: Kids, Family, Standard, and Custom.
- Local user-defined domain block list and optional local PIN verifier.

## Local development

1. Install Node.js 20 or later.
2. From this folder, run `npm install`.
3. Build the extension with `npm run build`. This creates `dist/`.
4. In Chrome, open `chrome://extensions`.
5. Enable **Developer mode** in the top-right corner.
6. Click **Load unpacked** and select the `D:\safely-platform\dist` folder.
7. Pin **safely-platform** from Chrome's extensions menu, then open its settings.

After code changes, rerun `npm run build` and click the extension's reload button on `chrome://extensions`.

## Important production note

The bundled rules intentionally use `.invalid` test domains only. Before a production release, replace `src/shared/rules.ts` with a signed, reviewed threat-intelligence ruleset and implement signature validation/version rollback protection as specified in `PRD.md`. Do not turn a remote, unsigned rules feed into executable code.

## Permissions

- `storage`: saves only local settings, optional PIN verifier, and guardian block-list entries.
- `declarativeNetRequest`: creates Chrome-enforced dynamic block rules without exposing requests to extension code.
- Optional HTTP/HTTPS host access: requested only if a guardian enables Safely-platform’s custom blocked and warning pages. Without it, Chrome’s standard block page is used.
- The extension does not inject a script into webpages or read webpage text, form fields, or history.
