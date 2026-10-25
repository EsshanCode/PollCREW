export type Issue = { id: string; topic: string; short: string; text: string };
export type RaceInfo = {
  id: string;
  office: string;
  what: string;
  vote_for: number;
  partisan: boolean;
  issues: string[];
  candidates: number;
  self_reported: number;
};
export type County = {
  id: string;
  name: string;
  place: string;
  sample_address: string;
  races: RaceInfo[];
  measures: { id: string; title: string; what: string }[];
};
export type State = {
  session_id: string;
  issues: Issue[];
  parties: string[];
  counties: County[];
};
export type Why = {
  issue: string;
  short: string;
  kind: "agree" | "partly" | "disagree" | "skipped";
  agreement?: number;
  weight?: number;
  voter?: number;
  candidate?: number;
  reason?: string;
};
export type RaceResult = {
  race_id: string;
  office: string;
  what: string;
  vote_for: number;
  partisan: boolean;
  issues_used: number;
  results: {
    candidate_id: string;
    letter: string;
    match: number | null;
    chance: number | null;
    why: Why[];
  }[];
  best: string[];
  close_call: boolean;
  reveal: Record<
    string,
    {
      name: string;
      party: string;
      spending: number;
      endorsements: string[];
      source: string;
    }
  >;
  top_spender: string;
  top_spender_is_best: boolean;
};
export type MatchResult = {
  county: string;
  races: RaceResult[];
  measures: {
    id: string;
    title: string;
    what: string;
    lean: "yes" | "no" | "mixed" | "unknown";
    score: number | null;
  }[];
  summary: {
    races: number;
    matched: number;
    best_not_top_spender: number;
    crossed_party: number;
    usual_party: string | null;
  };
};

const KEY = "blindballot-session";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function api<T>(
  path: string,
  sid: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Demo-Session": sid },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = json.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? "Some answers look off. Check the form and try again."
          : "Something went wrong. Try again.",
    );
  }
  return json as T;
}

// Reuses this tab's demo session, or starts one. Retries while a sleeping server wakes up.
export async function loadState(onWaiting?: () => void): Promise<State> {
  for (let attempt = 0; ; attempt++) {
    try {
      let stored = "";
      try {
        stored = sessionStorage.getItem(KEY) ?? "";
      } catch {}
      if (stored) {
        const r = await fetch("/api/state", {
          headers: { "X-Demo-Session": stored },
        });
        if (r.ok) return r.json();
      }
      const r = await fetch("/api/sessions", { method: "POST" });
      if (!r.ok) throw new Error();
      const state: State = await r.json();
      try {
        sessionStorage.setItem(KEY, state.session_id);
      } catch {}
      return state;
    } catch {
      if (attempt === 1) onWaiting?.();
      await wait(2500);
    }
  }
}

export const money = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K` : `$${n}`;

export type Districts = {
  matched_address: string | null;
  county: string;
  county_fips: string;
  city: string | null;
  township: string | null;
  school_district: string | null;
  ohio_senate: string | null;
  ohio_house: string | null;
  us_house: string | null;
  source: string;
};
export type StatewideRace = {
  id: string;
  office: string;
  detail: string;
  candidates: {
    name: string;
    party: string;
    running_mate: string | null;
    money?: {
      receipts: number | null;
      disbursements: number | null;
      cash_on_hand: number | null;
      as_of: string | null;
    } | null;
  }[];
  money_source: string | null;
  money_available: boolean | null;
};
export type LookupResult = {
  county: string | null;
  districts: Districts | null;
  districts_note: string | null;
  statewide: StatewideRace[];
  statewide_source: { name: string; url: string; cross_check: string };
  links: { voter_lookup: string; county_boards: string };
};

export const bigMoney = (n: number | null | undefined) =>
  n == null
    ? "–"
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
        ? `$${Math.round(n / 1000)}K`
        : `$${Math.round(n)}`;
