"use client";
import { useState } from "react";
import { BadgeCheck, ExternalLink, Landmark, MapPin, Vote } from "lucide-react";
import { Districts, LocalRace, LookupResult, bigMoney } from "@/lib/api";

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

const PARTY_SHORT: Record<string, string> = {
  Democratic: "Dem",
  Republican: "Rep",
  Libertarian: "Lib",
  Independent: "Ind",
  Nonparty: "No party",
};

function raceTitle(r: LocalRace) {
  if (["house", "senate", "congress", "appeals"].includes(r.kind) && r.district)
    return `${r.office}, District ${r.district}`;
  return r.office;
}

export function LocalRaces({
  real,
  title,
}: {
  real: LookupResult;
  title: string;
}) {
  const local = real.local;
  if (!local.found)
    return (
      <section className="real-card">
        <h2>
          <Vote size={20} /> {title}
        </h2>
        <p className="small">
          {local.county} County hasn’t posted its November candidate list online
          yet, so we can’t show it. Your county board of elections has it.
        </p>
        <a
          className="secondary as-button"
          href={real.links.county_boards}
          target="_blank"
          rel="noreferrer"
        >
          Find your county board <ExternalLink size={16} />
        </a>
      </section>
    );
  return (
    <section className="real-card statewide">
      <div className="real-head">
        <h2>
          <Vote size={20} /> {title}
        </h2>
        <span className="real-badge">
          <BadgeCheck size={16} /> Real candidates
        </span>
      </div>
      <p className="small">
        {local.narrowed
          ? `${local.races.length} local races for your address.`
          : `All ${local.races.length} local races in ${local.county} County. Add your street address to see only your districts.`}{" "}
        No candidate has answered yet.
      </p>
      <div className="statewide-list">
        {local.races.map((race, i) => (
          <div key={`${race.office}-${race.district}-${i}`} className="sw-race">
            <div className="sw-office">
              <strong>{raceTitle(race)}</strong>
              {race.kind === "part" && <span>Only some voters</span>}
            </div>
            <ul>
              {race.candidates.map((c) => (
                <li key={c.name}>
                  <span className="sw-name">{c.name}</span>
                  {c.party && (
                    <span className="chip small">
                      {PARTY_SHORT[c.party] ?? c.party}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {race.candidates.length === 1 && (
              <p className="sw-pending">Unopposed</p>
            )}
          </div>
        ))}
      </div>
      <p className="fine">
        Source:{" "}
        <a href={local.source_url} target="_blank" rel="noreferrer">
          {local.county} County Board of Elections
        </a>
        {local.as_of ? ` (${local.as_of})` : ""}. Parties as printed there.
        Write-in candidates aren’t listed.
      </p>
    </section>
  );
}
