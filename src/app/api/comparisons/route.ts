// Digital Policy Sandbox - Scenario Comparisons API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/comparisons - List comparisons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'demo';

    const comparisons = await db.scenarioComparison.findMany({
      where: { tenantId },
      include: {
        baselineScenario: {
          select: { id: true, name: true, status: true },
        },
        comparedScenarios: {
          include: {
            scenario: { select: { id: true, name: true, status: true } },
          },
          orderBy: { order: 'asc' },
        },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comparisons);
  } catch (error) {
    console.error('Error fetching comparisons:', error);
    return NextResponse.json({ error: 'Failed to fetch comparisons' }, { status: 500 });
  }
}

// POST /api/comparisons - Create comparison
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, baselineScenarioId, scenarioIds, tenantId = 'demo' } = body;

    const tenant = await db.tenant.findUnique({ where: { slug: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let user = await db.user.findFirst({ where: { tenantId: tenant.id } });
    if (!user) {
      user = await db.user.create({
        data: { email: `user@${tenantId}.local`, name: 'System User', tenantId: tenant.id },
      });
    }

    // Create comparison
    const comparison = await db.scenarioComparison.create({
      data: {
        name,
        description,
        baselineScenarioId,
        tenantId: tenant.id,
        createdById: user.id,
      },
    });

    // Add scenarios to compare
    for (let i = 0; i < scenarioIds.length; i++) {
      await db.comparisonScenario.create({
        data: {
          comparisonId: comparison.id,
          scenarioId: scenarioIds[i],
          order: i,
        },
      });
    }

    // Fetch complete comparison
    const result = await db.scenarioComparison.findUnique({
      where: { id: comparison.id },
      include: {
        baselineScenario: true,
        comparedScenarios: {
          include: { scenario: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating comparison:', error);
    return NextResponse.json({ error: 'Failed to create comparison' }, { status: 500 });
  }
}
