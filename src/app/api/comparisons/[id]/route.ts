// Digital Policy Sandbox - Single Comparison API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/comparisons/[id] - Get comparison with results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMetrics = searchParams.get('includeMetrics') === 'true';

    const comparison = await db.scenarioComparison.findUnique({
      where: { id },
      include: {
        baselineScenario: {
          include: {
            simulations: {
              where: { status: 'completed' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { metrics: true },
            },
          },
        },
        comparedScenarios: {
          include: {
            scenario: {
              include: {
                simulations: {
                  where: { status: 'completed' },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  include: { metrics: true },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!comparison) {
      return NextResponse.json({ error: 'Comparison not found' }, { status: 404 });
    }

    let result: Record<string, unknown> = { comparison };

    if (includeMetrics) {
      // Calculate deltas
      const baselineMetrics = comparison.baselineScenario.simulations[0]?.metrics || [];
      
      const scenarios = comparison.comparedScenarios.map(cs => {
        const scenarioMetrics = cs.scenario.simulations[0]?.metrics || [];
        
        const delta = baselineMetrics.map(bm => {
          const sm = scenarioMetrics.find(m => m.name === bm.name);
          if (!sm) return null;
          
          const deltaValue = sm.value - bm.value;
          const percentChange = bm.value !== 0 ? (deltaValue / bm.value) * 100 : 0;
          
          return {
            name: bm.name,
            displayName: bm.displayName,
            baseline: bm.value,
            scenario: sm.value,
            delta: deltaValue,
            percentChange,
            isPositive: bm.isPositive ? deltaValue > 0 : deltaValue < 0,
          };
        }).filter(Boolean);

        return {
          id: cs.scenario.id,
          name: cs.scenario.name,
          metrics: scenarioMetrics,
          delta,
        };
      });

      result.scenarios = scenarios;
      result.baselineMetrics = baselineMetrics;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching comparison:', error);
    return NextResponse.json({ error: 'Failed to fetch comparison' }, { status: 500 });
  }
}

// DELETE /api/comparisons/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.scenarioComparison.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comparison:', error);
    return NextResponse.json({ error: 'Failed to delete comparison' }, { status: 500 });
  }
}
