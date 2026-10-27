export type BusinessStatus = 'funded' | 'exposed_not_funded' | 'unaffected';
export type BusinessRole = 'anchor_direct' | 'upstream_supplier' | 'downstream_buyer' | 'retail_leaf' | 'independent';

export interface ProtectedBusiness {
  business_id: string;
  name: string;
  hops: number;
  intensity: number;
}

export interface PathSegment {
  from: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    kind: 'anchor' | 'business';
  };
  to: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    kind: 'business';
  };
  relationship: 'DrawsFootfall' | 'Supplies';
  intensity?: number;
  worker_share?: number;
}

export interface BusinessDecision {
  business_id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  naics4: string;
  industry_name: string;
  status: BusinessStatus;
  amount: number;
  exposure: number; // 0.0 - 1.0
  hops_from_anchor: number;
  role: BusinessRole;
  protects: ProtectedBusiness[];
  paths: PathSegment[];
  evidence: {
    real: string[];
    modeled: string[];
  };
  tract: {
    tract_id?: string;
    poverty_rate: number;
    no_vehicle_rate: number;
  };
  justification: string;
}

export interface ScenarioMeta {
  block_id: string;
  block_name: string;
  jobs: number;
  budget: number;
  grant_effect: number;
  corridor: string;
}

export interface AnchorPoint {
  block_id: string;
  name: string;
  jobs: number;
  lat: number;
  lon: number;
}

export interface RunnerUp {
  business_id: string;
  name: string;
  amount_proposed: number;
  why_not: string;
}

export interface SensitivityReport {
  'top_pick_stable_at_0.5x': boolean;
  'top_pick_stable_at_2x': boolean;
  notes: string;
}

export interface EquityAudit {
  restaurant_share_funded: number;
  restaurant_share_corridor: number;
  high_poverty_tract_share_funded: number;
  high_poverty_tract_share_corridor: number;
}

export interface DecisionsResponse {
  scenario: ScenarioMeta;
  anchor: AnchorPoint;
  businesses: BusinessDecision[];
  runner_up: RunnerUp;
  sensitivity: SensitivityReport;
  equity_audit: EquityAudit;
  memo_markdown: string;
}
