"use client";
import { useState } from "react";
import { BadgeCheck, ExternalLink, Landmark, MapPin } from "lucide-react";
import { Districts, LookupResult, bigMoney } from "@/lib/api";

export function DistrictsCard({
  districts,
  note,
}: {
  districts: Districts | null;
  note: string | null;
}) {
  if (!districts)
    return (
      <section className="real-card">
        <h2>
          <MapPin size={20} /> Your districts
        </h2>
        <p className="small">{note}</p>
      </section>
    );
  const rows = [
    ["County", districts.county],
    ["City or village", districts.city],
    ["Township", districts.township],
    ["School district", districts.school_district],
    ["Ohio House", districts.ohio_house && `District ${districts.ohio_house}`],
    [
      "Ohio Senate",
      districts.ohio_senate && `District ${districts.ohio_senate}`,
    ],
    ["U.S. House", districts.us_house && `District ${districts.us_house}`],
  ].filter(([, v]) => v) as [string, string][];
  return (
    <section className="real-card">
      <div className="real-head">
        <h2>
          <MapPin size={20} /> Your districts
        </h2>
        <span className="real-badge">
          <BadgeCheck size={16} /> Real data
        </span>
      </div>
      <dl className="districts">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="fine">
        From the U.S. Census Bureau Geocoder, using Ohio’s 2026 legislative and
        congressional maps. Matched: {districts.matched_address}
      </p>
    </section>
  );
}

export function StatewideRaces({ real }: { real: LookupResult }) {
  const [showMoney, setShowMoney] = useState(false);
  return (
    <section className="real-card statewide">
      <div className="real-head">
        <h2>
          <Landmark size={20} /> Statewide races on every Ohio ballot
        </h2>
        <span className="real-badge">
          <BadgeCheck size={16} /> Real candidates
        </span>
      </div>
      <p className="small">
        Real certified candidates. Blind Ballot never guesses a real candidate’s
        positions, so these races can be matched once candidates answer in the
        candidate portal.
      </p>
      <div className="statewide-list">
        {real.statewide.map((race) => (
          <div key={race.id} className="sw-race">
            <div className="sw-office">
              <strong>{race.office}</strong>
              <span>{race.detail}</span>
            </div>
            <ul>
              {race.candidates.map((c) => (
                <li key={c.name}>
                  <span className="sw-name">
                    {c.name}
                    {c.running_mate && <small> and {c.running_mate}</small>}
                  </span>
                  <span className="chip small">{c.party}</span>
                  {showMoney && race.money_available != null && (
                    <span className="sw-money">
                      {c.money
                        ? `Raised ${bigMoney(c.money.receipts)}, spent ${bigMoney(c.money.disbursements)}`
                        : "No FEC filing found"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="sw-pending">No candidate has answered yet.</p>
            {race.money_available != null && (
              <div className="sw-money-row">
                <button
                  role="switch"
                  aria-checked={showMoney}
                  aria-label="Show campaign money"
                  className={showMoney ? "mini-toggle on" : "mini-toggle"}
                  onClick={() => setShowMoney(!showMoney)}
                >
                  <span className="toggle-track" aria-hidden>
                    <span className="toggle-knob" />
                  </span>
                  {showMoney ? "Hide campaign money" : "Show campaign money"}
                </button>
                {showMoney && (
                  <span className="fine">
                    {race.money_available
                      ? `FEC filings, as of ${(race.candidates.find((c) => c.money?.as_of)?.money?.as_of ?? "").slice(0, 10)}. `
                      : "FEC data isn’t available right now. "}
                    {race.money_source && (
                      <a
                        href={race.money_source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        See it on FEC.gov <ExternalLink size={12} />
                      </a>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="fine">
        Source:{" "}
        <a href={real.statewide_source.url} target="_blank" rel="noreferrer">
          Wood County Board of Elections certified list (Aug 26, 2026)
        </a>
        , cross-checked with{" "}
        <a
          href={real.statewide_source.cross_check}
          target="_blank"
          rel="noreferrer"
        >
          Hamilton County’s (Aug 21, 2026)
        </a>
        . Write-in candidates aren’t listed.
      </p>
    </section>
  );
}
