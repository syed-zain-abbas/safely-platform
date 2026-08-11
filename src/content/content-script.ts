import { extractPageSafetySignals } from "./page-signal-extractor";
// Values, cookies, storage, messages, and raw HTML are intentionally never read.
const send = () => chrome.runtime.sendMessage({ type: "PAGE_SIGNALS", signals: extractPageSafetySignals() });
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => queueMicrotask(send), { once: true }); else queueMicrotask(send);
