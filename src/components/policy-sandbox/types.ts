// Digital Policy Sandbox - TypeScript Types

export interface Policy {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category: string;
  status: string;
  currentVersion: PolicyVersion | null;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  parameters: PolicyParameters;
  changeLog: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface PolicyParameters {
  fineAmount?: number;
  permitDuration?: number;
  inspectionFrequency?: number;
  taxRate?: number;
  feeAmount?: number;
  penaltyRate?: number;
  gracePeriod?: number;
  renewalPeriod?: number;
  [key: string]: number | string | boolean | undefined;
}

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  status: string;
  isBaseline: boolean;
  parentScenarioId: string | null;
  policies: ScenarioPolicy[];
  parentScenario?: { id: string; name: string } | null;
  childScenarios: { id: string; name: string; status: string }[];
  simulations?: Simulation[];
  _count?: { simulations: number };
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioPolicy {
  id: string;
  scenarioId: string;
  policyId: string;
  policyVersionId: string;
  parameterOverrides: PolicyParameters | null;
  policy: Policy;
  policyVersion: PolicyVersion;
}

export interface CitizenGroup {
  id: string;
  name: string;
  description: string | null;
  population: number;
  demographics: Record<string, number | string>;
  behaviorRules: Record<string, number> | null;
  complianceRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  description: string | null;
  count: number;
  industry: string | null;
  sizeCategory: string | null;
  behaviorRules: Record<string, number> | null;
  complianceRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface Simulation {
  id: string;
  scenarioId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  error: string | null;
  config: SimulationConfig | null;
  scenario?: { id: string; name: string; isBaseline: boolean };
  metrics?: SimulationMetric[];
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface SimulationConfig {
  timeHorizon: number;
  includeSeasonality: boolean;
  populationGrowth: number;
  economicGrowth: number;
}

export interface SimulationMetric {
  id: string;
  simulationId: string;
  name: string;
  displayName: string;
  value: number;
  unit: string | null;
  category: string | null;
  changeFromBaseline: number | null;
  changePercent: number | null;
  isPositive: boolean;
}

export interface SimulationResult {
  id: string;
  simulationId: string;
  scenarioId: string;
  metricName: string;
  metricValue: number;
  metricUnit: string | null;
  period: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface Comparison {
  id: string;
  name: string;
  description: string | null;
  baselineScenarioId: string;
  baselineScenario: Scenario;
  comparedScenarios: {
    id: string;
    scenarioId: string;
    order: number;
    scenario: Scenario;
  }[];
  createdAt: string;
}

export interface ComparisonResult {
  comparison: Comparison;
  baselineMetrics: SimulationMetric[];
  scenarios: {
    id: string;
    name: string;
    metrics: SimulationMetric[];
    delta: MetricDelta[];
  }[];
}

export interface MetricDelta {
  name: string;
  displayName: string;
  baseline: number;
  scenario: number;
  delta: number;
  percentChange: number;
  unit: string | null;
  isPositive: boolean;
}

export interface MonthlyProjection {
  month: number;
  revenue: number;
  compliance: number;
  workload: number;
  satisfaction: number;
}
