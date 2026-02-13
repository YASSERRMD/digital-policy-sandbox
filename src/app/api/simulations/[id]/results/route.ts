// Digital Policy Sandbox - Simulation Results API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTags } from '@/lib/cache';

// GET /api/simulations/[id]/results - Get simulation results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('includeDetails') === 'true';

    // Check cache
    const cacheKey = `${CacheKeys.simulation(id)}:results`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const simulation = await db.simulation.findUnique({
      where: { id },
      include: {
        scenario: {
          select: { id: true, name: true, isBaseline: true },
        },
        metrics: {
          orderBy: { category: 'asc' },
        },
      },
    });

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    let results: Record<string, unknown> = {
      simulation,
      metrics: simulation.metrics,
    };

    if (includeDetails) {
      // Get detailed results with breakdowns
      const detailedResults = await db.simulationResult.findMany({
        where: { simulationId: id },
        include: {
          groupResults: {
            include: {
              citizenGroup: { select: { id: true, name: true } },
            },
          },
          businessResults: {
            include: {
              businessCategory: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      results.detailedResults = detailedResults;

      // Get monthly projections
      const projections = await db.simulationResult.findMany({
        where: {
          simulationId: id,
          metricName: 'monthly_projection',
        },
        orderBy: { period: 'asc' },
      });

      results.monthlyProjections = projections.map(p => ({
        month: parseInt((p.period as string)?.replace('month_', '') || '0'),
        ...p.metadata as object,
      }));
    }

    // Cache results
    cache.set(cacheKey, results, {
      tags: [CacheTags.simulation(id)],
      ttl: 10 * 60 * 1000, // 10 minutes
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching simulation results:', error);
    return NextResponse.json({ error: 'Failed to fetch simulation results' }, { status: 500 });
  }
}
