// Digital Policy Sandbox - Scenario Clone API
// Clone a scenario into a new branch

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTags } from '@/lib/cache';

// POST /api/scenarios/[id]/clone - Clone scenario
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Get original scenario
    const original = await db.scenario.findUnique({
      where: { id },
      include: {
        policies: {
          include: {
            policy: true,
            policyVersion: true,
          },
        },
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    // Create cloned scenario
    const cloned = await db.scenario.create({
      data: {
        name: name || `${original.name} (Copy)`,
        description: description || original.description,
        isBaseline: false,
        parentScenarioId: id,
        tenantId: original.tenantId,
        createdById: original.createdById,
        status: 'draft',
      },
    });

    // Copy policies
    for (const sp of original.policies) {
      await db.scenarioPolicy.create({
        data: {
          scenarioId: cloned.id,
          policyId: sp.policyId,
          policyVersionId: sp.policyVersionId,
          parameterOverrides: sp.parameterOverrides,
        },
      });
    }

    // Invalidate cache
    cache.invalidateTag(CacheTags.tenant(original.tenantId));
    cache.invalidateTag(CacheTags.allScenarios);

    // Return complete cloned scenario
    const result = await db.scenario.findUnique({
      where: { id: cloned.id },
      include: {
        policies: {
          include: {
            policy: true,
            policyVersion: true,
          },
        },
        parentScenario: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error cloning scenario:', error);
    return NextResponse.json({ error: 'Failed to clone scenario' }, { status: 500 });
  }
}
