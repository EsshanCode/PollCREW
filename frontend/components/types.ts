export type Requirement = {
  role: string;
  desired: number;
  minimum: number;
  skills: string[];
  training: boolean;
};
export type Location = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  precincts: string[];
  arrival_per_hour: number;
  service_minutes: number;
  start: number;
  end: number;
  requirements: Requirement[];
};
export type Worker = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  confirmed_skills: string[];
  rejected_skills: string[];
  experience: string;
  trained: boolean;
  available_start: number;
  available_end: number;
  max_travel_km: number;
  cancelled: boolean;
};
export type Assignment = {
  worker_id: string;
  worker_name: string;
  location_id: string;
  role: string;
  score: number;
  travel_km: number;
  reason: string;
};
export type Simulation = {
  runs: number;
  seed: number;
  metric: string;
  risk_percent: number;
  analytic_risk_percent: number;
  locations: {
    id: string;
    name: string;
    check_in_workers: number;
    risk_percent: number;
    analytic_risk_percent: number;
    unstable_percent: number;
    zero_staff_percent: number;
    all_attend_expected_wait_minutes: number | null;
  }[];
};
export type Plan = {
  assignments: Assignment[];
  coverage: number;
  needed: number;
  surge_budget: number;
  surge_assigned: number;
  match_quality: number;
  preparation_ms: number;
  runtime_ms: number;
  status: string;
  approved: boolean;
  disrupted?: boolean;
  locked_count: number;
  minimums_met: boolean;
  simulation: Simulation;
  gaps: {
    location: string;
    role: string;
    unfilled: number;
    minimum_shortfall: number;
  }[];
};
export type CurvePoint = {
  budget: number;
  optimized_risk_percent: number;
  even_risk_percent: number;
  optimized_surge: number;
  even_surge: number;
};
export type Jurisdiction = {
  jurisdiction: {
    id: string;
    name: string;
    state: string;
    code: string;
    lat: number;
    lon: number;
  };
  locations: Location[];
  workers: Worker[];
  surge_budget: number;
  curve: CurvePoint[] | null;
  plan: Plan | null;
  baseline: Plan | null;
  before: Plan | null;
  impact: null | {
    cancelled_ids: string[];
    lost_assignments: number;
    preserved: number;
    before_risk: number;
    after_risk: number;
    recovered: number | null;
    baseline_affected?: number;
    baseline_recovered?: number;
    baseline_recovery_ms?: number;
  };
  revision: number;
  events: string[];
};
export type AppState = {
  jurisdictions: Jurisdiction[];
  skills: Record<string, string>;
  extraction_mode: string;
  matching_mode: string;
};
