import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { CATEGORIES, MODE_CATEGORIES, type Category, type ProtectionMode, type Settings } from "../shared/types";
import { createPinVerifier, getSettings, saveSettings, verifyPin } from "../shared/storage";
import { normalizeDomain } from "../shared/rules";
import "../ui/styles.css";

const modes: { id: ProtectionMode; description: string }[] = [
  { id: "kids", description: "Strong protection for younger children." },
  { id: "family", description: "Protection for a shared household." },
  { id: "standard", description: "Blocks scams and dangerous sites." },
  { id: "custom", description: "Choose each category yourself." }
];

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [domain, setDomain] = useState("");
  const [newPin, setNewPin] = useState("");
  const [warningPagesEnabled, setWarningPagesEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    void getSettings().then(setSettings);
    void chrome.permissions.contains({ origins: ["http://*/*", "https://*/*"] }).then(setWarningPagesEnabled);
  }, []);
  if (!settings) return <main className="shell">Loading settings…</main>;
  const commit = async (next: Settings) => {
    if (settings.pin) {
      const entered = window.prompt("Enter guardian PIN to save these changes:");
      if (!entered || !(await verifyPin(entered, settings.pin))) { setError("The guardian PIN was not accepted. No changes were saved."); return; }
    }
    await saveSettings(next); setSettings(next); setError(""); setMessage("Settings saved locally.");
  };
  const addDomain = async () => {
    const normalized = normalizeDomain(domain);
    if (!normalized) { setError("Enter a valid domain such as example.com. Public suffixes are not allowed."); return; }
    if (settings.blockedDomains.includes(normalized)) { setError("That domain is already blocked."); return; }
    await commit({ ...settings, blockedDomains: [...settings.blockedDomains, normalized] }); setDomain("");
  };
  const setPin = async () => {
    if (!/^\d{4,12}$/.test(newPin)) { setError("Use a PIN with 4 to 12 digits."); return; }
    const next = { ...settings, pin: await createPinVerifier(newPin) };
    await saveSettings(next); setSettings(next); setNewPin(""); setError(""); setMessage("Guardian PIN enabled.");
  };
  const enableWarningPages = async () => {
    const granted = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
    if (granted) { setWarningPagesEnabled(true); setMessage("Custom safety warning pages are enabled."); setError(""); }
    else setError("Website access was not granted. Safely-platform will still block matching sites with Chrome’s standard block page.");
  };
  return <main className="shell"><div className="brand"><span className="shield">✓</span>safely-platform</div><p className="muted">Protection stays on this Chrome profile. We do not upload your browsing history.</p>{message && <p className="notice">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
    <section className="card"><h2>Protection mode</h2><div className="mode-grid">{modes.map((mode) => <button key={mode.id} className={`mode-button ${settings.mode === mode.id ? "active" : ""}`} onClick={() => void commit({ ...settings, mode: mode.id })}><strong>{mode.id[0].toUpperCase() + mode.id.slice(1)}</strong><br /><span className="muted">{mode.description}</span></button>)}</div>{settings.mode === "custom" && <div className="stack" style={{ marginTop: 16 }}>{CATEGORIES.map((category) => <label className="toggle" key={category}><span>{category[0].toUpperCase() + category.slice(1)}</span><input type="checkbox" checked={settings.customCategories[category]} onChange={(event) => void commit({ ...settings, customCategories: { ...settings.customCategories, [category]: event.target.checked } })} /></label>)}</div>}{settings.mode !== "custom" && <p className="muted">Enabled: {CATEGORIES.filter((c) => MODE_CATEGORIES[settings.mode as Exclude<ProtectionMode, "custom">][c]).join(", ")}.</p>}</section>
    <section className="card"><h2>Blocked sites</h2><p className="muted">Adding a domain blocks it and all of its subdomains.</p><div className="row"><div className="field" style={{ flex: 1 }}><label htmlFor="domain">Domain</label><input id="domain" value={domain} placeholder="example.com" onChange={(event) => setDomain(event.target.value)} /></div><button className="button" onClick={() => void addDomain()}>Add</button></div><ul className="domain-list">{settings.blockedDomains.map((item) => <li key={item}><span>{item}</span><button className="button secondary" onClick={() => void commit({ ...settings, blockedDomains: settings.blockedDomains.filter((domainName) => domainName !== item) })}>Remove</button></li>)}</ul></section>
    <section className="card"><h2>Guardian PIN</h2>{settings.pin ? <><p className="notice">PIN protection is enabled for settings changes.</p><button className="button secondary" onClick={() => void commit({ ...settings, pin: null })}>Disable PIN</button></> : <><p className="muted">Without a PIN, anyone using this Chrome profile can change settings.</p><div className="row"><div className="field" style={{ flex: 1 }}><label htmlFor="pin">New 4–12 digit PIN</label><input id="pin" inputMode="numeric" type="password" value={newPin} onChange={(event) => setNewPin(event.target.value)} /></div><button className="button" onClick={() => void setPin()}>Enable</button></div></>}</section>
    <section className="card"><h2>Safety warning pages</h2>{warningPagesEnabled ? <p className="notice">Custom blocked and warning pages are enabled.</p> : <><p className="muted">By default, Chrome blocks matching sites directly. Enable this only if you want Safely-platform’s own blocked and warning pages.</p><button className="button" onClick={() => void enableWarningPages()}>Enable warning pages</button></>}</section>
    <section className="card"><h2>Privacy</h2><label className="toggle"><span>Share anonymous product metrics</span><input type="checkbox" checked={settings.analyticsEnabled} onChange={(event) => void commit({ ...settings, analyticsEnabled: event.target.checked })} /></label><p className="muted">Off by default. No URLs, page contents, searches, or browsing history are collected. Page-content analysis is not enabled.</p></section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<App />);
