// Digital Policy Sandbox - Simulation Runner
// Direct execution without background service dependency

import { db } from '@/lib/db';

interface PolicyParameters {
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

interface SimulationConfig {
  timeHorizon: number;
  includeSeasonality: boolean;
  populationGrowth: number;
  economicGrowth: number;
}

interface SimulationMetrics {
  revenue: {
    total: number;
    fromFines: number;
    fromPermits: number;
    fromTaxes: number;
    fromFees: number;
    breakdown: Record<string, number>;
  };
  compliance: {
    overall: number;
    citizen: number;
    business: number;
    byCategory: Record<string, number>;
  };
  workload: {
    totalHours: number;
    inspections: number;
    permits: number;
    appeals: number;
    staffRequired: number;
  };
  satisfaction: {
    overall: number;
    citizen: number;
    business: number;
    byDemographic: Record<string, number>;
  };
  monthlyProjections: Array<{
    month: number;
    revenue: number;
    compliance: number;
    workload: number;
    satisfaction: number;
  }>;
}

class SimulationEngine {
  private config: SimulationConfig;
  private policies: Array<{ parameters: PolicyParameters; overrides?: PolicyParameters }> = [];
  private citizenGroups: Array<{ population: number; complianceRate: number; demographics: Record<string, number>; behaviorRules: Record<string, number> | null }> = [];
  private businessCategories: Array<{ count: number; complianceRate: number; sizeCategory: string | null; behaviorRules: Record<string, number> | null }> = [];

  constructor(config: SimulationConfig) {
    this.config = config;
  }

  addPolicy(parameters: PolicyParameters, overrides?: PolicyParameters) {
    this.policies.push({ parameters, overrides });
  }

  addCitizenGroup(data: { population: number; complianceRate: number; demographics: Record<string, number>; behaviorRules: Record<string, number> | null }) {
    this.citizenGroups.push(data);
  }

  addBusinessCategory(data: { count: number; complianceRate: number; sizeCategory: string | null; behaviorRules: Record<string, number> | null }) {
    this.businessCategories.push(data);
  }

  run(): SimulationMetrics {
    const results = this.initializeResults();

    // Step 1: Calculate revenue
    this.calculateRevenue(results);

    // Step 2: Calculate compliance
    this.calculateCompliance(results);

    // Step 3: Calculate workload
    this.calculateWorkload(results);

    // Step 4: Calculate satisfaction
    this.calculateSatisfaction(results);

    // Step 5: Generate projections
    this.generateMonthlyProjections(results);

    return results;
  }

  private initializeResults(): SimulationMetrics {
    return {
      revenue: { total: 0, fromFines: 0, fromPermits: 0, fromTaxes: 0, fromFees: 0, breakdown: {} },
      compliance: { overall: 0, citizen: 0, business: 0, byCategory: {} },
      workload: { totalHours: 0, inspections: 0, permits: 0, appeals: 0, staffRequired: 0 },
      satisfaction: { overall: 0, citizen: 0, business: 0, byDemographic: {} },
      monthlyProjections: [],
    };
  }

  private aggregateParameters(): PolicyParameters {
    const aggregated: PolicyParameters = {};
    
    for (const { parameters, overrides } of this.policies) {
      for (const [key, value] of Object.entries(parameters)) {
        if (typeof value === 'number' && aggregated[key] !== undefined) {
          aggregated[key] = ((aggregated[key] as number) + value) / 2;
        } else {
          aggregated[key] = value;
        }
      }
      if (overrides) {
        for (const [key, value] of Object.entries(overrides)) {
          aggregated[key] = value;
        }
      }
    }
    return aggregated;
  }

  private calculateRevenue(results: SimulationMetrics): void {
    const params = this.aggregateParameters();
    let totalFines = 0, totalPermits = 0, totalTaxes = 0;

    for (const group of this.citizenGroups) {
      const population = group.population;
      const nonCompliant = population * (1 - group.complianceRate);
      const detectionRate = 0.3 + Math.min(0.4, (params.inspectionFrequency || 0) / 25);
      totalFines += nonCompliant * detectionRate * (params.fineAmount || 0);
      
      const permitEligible = population * ((group.demographics as Record<string, number>).permitEligibility || 0.3);
      totalPermits += permitEligible * (params.feeAmount || 0);
      
      const avgIncome = (group.demographics as Record<string, number>).averageIncome || 30000;
      totalTaxes += population * avgIncome * ((params.taxRate || 0) / 100) * this.config.timeHorizon / 12;
    }

    for (const business of this.businessCategories) {
      const count = business.count;
      const nonCompliant = count * (1 - business.complianceRate);
      const detectionRate = 0.3 + Math.min(0.4, (params.inspectionFrequency || 0) / 25);
      const multiplier = business.sizeCategory === 'large' ? 5 : business.sizeCategory === 'medium' ? 2 : 1;
      totalFines += nonCompliant * detectionRate * (params.fineAmount || 0) * multiplier;
      totalPermits += count * (params.feeAmount || 0) * multiplier;
    }

    const growthFactor = 1 + (this.config.economicGrowth / 100) * (this.config.timeHorizon / 12);
    
    results.revenue = {
      total: (totalFines + totalPermits + totalTaxes) * growthFactor,
      fromFines: totalFines * growthFactor,
      fromPermits: totalPermits * growthFactor,
      fromTaxes: totalTaxes * growthFactor,
      fromFees: 0,
      breakdown: { citizenFines: totalFines * 0.3 * growthFactor, businessFines: totalFines * 0.7 * growthFactor },
    };
  }

  private calculateCompliance(results: SimulationMetrics): void {
    const params = this.aggregateParameters();
    let totalCitizenCompliance = 0, totalCitizenPop = 0;
    let totalBusinessCompliance = 0, totalBusinessCount = 0;

    for (const group of this.citizenGroups) {
      const fineImpact = Math.min(0.1, (params.fineAmount || 0) / 10000);
      const inspectionImpact = Math.min(0.05, (params.inspectionFrequency || 0) / 20);
      const permitImpact = -Math.min(0.02, ((params.permitDuration || 365) - 365) / 3650);
      const adjusted = Math.min(1, Math.max(0, group.complianceRate + fineImpact + inspectionImpact + permitImpact));
      totalCitizenCompliance += adjusted * group.population;
      totalCitizenPop += group.population;
    }

    for (const business of this.businessCategories) {
      const fineImpact = Math.min(0.15, (params.fineAmount || 0) / 5000);
      const inspectionImpact = Math.min(0.08, (params.inspectionFrequency || 0) / 12);
      const adjusted = Math.min(1, Math.max(0, business.complianceRate + fineImpact + inspectionImpact));
      totalBusinessCompliance += adjusted * business.count;
      totalBusinessCount += business.count;
    }

    const citizenCompliance = totalCitizenPop > 0 ? totalCitizenCompliance / totalCitizenPop : 0;
    const businessCompliance = totalBusinessCount > 0 ? totalBusinessCompliance / totalBusinessCount : 0;

    results.compliance = {
      overall: (citizenCompliance + businessCompliance) / 2,
      citizen: citizenCompliance,
      business: businessCompliance,
      byCategory: {},
    };
  }

  private calculateWorkload(results: SimulationMetrics): void {
    const params = this.aggregateParameters();
    let inspections = 0, permits = 0, appeals = 0;

    for (const group of this.citizenGroups) {
      inspections += group.population * ((params.inspectionFrequency || 0) / 12) * this.config.timeHorizon;
    }

    for (const business of this.businessCategories) {
      inspections += business.count * ((params.inspectionFrequency || 0) / 12) * this.config.timeHorizon * 2;
    }

    const totalPop = this.citizenGroups.reduce((s, g) => s + g.population, 0);
    const totalBiz = this.businessCategories.reduce((s, b) => s + b.count, 0);
    permits = (totalPop * 0.1 + totalBiz) * (12 / ((params.permitDuration || 365) / 30)) * (this.config.timeHorizon / 12);

    const nonCompliantRate = 1 - results.compliance.overall;
    appeals = (totalPop + totalBiz) * nonCompliantRate * 0.1 * ((params.fineAmount || 0) / 500);

    const totalHours = inspections * 2 + permits * 0.5 + appeals * 4;
    const staffRequired = Math.ceil(totalHours / (160 * (this.config.timeHorizon / 12)));

    results.workload = { totalHours, inspections: Math.round(inspections), permits: Math.round(permits), appeals: Math.round(appeals), staffRequired };
  }

  private calculateSatisfaction(results: SimulationMetrics): void {
    const params = this.aggregateParameters();
    const base = 70;
    const fineImpact = -Math.min(20, (params.fineAmount || 0) / 50);
    const permitImpact = Math.min(10, ((params.permitDuration || 365) - 180) / 50);
    const taxImpact = -Math.min(15, (params.taxRate || 0) / 2);
    const graceImpact = Math.min(5, (params.gracePeriod || 0) / 10);

    let totalCitizenSat = 0, totalCitizenPop = 0;
    let totalBusinessSat = 0, totalBusinessCount = 0;

    for (const group of this.citizenGroups) {
      const sat = Math.min(100, Math.max(0, base + fineImpact + permitImpact + taxImpact + graceImpact));
      totalCitizenSat += sat * group.population;
      totalCitizenPop += group.population;
    }

    for (const business of this.businessCategories) {
      const sat = Math.min(100, Math.max(0, base + fineImpact * 0.5 + permitImpact * 1.5 + taxImpact * 1.2));
      totalBusinessSat += sat * business.count;
      totalBusinessCount += business.count;
    }

    const citizenSat = totalCitizenPop > 0 ? totalCitizenSat / totalCitizenPop : base;
    const businessSat = totalBusinessCount > 0 ? totalBusinessSat / totalBusinessCount : base;

    results.satisfaction = {
      overall: (citizenSat + businessSat) / 2,
      citizen: citizenSat,
      business: businessSat,
      byDemographic: {},
    };
  }

  private generateMonthlyProjections(results: SimulationMetrics): void {
    const months = this.config.timeHorizon;
    const seasonality = [0.85, 0.88, 0.95, 1.02, 1.08, 1.15, 1.12, 1.10, 1.02, 0.95, 0.88, 1.00];

    for (let month = 1; month <= months; month++) {
      const seasonFactor = this.config.includeSeasonality ? seasonality[month - 1] : 1;
      const growthFactor = 1 + (this.config.economicGrowth / 100) * (month / 12);

      results.monthlyProjections.push({
        month,
        revenue: (results.revenue.total / months) * seasonFactor * growthFactor,
        compliance: results.compliance.overall * (1 + (Math.random() * 0.02 - 0.01)),
        workload: (results.workload.totalHours / months) * seasonFactor,
        satisfaction: results.satisfaction.overall * (1 + (Math.random() * 0.02 - 0.01)),
      });
    }
  }
}

// Main function to run simulation and save results
export async function runSimulation(
  scenarioId: string,
  config: SimulationConfig
): Promise<{ simulationId: string; metrics: SimulationMetrics }> {
  // Get scenario with policies
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    include: {
      policies: {
        include: {
          policyVersion: true,
        },
      },
    },
  });

  if (!scenario) {
    throw new Error('Scenario not found');
  }

  // Get population data
  const citizenGroups = await db.citizenGroup.findMany({
    where: { tenantId: scenario.tenantId },
  });

  const businessCategories = await db.businessCategory.findMany({
    where: { tenantId: scenario.tenantId },
  });

  // Initialize engine
  const engine = new SimulationEngine(config);

  // Add policies
  for (const sp of scenario.policies) {
    const params = sp.policyVersion.parameters as PolicyParameters;
    const overrides = sp.parameterOverrides as PolicyParameters | null;
    engine.addPolicy(params, overrides || undefined);
  }

  // Add population data
  for (const group of citizenGroups) {
    engine.addCitizenGroup({
      population: group.population,
      complianceRate: group.complianceRate,
      demographics: group.demographics as Record<string, number>,
      behaviorRules: group.behaviorRules as Record<string, number> | null,
    });
  }

  for (const business of businessCategories) {
    engine.addBusinessCategory({
      count: business.count,
      complianceRate: business.complianceRate,
      sizeCategory: business.sizeCategory,
      behaviorRules: business.behaviorRules as Record<string, number> | null,
    });
  }

  // Run simulation
  const results = engine.run();

  // Create simulation record
  let user = await db.user.findFirst({ where: { tenantId: scenario.tenantId } });
  if (!user) {
    user = await db.user.create({
      data: { email: 'system@demo.local', name: 'System', tenantId: scenario.tenantId },
    });
  }

  const simulation = await db.simulation.create({
    data: {
      scenarioId,
      tenantId: scenario.tenantId,
      createdById: user.id,
      status: 'running',
      progress: 50,
      config,
    },
  });

  // Save metrics
  const metricsData = [
    { name: 'revenue', displayName: 'Total Revenue', value: results.revenue.total, unit: 'currency', category: 'financial', isPositive: true },
    { name: 'revenue_fines', displayName: 'Revenue from Fines', value: results.revenue.fromFines, unit: 'currency', category: 'financial', isPositive: true },
    { name: 'revenue_permits', displayName: 'Revenue from Permits', value: results.revenue.fromPermits, unit: 'currency', category: 'financial', isPositive: true },
    { name: 'revenue_taxes', displayName: 'Revenue from Taxes', value: results.revenue.fromTaxes, unit: 'currency', category: 'financial', isPositive: true },
    { name: 'compliance_overall', displayName: 'Overall Compliance Rate', value: results.compliance.overall * 100, unit: 'percentage', category: 'operational', isPositive: true },
    { name: 'compliance_citizen', displayName: 'Citizen Compliance Rate', value: results.compliance.citizen * 100, unit: 'percentage', category: 'operational', isPositive: true },
    { name: 'compliance_business', displayName: 'Business Compliance Rate', value: results.compliance.business * 100, unit: 'percentage', category: 'operational', isPositive: true },
    { name: 'workload_hours', displayName: 'Total Work Hours', value: results.workload.totalHours, unit: 'hours', category: 'operational', isPositive: false },
    { name: 'workload_inspections', displayName: 'Total Inspections', value: results.workload.inspections, unit: 'count', category: 'operational', isPositive: false },
    { name: 'workload_permits', displayName: 'Permits Processed', value: results.workload.permits, unit: 'count', category: 'operational', isPositive: true },
    { name: 'workload_staff', displayName: 'Staff Required', value: results.workload.staffRequired, unit: 'count', category: 'operational', isPositive: false },
    { name: 'satisfaction_overall', displayName: 'Overall Satisfaction', value: results.satisfaction.overall, unit: 'index', category: 'social', isPositive: true },
    { name: 'satisfaction_citizen', displayName: 'Citizen Satisfaction', value: results.satisfaction.citizen, unit: 'index', category: 'social', isPositive: true },
    { name: 'satisfaction_business', displayName: 'Business Satisfaction', value: results.satisfaction.business, unit: 'index', category: 'social', isPositive: true },
  ];

  for (const metric of metricsData) {
    await db.simulationMetric.create({
      data: {
        simulationId: simulation.id,
        ...metric,
      },
    });
  }

  // Save monthly projections
  for (const projection of results.monthlyProjections) {
    await db.simulationResult.create({
      data: {
        simulationId: simulation.id,
        scenarioId,
        metricName: 'monthly_projection',
        metricValue: projection.revenue,
        metricUnit: 'currency',
        period: `month_${projection.month}`,
        metadata: projection as unknown as Record<string, unknown>,
      },
    });
  }

  // Update simulation as completed
  await db.simulation.update({
    where: { id: simulation.id },
    data: {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      duration: 1000,
    },
  });

  // Update scenario status
  await db.scenario.update({
    where: { id: scenarioId },
    data: { status: 'completed' },
  });

  return {
    simulationId: simulation.id,
    metrics: results,
  };
}
