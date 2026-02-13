// Digital Policy Sandbox - Simulation Rule Engine
// Core simulation logic for policy impact calculation

import type { PolicyVersion, CitizenGroup, BusinessCategory } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface PolicyParameters {
  fineAmount?: number;
  permitDuration?: number; // in days
  inspectionFrequency?: number; // per year
  taxRate?: number; // percentage
  feeAmount?: number;
  penaltyRate?: number;
  gracePeriod?: number; // in days
  renewalPeriod?: number; // in days
  [key: string]: number | string | boolean | undefined;
}

export interface SimulationConfig {
  timeHorizon: number; // months
  includeSeasonality: boolean;
  populationGrowth: number; // percentage
  economicGrowth: number; // percentage
}

export interface SimulationInput {
  policies: {
    policy: PolicyVersion;
    overrides?: PolicyParameters;
  }[];
  citizenGroups: CitizenGroup[];
  businessCategories: BusinessCategory[];
  config: SimulationConfig;
}

export interface SimulationMetrics {
  // Financial Metrics
  revenue: {
    total: number;
    fromFines: number;
    fromPermits: number;
    fromTaxes: number;
    fromFees: number;
    breakdown: Record<string, number>;
  };
  
  // Compliance Metrics
  compliance: {
    overall: number; // percentage
    citizen: number;
    business: number;
    byCategory: Record<string, number>;
  };
  
  // Operational Metrics
  workload: {
    totalHours: number;
    inspections: number;
    permits: number;
    appeals: number;
    staffRequired: number;
  };
  
  // Social Metrics
  satisfaction: {
    overall: number; // index 0-100
    citizen: number;
    business: number;
    byDemographic: Record<string, number>;
  };
  
  // Time-series data
  monthlyProjections: MonthlyProjection[];
}

export interface MonthlyProjection {
  month: number;
  revenue: number;
  compliance: number;
  workload: number;
  satisfaction: number;
}

// ============================================
// SIMULATION RULE ENGINE
// ============================================

export class SimulationEngine {
  private input: SimulationInput;
  private results: SimulationMetrics;
  
  constructor(input: SimulationInput) {
    this.input = input;
    this.results = this.initializeResults();
  }

  private initializeResults(): SimulationMetrics {
    return {
      revenue: {
        total: 0,
        fromFines: 0,
        fromPermits: 0,
        fromTaxes: 0,
        fromFees: 0,
        breakdown: {},
      },
      compliance: {
        overall: 0,
        citizen: 0,
        business: 0,
        byCategory: {},
      },
      workload: {
        totalHours: 0,
        inspections: 0,
        permits: 0,
        appeals: 0,
        staffRequired: 0,
      },
      satisfaction: {
        overall: 0,
        citizen: 0,
        business: 0,
        byDemographic: {},
      },
      monthlyProjections: [],
    };
  }

  // Main simulation runner
  async run(progressCallback?: (progress: number) => void): Promise<SimulationMetrics> {
    const totalSteps = 5;
    let currentStep = 0;

    // Step 1: Calculate revenue projections
    this.calculateRevenue();
    currentStep++;
    progressCallback?.((currentStep / totalSteps) * 100);

    // Step 2: Calculate compliance rates
    this.calculateCompliance();
    currentStep++;
    progressCallback?.((currentStep / totalSteps) * 100);

    // Step 3: Calculate workload impact
    this.calculateWorkload();
    currentStep++;
    progressCallback?.((currentStep / totalSteps) * 100);

    // Step 4: Calculate satisfaction index
    this.calculateSatisfaction();
    currentStep++;
    progressCallback?.((currentStep / totalSteps) * 100);

    // Step 5: Generate monthly projections
    this.generateMonthlyProjections();
    currentStep++;
    progressCallback?.((currentStep / totalSteps) * 100);

    return this.results;
  }

  // ============================================
  // REVENUE CALCULATION
  // ============================================

  private calculateRevenue(): void {
    let totalFines = 0;
    let totalPermits = 0;
    let totalTaxes = 0;
    let totalFees = 0;

    // Aggregate policy parameters
    const params = this.aggregateParameters();

    // Calculate revenue from citizen groups
    for (const group of this.input.citizenGroups) {
      const population = group.population;
      const complianceRate = group.complianceRate;
      
      // Fine revenue (from non-compliant citizens)
      const nonCompliant = population * (1 - complianceRate);
      const detectionRate = this.getDetectionRate(params);
      totalFines += nonCompliant * detectionRate * (params.fineAmount || 0);

      // Permit revenue
      const permitEligible = population * this.getPermitEligibility(group);
      totalPermits += permitEligible * (params.feeAmount || 0);

      // Tax revenue (simplified calculation)
      const avgIncome = this.getAverageIncome(group);
      totalTaxes += population * avgIncome * ((params.taxRate || 0) / 100) * this.input.config.timeHorizon / 12;
    }

    // Calculate revenue from businesses
    for (const business of this.input.businessCategories) {
      const count = business.count;
      const complianceRate = business.complianceRate;
      
      // Fine revenue from businesses
      const nonCompliant = count * (1 - complianceRate);
      const detectionRate = this.getDetectionRate(params);
      totalFines += nonCompliant * detectionRate * (params.fineAmount || 0) * this.getBusinessMultiplier(business);

      // Business permits
      totalPermits += count * (params.feeAmount || 0) * this.getBusinessMultiplier(business);

      // Business taxes (simplified)
      const avgRevenue = this.getAverageBusinessRevenue(business);
      totalTaxes += count * avgRevenue * ((params.taxRate || 0) / 100) * this.input.config.timeHorizon / 12;
    }

    // Apply economic growth factor
    const growthFactor = 1 + (this.input.config.economicGrowth / 100) * (this.input.config.timeHorizon / 12);
    
    this.results.revenue = {
      total: (totalFines + totalPermits + totalTaxes + totalFees) * growthFactor,
      fromFines: totalFines * growthFactor,
      fromPermits: totalPermits * growthFactor,
      fromTaxes: totalTaxes * growthFactor,
      fromFees: totalFees * growthFactor,
      breakdown: {
        citizenFines: totalFines * 0.3 * growthFactor,
        businessFines: totalFines * 0.7 * growthFactor,
        citizenPermits: totalPermits * 0.4 * growthFactor,
        businessPermits: totalPermits * 0.6 * growthFactor,
      },
    };
  }

  // ============================================
  // COMPLIANCE CALCULATION
  // ============================================

  private calculateCompliance(): void {
    const params = this.aggregateParameters();
    let totalCitizenCompliance = 0;
    let totalCitizenPopulation = 0;
    let totalBusinessCompliance = 0;
    let totalBusinessCount = 0;
    const complianceByCategory: Record<string, number> = {};

    // Calculate citizen compliance with policy impact
    for (const group of this.input.citizenGroups) {
      const population = group.population;
      let baseCompliance = group.complianceRate;
      
      // Apply policy impact on compliance
      // Higher fines tend to increase compliance
      const fineImpact = Math.min(0.1, (params.fineAmount || 0) / 10000);
      // More frequent inspections increase compliance
      const inspectionImpact = Math.min(0.05, (params.inspectionFrequency || 0) / 20);
      // Longer permit duration might decrease compliance (less oversight)
      const permitImpact = -Math.min(0.02, ((params.permitDuration || 365) - 365) / 3650);
      
      const adjustedCompliance = Math.min(1, Math.max(0, 
        baseCompliance + fineImpact + inspectionImpact + permitImpact
      ));

      totalCitizenCompliance += adjustedCompliance * population;
      totalCitizenPopulation += population;
      complianceByCategory[group.name] = adjustedCompliance;
    }

    // Calculate business compliance
    for (const business of this.input.businessCategories) {
      const count = business.count;
      let baseCompliance = business.complianceRate;
      
      // Businesses are generally more sensitive to fines
      const fineImpact = Math.min(0.15, (params.fineAmount || 0) / 5000);
      const inspectionImpact = Math.min(0.08, (params.inspectionFrequency || 0) / 12);
      
      const adjustedCompliance = Math.min(1, Math.max(0, 
        baseCompliance + fineImpact + inspectionImpact
      ));

      totalBusinessCompliance += adjustedCompliance * count;
      totalBusinessCount += count;
      complianceByCategory[business.name] = adjustedCompliance;
    }

    const citizenCompliance = totalCitizenPopulation > 0 
      ? totalCitizenCompliance / totalCitizenPopulation 
      : 0;
    const businessCompliance = totalBusinessCount > 0 
      ? totalBusinessCompliance / totalBusinessCount 
      : 0;

    this.results.compliance = {
      overall: (citizenCompliance + businessCompliance) / 2,
      citizen: citizenCompliance,
      business: businessCompliance,
      byCategory: complianceByCategory,
    };
  }

  // ============================================
  // WORKLOAD CALCULATION
  // ============================================

  private calculateWorkload(): void {
    const params = this.aggregateParameters();
    let totalInspections = 0;
    let totalPermits = 0;
    let totalAppeals = 0;

    // Calculate inspections based on frequency and population
    for (const group of this.input.citizenGroups) {
      const inspectionRate = (params.inspectionFrequency || 0) / 12; // per month
      totalInspections += group.population * inspectionRate * this.input.config.timeHorizon;
    }

    for (const business of this.input.businessCategories) {
      const inspectionRate = (params.inspectionFrequency || 0) / 12;
      totalInspections += business.count * inspectionRate * this.input.config.timeHorizon * 2; // Businesses need more inspections
    }

    // Calculate permit processing
    const totalPopulation = this.input.citizenGroups.reduce((sum, g) => sum + g.population, 0);
    const totalBusinesses = this.input.businessCategories.reduce((sum, b) => sum + b.count, 0);
    const permitRenewalsPerYear = 12 / ((params.permitDuration || 365) / 30);
    totalPermits = (totalPopulation * 0.1 + totalBusinesses) * permitRenewalsPerYear * (this.input.config.timeHorizon / 12);

    // Calculate appeals (based on non-compliance and fine amounts)
    const nonCompliantRate = 1 - this.results.compliance.overall;
    const appealRate = nonCompliantRate * 0.1 * ((params.fineAmount || 0) / 500);
    totalAppeals = (totalPopulation + totalBusinesses) * appealRate;

    // Calculate total hours
    const inspectionHours = totalInspections * 2; // 2 hours per inspection
    const permitHours = totalPermits * 0.5; // 30 minutes per permit
    const appealHours = totalAppeals * 4; // 4 hours per appeal
    const totalHours = inspectionHours + permitHours + appealHours;

    // Calculate staff required (assuming 160 hours per month per staff member)
    const staffRequired = Math.ceil(totalHours / (160 * (this.input.config.timeHorizon / 12)));

    this.results.workload = {
      totalHours,
      inspections: Math.round(totalInspections),
      permits: Math.round(totalPermits),
      appeals: Math.round(totalAppeals),
      staffRequired,
    };
  }

  // ============================================
  // SATISFACTION CALCULATION
  // ============================================

  private calculateSatisfaction(): void {
    const params = this.aggregateParameters();
    const satisfactionByDemographic: Record<string, number> = {};
    
    // Base satisfaction is 70 out of 100
    const baseSatisfaction = 70;
    
    // Factors that affect satisfaction (positive and negative)
    const fineImpact = -Math.min(20, (params.fineAmount || 0) / 50); // Higher fines = lower satisfaction
    const permitImpact = Math.min(10, ((params.permitDuration || 365) - 180) / 50); // Longer permits = higher satisfaction
    const taxImpact = -Math.min(15, (params.taxRate || 0) / 2); // Higher taxes = lower satisfaction
    const graceImpact = Math.min(5, (params.gracePeriod || 0) / 10); // Grace period = higher satisfaction

    let totalCitizenSatisfaction = 0;
    let totalCitizenPopulation = 0;

    // Calculate citizen satisfaction
    for (const group of this.input.citizenGroups) {
      const population = group.population;
      const behaviorRules = group.behaviorRules as Record<string, number> | null;
      
      // Apply behavior modifiers
      const incomeModifier = behaviorRules?.incomeSensitivity || 1;
      const awarenessModifier = behaviorRules?.policyAwareness || 1;
      
      const groupSatisfaction = Math.min(100, Math.max(0, 
        baseSatisfaction + fineImpact * incomeModifier + permitImpact + taxImpact + graceImpact * awarenessModifier
      ));

      totalCitizenSatisfaction += groupSatisfaction * population;
      totalCitizenPopulation += population;
      satisfactionByDemographic[group.name] = groupSatisfaction;
    }

    let totalBusinessSatisfaction = 0;
    let totalBusinessCount = 0;

    // Calculate business satisfaction
    for (const business of this.input.businessCategories) {
      const count = business.count;
      const behaviorRules = business.behaviorRules as Record<string, number> | null;
      
      // Businesses are more affected by permit duration and tax rates
      const businessFineImpact = fineImpact * 0.5; // Businesses less affected by fines personally
      const businessPermitImpact = permitImpact * 1.5; // More value on longer permits
      const businessTaxImpact = taxImpact * 1.2; // More sensitive to taxes
      
      const sizeModifier = business.sizeCategory === 'large' ? 0.8 : business.sizeCategory === 'small' ? 1.2 : 1;
      const awarenessModifier = behaviorRules?.policyAwareness || 1;
      
      const businessSatisfaction = Math.min(100, Math.max(0, 
        baseSatisfaction + businessFineImpact + businessPermitImpact + businessTaxImpact * sizeModifier * awarenessModifier
      ));

      totalBusinessSatisfaction += businessSatisfaction * count;
      totalBusinessCount += count;
      satisfactionByDemographic[business.name] = businessSatisfaction;
    }

    const citizenSatisfaction = totalCitizenPopulation > 0 
      ? totalCitizenSatisfaction / totalCitizenPopulation 
      : baseSatisfaction;
    const businessSatisfaction = totalBusinessCount > 0 
      ? totalBusinessSatisfaction / totalBusinessCount 
      : baseSatisfaction;

    this.results.satisfaction = {
      overall: (citizenSatisfaction + businessSatisfaction) / 2,
      citizen: citizenSatisfaction,
      business: businessSatisfaction,
      byDemographic: satisfactionByDemographic,
    };
  }

  // ============================================
  // MONTHLY PROJECTIONS
  // ============================================

  private generateMonthlyProjections(): void {
    const months = this.input.config.timeHorizon;
    const seasonality = this.getSeasonalityFactors();

    for (let month = 1; month <= months; month++) {
      const seasonFactor = this.input.config.includeSeasonality ? seasonality[month - 1] : 1;
      const growthFactor = 1 + (this.input.config.economicGrowth / 100) * (month / 12);
      const populationFactor = 1 + (this.input.config.populationGrowth / 100) * (month / 12);

      this.results.monthlyProjections.push({
        month,
        revenue: (this.results.revenue.total / months) * seasonFactor * growthFactor,
        compliance: this.results.compliance.overall * (1 + (Math.random() * 0.02 - 0.01)), // Small variation
        workload: (this.results.workload.totalHours / months) * seasonFactor,
        satisfaction: this.results.satisfaction.overall * (1 + (Math.random() * 0.02 - 0.01)),
      });
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private aggregateParameters(): PolicyParameters {
    const aggregated: PolicyParameters = {};
    
    for (const { policy, overrides } of this.input.policies) {
      const params = policy.parameters as PolicyParameters;
      
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'number' && aggregated[key] !== undefined) {
          // Average numeric values
          aggregated[key] = ((aggregated[key] as number) + value) / 2;
        } else {
          aggregated[key] = value;
        }
      }
      
      // Apply overrides
      if (overrides) {
        for (const [key, value] of Object.entries(overrides)) {
          aggregated[key] = value;
        }
      }
    }
    
    return aggregated;
  }

  private getDetectionRate(params: PolicyParameters): number {
    // Detection rate based on inspection frequency
    const baseRate = 0.3;
    const inspectionBoost = Math.min(0.4, (params.inspectionFrequency || 0) / 25);
    return Math.min(0.9, baseRate + inspectionBoost);
  }

  private getPermitEligibility(group: CitizenGroup): number {
    const demographics = group.demographics as Record<string, number> | null;
    // Percentage of population that needs permits (e.g., driving age, business owners)
    return demographics?.permitEligibility || 0.3;
  }

  private getAverageIncome(group: CitizenGroup): number {
    const demographics = group.demographics as Record<string, number> | null;
    return demographics?.averageIncome || 30000;
  }

  private getBusinessMultiplier(business: BusinessCategory): number {
    const sizeMultipliers: Record<string, number> = {
      small: 1,
      medium: 2,
      large: 5,
    };
    return sizeMultipliers[business.sizeCategory || 'small'] || 1;
  }

  private getAverageBusinessRevenue(business: BusinessCategory): number {
    const behaviorRules = business.behaviorRules as Record<string, number> | null;
    const baseRevenue: Record<string, number> = {
      small: 100000,
      medium: 500000,
      large: 2000000,
    };
    return behaviorRules?.averageRevenue || baseRevenue[business.sizeCategory || 'small'] || 100000;
  }

  private getSeasonalityFactors(): number[] {
    // Monthly seasonality factors (peak in summer, low in winter)
    return [0.85, 0.88, 0.95, 1.02, 1.08, 1.15, 1.12, 1.10, 1.02, 0.95, 0.88, 1.00];
  }
}

// ============================================
// SCENARIO COMPARISON
// ============================================

export interface ComparisonResult {
  baseline: SimulationMetrics;
  scenarios: {
    id: string;
    name: string;
    metrics: SimulationMetrics;
    delta: {
      revenue: number;
      compliance: number;
      workload: number;
      satisfaction: number;
    };
    percentChange: {
      revenue: number;
      compliance: number;
      workload: number;
      satisfaction: number;
    };
  }[];
}

export function compareScenarios(
  baseline: SimulationMetrics,
  scenarios: { id: string; name: string; metrics: SimulationMetrics }[]
): ComparisonResult {
  const scenarioResults = scenarios.map(({ id, name, metrics }) => {
    const revenueDelta = metrics.revenue.total - baseline.revenue.total;
    const complianceDelta = metrics.compliance.overall - baseline.compliance.overall;
    const workloadDelta = metrics.workload.totalHours - baseline.workload.totalHours;
    const satisfactionDelta = metrics.satisfaction.overall - baseline.satisfaction.overall;

    return {
      id,
      name,
      metrics,
      delta: {
        revenue: revenueDelta,
        compliance: complianceDelta,
        workload: workloadDelta,
        satisfaction: satisfactionDelta,
      },
      percentChange: {
        revenue: baseline.revenue.total > 0 ? (revenueDelta / baseline.revenue.total) * 100 : 0,
        compliance: baseline.compliance.overall > 0 ? (complianceDelta / baseline.compliance.overall) * 100 : 0,
        workload: baseline.workload.totalHours > 0 ? (workloadDelta / baseline.workload.totalHours) * 100 : 0,
        satisfaction: baseline.satisfaction.overall > 0 ? (satisfactionDelta / baseline.satisfaction.overall) * 100 : 0,
      },
    };
  });

  return {
    baseline,
    scenarios: scenarioResults,
  };
}
