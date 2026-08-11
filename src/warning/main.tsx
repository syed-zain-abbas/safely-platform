import { createRoot } from "react-dom/client";
import "../ui/styles.css";
function App() { return <main className="shell center warning"><div className="brand" style={{ justifyContent: "center" }}><span className="shield">!</span>safely-platform</div><section className="card stack"><h1>Potentially dangerous site</h1><p className="muted">This destination may be deceptive or unsafe. We stopped it before the page opened.</p><div className="row" style={{ justifyContent: "center" }}><button className="button secondary" onClick={() => history.back()}>Go back</button><button className="button" onClick={() => chrome.runtime.openOptionsPage()}>Ask a guardian</button></div></section></main>; }
createRoot(document.getElementById("root")!).render(<App />);
