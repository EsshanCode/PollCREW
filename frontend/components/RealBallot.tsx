"use client";
import { useState } from "react";
import { ChevronDown, ExternalLink, MapPin } from "lucide-react";
import { Districts, LocalRace, LookupResult, bigMoney } from "@/lib/api";

const SHORT: Record<string, string> = {
  Democratic: "D",
  Republican: "R",
  Libertarian: "L",
  Independent: "I",
  Nonparty: "no party",
  "Other party": "other",
};
const short = (party: string | null) =>
  party ? (SHORT[party] ?? party) : null;

export function DistrictsCard({
  districts,
  note,
}: {
  districts: Districts | null;
  note: string | null;
}) {
  if (!districts)
    return (
      <p className="districts-line">
        <MapPin size={16} /> {note}
      </p>
    );
  const chips = [
    districts.county,
    districts.city || districts.township,
    districts.school_district,
    districts.ohio_house && `Ohio House ${districts.ohio_house}`,
    districts.ohio_senate && `Ohio Senate ${districts.ohio_senate}`,
    districts.us_house && `U.S. House ${districts.us_house}`,
  ].filter(Boolean) as string[];
  return (
    <div className="districts-line" aria-label="Your districts">
      <MapPin size={16} />
      {chips.map((c) => (
        <span key={c} className="d-chip">
          {c}
        </span>
      ))}
    </div>
  );
}

function raceTitle(r: LocalRace) {
  if (["house", "senate", "congress", "appeals"].includes(r.kind) && r.district)
    return `${r.office} ${r.district}`;
  return r.office;
}

function Section({
  title,
  count,
  open,
  children,
}: {
  title: string;
  count: string;
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="race-section" open={open}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{count}</small>
        </span>
        <ChevronDown size={20} className="chev" aria-hidden />
      </summary>
      <div className="race-section-body">{children}</div>
    </details>
  );
}

export function LocalRaces({
  real,
  open = false,
}: {
  real: LookupResult;
  open?: boolean;
}) {
  const local = real.local;
  if (!local.found)
    return (
      <section className="race-section empty">
        <strong>Real local candidates</strong>
        <p className="small">
          {local.county} County hasn’t posted its November list online yet.{" "}
          <a href={real.links.county_boards} target="_blank" rel="noreferrer">
            Find your county board <ExternalLink size={12} />
          </a>
        </p>
      </section>
    );
  return (
    <Section
      title={`Real candidates in ${local.county} County`}
      count={`${local.races.length} races`}
      open={open}
    >
      <ul className="race-rows">
        {local.races.map((race, i) => (
          <li key={`${race.office}-${race.district}-${i}`}>
            <strong>{raceTitle(race)}</strong>
            <span>
              {race.candidates.map((c, j) => (
                <span key={c.name} className="cand-inline">
                  {j > 0 && " · "}
                  {c.name}
                  {short(c.party) && <em> ({short(c.party)})</em>}
                </span>
              ))}
              {race.candidates.length === 1 && (
                <em className="unopposed"> unopposed</em>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="fine">
        {local.narrowed
          ? "Narrowed to your districts. "
          : "Every race in the county. Add your street to narrow it. "}
        From the{" "}
        <a href={local.source_url} target="_blank" rel="noreferrer">
          county board’s list
        </a>
        . Write-ins not shown.
      </p>
    </Section>
  );
}

export function StatewideRaces({ real }: { real: LookupResult }) {
  const [showMoney, setShowMoney] = useState(false);
  return (
    <Section
      title="Statewide races"
      count={`${real.statewide.length} races, on every Ohio ballot`}
      open={false}
    >
      <ul className="race-rows">
        {real.statewide.map((race) => (
          <li key={race.id}>
            <strong>{race.office}</strong>
            <span>
              {race.candidates.map((c, j) => (
                <span key={c.name} className="cand-inline">
                  {j > 0 && " · "}
                  {c.name}
                  {c.running_mate && ` and ${c.running_mate}`}
                  <em> ({short(c.party)})</em>
                  {showMoney && race.money_available && (
                    <em className="money-inline">
                      {" "}
                      {c.money
                        ? `raised ${bigMoney(c.money.receipts)}`
                        : "no FEC filing"}
                    </em>
                  )}
                </span>
              ))}
            </span>
            {race.money_available != null && (
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
                {showMoney ? "Hide money" : "Show money"}
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="fine">
        From the{" "}
        <a href={real.statewide_source.url} target="_blank" rel="noreferrer">
          certified state list
        </a>
        .{" "}
        {showMoney && (
          <>
            Money from{" "}
            <a
              href={
                real.statewide.find((r) => r.money_source)?.money_source ??
                "https://www.fec.gov"
              }
              target="_blank"
              rel="noreferrer"
            >
              FEC filings
            </a>
            .
          </>
        )}
      </p>
    </Section>
  );
}
