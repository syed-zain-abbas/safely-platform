import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { CATEGORIES, enabledCategories, type Settings } from "../shared/types";
import { getSettings } from "../shared/storage";
import "../ui/styles.css";

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => { void getSettings().then(setSettings); }, []);
  if (!settings) return <main className="popup">Loading protection status…</main>;
  const active = CATEGORIES.filter((category) => enabledCategories(settings)[category]);
  return <main className="popup"><div className="brand"><span className="shield">✓</span>safely-platform</div><section className="card stack"><div className="row"><span className="label">Protection is on</span><span className="mode">{settings.mode}</span></div><p className="muted">Blocking {active.length} safety categories and {settings.blockedDomains.length} family rule{settings.blockedDomains.length === 1 ? "" : "s"}.</p><button className="button" onClick={() => chrome.runtime.openOptionsPage()}>Open settings</button></section></main>;
}
createRoot(document.getElementById("root")!).render(<App />);
