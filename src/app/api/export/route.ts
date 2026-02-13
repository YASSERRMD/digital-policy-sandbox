// Digital Policy Sandbox - Export API
// Export simulation results and comparisons as PDF

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/export - Generate PDF export
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, comparisonId, simulationId } = body;

    if (type === 'comparison' && comparisonId) {
      return await exportComparison(comparisonId);
    } else if (type === 'simulation' && simulationId) {
      return await exportSimulation(simulationId);
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}

async function exportComparison(comparisonId: string) {
  const comparison = await db.scenarioComparison.findUnique({
    where: { id: comparisonId },
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
    },
  });

  if (!comparison) {
    return NextResponse.json({ error: 'Comparison not found' }, { status: 404 });
  }

  // Generate PDF content as JSON for client-side rendering
  const exportData = {
    title: comparison.name,
    description: comparison.description,
    generatedAt: new Date().toISOString(),
    baseline: {
      name: comparison.baselineScenario.name,
      metrics: comparison.baselineScenario.simulations[0]?.metrics || [],
    },
    scenarios: comparison.comparedScenarios.map(cs => {
      const baselineMetrics = comparison.baselineScenario.simulations[0]?.metrics || [];
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
          unit: bm.unit,
          isPositive: bm.isPositive ? deltaValue > 0 : deltaValue < 0,
        };
      }).filter(Boolean);

      return {
        name: cs.scenario.name,
        metrics: scenarioMetrics,
        delta,
      };
    }),
  };

  // Create export job record
  const exportJob = await db.exportJob.create({
    data: {
      type: 'pdf',
      status: 'completed',
      config: { comparisonId },
      resultUrl: `/api/export/${comparison.id}/download`,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    exportId: exportJob.id,
    data: exportData,
  });
}

async function exportSimulation(simulationId: string) {
  const simulation = await db.simulation.findUnique({
    where: { id: simulationId },
    include: {
      scenario: true,
      metrics: true,
      results: {
        orderBy: { timestamp: 'desc' },
        take: 100,
      },
    },
  });

  if (!simulation) {
    return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
  }

  const exportData = {
    title: `Simulation: ${simulation.scenario.name}`,
    generatedAt: new Date().toISOString(),
    scenario: {
      id: simulation.scenario.id,
      name: simulation.scenario.name,
      description: simulation.scenario.description,
    },
    simulation: {
      id: simulation.id,
      status: simulation.status,
      createdAt: simulation.createdAt,
      completedAt: simulation.completedAt,
      duration: simulation.duration,
    },
    metrics: simulation.metrics,
    results: simulation.results,
  };

  const exportJob = await db.exportJob.create({
    data: {
      type: 'pdf',
      status: 'completed',
      config: { simulationId },
      resultUrl: `/api/export/${simulation.id}/download`,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    exportId: exportJob.id,
    data: exportData,
  });
}

// GET /api/export - Get export status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const exportId = searchParams.get('exportId');

  if (!exportId) {
    return NextResponse.json({ error: 'Export ID required' }, { status: 400 });
  }

  const exportJob = await db.exportJob.findUnique({
    where: { id: exportId },
  });

  if (!exportJob) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 });
  }

  return NextResponse.json(exportJob);
}
