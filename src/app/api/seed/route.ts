// Digital Policy Sandbox - Seed API
// Initialize database with demo data

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Create default tenant
    const tenant = await db.tenant.upsert({
      where: { slug: 'demo' },
      update: {},
      create: {
        name: 'Demo Municipality',
        slug: 'demo',
        domain: 'demo.local',
        isActive: true,
        settings: { theme: 'default' },
      },
    });

    // Create default user
    const user = await db.user.upsert({
      where: { email: 'admin@demo.local' },
      update: {},
      create: {
        email: 'admin@demo.local',
        name: 'Admin User',
        tenantId: tenant.id,
        isActive: true,
      },
    });

    // Create roles with compound unique key
    const adminRole = await db.role.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'admin' } },
      update: {},
      create: {
        name: 'Administrator',
        slug: 'admin',
        description: 'Full system access',
        isSystem: true,
        tenantId: tenant.id,
      },
    });

    // Create permissions
    const resources = ['policy', 'scenario', 'simulation', 'citizen', 'business', 'comparison'];
    const actions = ['create', 'read', 'update', 'delete', 'simulate'];

    for (const resource of resources) {
      for (const action of actions) {
        await db.permission.upsert({
          where: {
            roleId_resource_action: {
              roleId: adminRole.id,
              resource,
              action,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            resource,
            action,
          },
        });
      }
    }

    // Assign role to user
    await db.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    // Create sample policies
    const policies = [
      {
        name: 'Traffic Fine Policy',
        code: 'POL-001',
        category: 'fines',
        description: 'Traffic violation fines and penalties',
        parameters: {
          fineAmount: 150,
          penaltyRate: 5,
          gracePeriod: 14,
        },
      },
      {
        name: 'Business Permit Policy',
        code: 'POL-002',
        category: 'permits',
        description: 'Business licensing and permit requirements',
        parameters: {
          permitDuration: 365,
          feeAmount: 250,
          renewalPeriod: 30,
        },
      },
      {
        name: 'Health Inspection Policy',
        code: 'POL-003',
        category: 'inspections',
        description: 'Health and safety inspection schedule',
        parameters: {
          inspectionFrequency: 4,
          fineAmount: 500,
          gracePeriod: 7,
        },
      },
      {
        name: 'Local Tax Policy',
        code: 'POL-004',
        category: 'taxation',
        description: 'Local tax rates and collection',
        parameters: {
          taxRate: 2.5,
          penaltyRate: 10,
          gracePeriod: 30,
        },
      },
    ];

    const createdPolicies = [];
    for (const policyData of policies) {
      // Check if policy exists
      let policy = await db.policy.findFirst({
        where: { tenantId: tenant.id, code: policyData.code },
      });

      if (!policy) {
        policy = await db.policy.create({
          data: {
            name: policyData.name,
            code: policyData.code,
            category: policyData.category,
            description: policyData.description,
            tenantId: tenant.id,
            createdById: user.id,
            status: 'active',
          },
        });

        // Create policy version
        await db.policyVersion.create({
          data: {
            policyId: policy.id,
            version: 1,
            parameters: policyData.parameters,
            isActive: true,
            createdById: user.id,
          },
        });
      }
      createdPolicies.push(policy);
    }

    // Create citizen groups
    const citizenGroups = [
      {
        name: 'Young Adults (18-35)',
        population: 25000,
        complianceRate: 0.72,
        demographics: {
          averageIncome: 35000,
          permitEligibility: 0.85,
          ageRange: '18-35',
        },
        behaviorRules: {
          incomeSensitivity: 1.2,
          policyAwareness: 0.9,
        },
      },
      {
        name: 'Middle Age (36-55)',
        population: 35000,
        complianceRate: 0.85,
        demographics: {
          averageIncome: 55000,
          permitEligibility: 0.9,
          ageRange: '36-55',
        },
        behaviorRules: {
          incomeSensitivity: 0.8,
          policyAwareness: 1.1,
        },
      },
      {
        name: 'Seniors (56+)',
        population: 20000,
        complianceRate: 0.92,
        demographics: {
          averageIncome: 40000,
          permitEligibility: 0.7,
          ageRange: '56+',
        },
        behaviorRules: {
          incomeSensitivity: 1.0,
          policyAwareness: 1.2,
        },
      },
    ];

    for (const groupData of citizenGroups) {
      const existing = await db.citizenGroup.findFirst({
        where: { tenantId: tenant.id, name: groupData.name },
      });

      if (!existing) {
        await db.citizenGroup.create({
          data: {
            name: groupData.name,
            population: groupData.population,
            complianceRate: groupData.complianceRate,
            demographics: groupData.demographics,
            behaviorRules: groupData.behaviorRules,
            tenantId: tenant.id,
          },
        });
      }
    }

    // Create business categories
    const businessCategories = [
      {
        name: 'Small Retail',
        count: 500,
        industry: 'Retail',
        sizeCategory: 'small',
        complianceRate: 0.78,
        behaviorRules: {
          averageRevenue: 150000,
          policyAwareness: 0.9,
        },
      },
      {
        name: 'Medium Manufacturing',
        count: 150,
        industry: 'Manufacturing',
        sizeCategory: 'medium',
        complianceRate: 0.88,
        behaviorRules: {
          averageRevenue: 2000000,
          policyAwareness: 1.1,
        },
      },
      {
        name: 'Large Enterprise',
        count: 30,
        industry: 'Various',
        sizeCategory: 'large',
        complianceRate: 0.95,
        behaviorRules: {
          averageRevenue: 50000000,
          policyAwareness: 1.3,
        },
      },
      {
        name: 'Food Service',
        count: 300,
        industry: 'Hospitality',
        sizeCategory: 'small',
        complianceRate: 0.82,
        behaviorRules: {
          averageRevenue: 300000,
          policyAwareness: 1.0,
        },
      },
    ];

    for (const bizData of businessCategories) {
      const existing = await db.businessCategory.findFirst({
        where: { tenantId: tenant.id, name: bizData.name },
      });

      if (!existing) {
        await db.businessCategory.create({
          data: {
            name: bizData.name,
            count: bizData.count,
            industry: bizData.industry,
            sizeCategory: bizData.sizeCategory,
            complianceRate: bizData.complianceRate,
            behaviorRules: bizData.behaviorRules,
            tenantId: tenant.id,
          },
        });
      }
    }

    // Get all policies with versions for baseline scenario
    const allPolicies = await db.policy.findMany({
      where: { tenantId: tenant.id },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    // Create baseline scenario if not exists
    let baselineScenario = await db.scenario.findFirst({
      where: { tenantId: tenant.id, isBaseline: true },
    });

    if (!baselineScenario && allPolicies.length > 0) {
      baselineScenario = await db.scenario.create({
        data: {
          name: 'Baseline (Current Policy)',
          description: 'Current policy configuration as baseline for comparison',
          isBaseline: true,
          tenantId: tenant.id,
          createdById: user.id,
          status: 'draft',
        },
      });

      // Add policies to baseline scenario
      for (const policy of allPolicies) {
        if (policy.versions[0]) {
          await db.scenarioPolicy.create({
            data: {
              scenarioId: baselineScenario.id,
              policyId: policy.id,
              policyVersionId: policy.versions[0].id,
            },
          });
        }
      }
    }

    // Get counts for response
    const policyCount = await db.policy.count({ where: { tenantId: tenant.id } });
    const citizenGroupCount = await db.citizenGroup.count({ where: { tenantId: tenant.id } });
    const businessCategoryCount = await db.businessCategory.count({ where: { tenantId: tenant.id } });

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        tenant: tenant.slug,
        user: user.email,
        policies: policyCount,
        citizenGroups: citizenGroupCount,
        businessCategories: businessCategoryCount,
        baselineScenario: baselineScenario?.id || null,
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
