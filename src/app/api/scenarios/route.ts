// Digital Policy Sandbox - Scenarios API
// CRUD operations for scenarios

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTags } from '@/lib/cache';

// GET /api/scenarios - List all scenarios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantId') || 'demo';
    const status = searchParams.get('status');
    const isBaseline = searchParams.get('isBaseline');

    // Get tenant by slug
    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { tenantId: tenant.id };
    if (status) where.status = status;
    if (isBaseline !== null) where.isBaseline = isBaseline === 'true';

    const scenarios = await db.scenario.findMany({
      where,
      include: {
        policies: {
          include: {
            policy: true,
            policyVersion: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        parentScenario: {
          select: { id: true, name: true },
        },
        childScenarios: {
          select: { id: true, name: true },
        },
        _count: {
          select: { simulations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 });
  }
}

// POST /api/scenarios - Create new scenario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      isBaseline = false, 
      parentScenarioId,
      policies = [],
      tenantId = 'demo',
      userId = 'demo-user'
    } = body;

    // Get tenant
    const tenant = await db.tenant.findUnique({ where: { slug: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get user
    let user = await db.user.findFirst({ where: { tenantId: tenant.id } });
    if (!user) {
      user = await db.user.create({
        data: { email: `${userId}@${tenantId}.local`, name: userId, tenantId: tenant.id },
      });
    }

    // Create scenario
    const scenario = await db.scenario.create({
      data: {
        name,
        description,
        isBaseline,
        parentScenarioId,
        tenantId: tenant.id,
        createdById: user.id,
        status: 'draft',
      },
    });

    // Add policies if provided
    for (const p of policies) {
      const policyVersion = await db.policyVersion.findFirst({
        where: { policyId: p.policyId },
        orderBy: { version: 'desc' },
      });

      if (policyVersion) {
        await db.scenarioPolicy.create({
          data: {
            scenarioId: scenario.id,
            policyId: p.policyId,
            policyVersionId: policyVersion.id,
            parameterOverrides: p.parameterOverrides || null,
          },
        });
      }
    }

    // Invalidate cache
    cache.invalidateTag(CacheTags.tenant(tenant.id));
    cache.invalidateTag(CacheTags.allScenarios);

    // Fetch complete scenario
    const completeScenario = await db.scenario.findUnique({
      where: { id: scenario.id },
      include: {
        policies: {
          include: {
            policy: true,
            policyVersion: true,
          },
        },
      },
    });

    return NextResponse.json(completeScenario, { status: 201 });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
}
