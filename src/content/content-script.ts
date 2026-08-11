import { extractPageSafetySignals } from "./page-signal-extractor";
// Values, cookies, storage, messages, and raw HTML are intentionally never read.
const send = () => chrome.runtime.sendMessage({ type: "PAGE_SIGNALS", signals: extractPageSafetySignals() }, (decision?: { action?: string }) => {
  if (chrome.runtime.lastError || !decision) return;
  if (decision.action === "BLOCK") location.replace(chrome.runtime.getURL("blocked.html"));
  if (decision.action === "WARN") location.replace(chrome.runtime.getURL("warning.html"));
});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => queueMicrotask(send), { once: true }); else queueMicrotask(send);
