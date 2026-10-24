"use client";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { AppState, Lookup } from "./types";

const DEFAULT_ADDRESSES = [
  "1739 N High St, Columbus, OH 43210",
  "1858 Neil Ave, Columbus, OH 43210",
  "411 Woody Hayes Dr, Columbus, OH 43210",
  "96 S Grant Ave, Columbus, OH 43215",
  "90 W Broad St, Columbus, OH 43215",
  "1777 E Broad St, Columbus, OH 43203",
].join("\n");

export default function ImportPanel({
  configured,
  request,
  onImported,
}: {
  configured: boolean;
  request: (path: string, method?: string, body?: unknown) => Promise<unknown>;
  onImported: (data: AppState, jurisdictionId: string) => void;
}) {
  const [addresses, setAddresses] = useState(DEFAULT_ADDRESSES);
  const [name, setName] = useState("Franklin County");
  const [state, setState] = useState("Ohio");
  const [code, setCode] = useState("OH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lookups, setLookups] = useState<Lookup[]>([]);
  async function run() {
    setBusy(true);
    setError("");
    setLookups([]);
    try {
      const result = (await request("/polling-places/import", "POST", {
        addresses: addresses.split("\n"),
        name,
        state,
        code,
      })) as AppState & {
        import: { jurisdiction_id: string; lookups: Lookup[] };
      };
      setLookups(result.import.lookups);
      onImported(result, result.import.jurisdiction_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel import-panel">
      <div className="section-heading">
        <div>
          <h2>Use real polling places</h2>
          <p>
            Look up the official Election Day polling place for each address
            through the Google Civic Information API (Voting Information
            Project). Workers stay synthetic.
          </p>
        </div>
        <span className={configured ? "pill live-pill" : "pill"}>
          {configured ? "API key set" : "API key needed"}
        </span>
      </div>
      {!configured && (
        <p className="small">
          Start the backend with <code>GOOGLE_CIVIC_API_KEY=your-key</code> to
          enable lookups. Keys are free in the Google Cloud console.
        </p>
      )}
      <div className="import-grid">
        <label className="import-addresses">
          Addresses, one per line
          <textarea
            rows={6}
            value={addresses}
            onChange={(e) => setAddresses(e.target.value)}
          />
        </label>
        <div className="import-fields">
          <label>
            County name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            State
            <input value={state} onChange={(e) => setState(e.target.value)} />
          </label>
          <label>
            State code
            <input
              value={code}
              maxLength={2}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <button disabled={busy || !configured} onClick={run}>
            <MapPin size={16} />
            {busy ? "Looking up…" : "Find polling places"}
          </button>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {lookups.length > 0 && (
        <ul className="lookup-list" aria-live="polite">
          {lookups.map((l) => (
            <li key={l.address} className={`lookup-${l.status}`}>
              <strong>{l.address}</strong>
              <span>
                {l.status === "found"
                  ? `Found ${l.found} polling place${l.found === 1 ? "" : "s"}${l.election ? ` · ${l.election}` : ""}`
                  : l.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
