// Digital Policy Sandbox - Simulations API
// Create and manage simulations - Direct execution

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTags } from '@/lib/cache';
import { runSimulation } from '@/lib/simulation/runner';

// GET /api/simulations - List simulations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantId') || 'demo';
    const scenarioId = searchParams.get('scenarioId');
    const status = searchParams.get('status');

    // Get tenant by slug
    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { tenantId: tenant.id };
    if (scenarioId) where.scenarioId = scenarioId;
    if (status) where.status = status;

    const simulations = await db.simulation.findMany({
      where,
      include: {
        scenario: {
          select: { id: true, name: true, isBaseline: true },
        },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { results: true, metrics: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(simulations);
  } catch (error) {
    console.error('Error fetching simulations:', error);
    return NextResponse.json({ error: 'Failed to fetch simulations' }, { status: 500 });
  }
}

// POST /api/simulations - Create and run simulation immediately
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId, config } = body;

    // Get scenario
    const scenario = await db.scenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    const simulationConfig = config || {
      timeHorizon: 12,
      includeSeasonality: true,
      populationGrowth: 2,
      economicGrowth: 3,
    };

    // Run simulation synchronously
    const result = await runSimulation(scenarioId, simulationConfig);

    // Invalidate cache
    cache.invalidateTag(CacheTags.scenario(scenarioId));
    cache.invalidateTag(CacheTags.tenant(scenario.tenantId));

    // Get complete simulation with metrics
    const simulation = await db.simulation.findUnique({
      where: { id: result.simulationId },
      include: {
        scenario: { select: { id: true, name: true, isBaseline: true } },
        metrics: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      ...simulation,
      metrics: result.metrics,
    }, { status: 201 });
  } catch (error) {
    console.error('Error running simulation:', error);
    return NextResponse.json({ 
      error: 'Failed to run simulation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
