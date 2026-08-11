import type { StatusMessage } from "../shared/types";

// This intentionally does not inspect page text, inputs, or browsing history.
// Blocking is performed by declarativeNetRequest before the page is usable.
chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response: StatusMessage | undefined) => {
  if (chrome.runtime.lastError || !response) return;
  document.documentElement.dataset.safelyPlatform = "protected";
});
