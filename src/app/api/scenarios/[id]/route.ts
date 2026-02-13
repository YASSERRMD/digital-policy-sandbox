// Digital Policy Sandbox - Single Scenario API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTags } from '@/lib/cache';

// GET /api/scenarios/[id] - Get single scenario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scenario = await db.scenario.findUnique({
      where: { id },
      include: {
        policies: {
          include: {
            policy: {
              include: { versions: { orderBy: { version: 'desc' } } }
            },
            policyVersion: true,
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        parentScenario: { select: { id: true, name: true } },
        childScenarios: { select: { id: true, name: true, status: true } },
        simulations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            progress: true,
            createdAt: true,
            completedAt: true,
          },
        },
        results: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json({ error: 'Failed to fetch scenario' }, { status: 500 });
  }
}

// PUT /api/scenarios/[id] - Update scenario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, status, policies } = body;

    // Update scenario
    const scenario = await db.scenario.update({
      where: { id },
      data: { name, description, status },
    });

    // Update policies if provided
    if (policies && Array.isArray(policies)) {
      // Remove existing policies
      await db.scenarioPolicy.deleteMany({ where: { scenarioId: id } });

      // Add new policies
      for (const p of policies) {
        const policyVersion = await db.policyVersion.findFirst({
          where: { policyId: p.policyId },
          orderBy: { version: 'desc' },
        });

        if (policyVersion) {
          await db.scenarioPolicy.create({
            data: {
              scenarioId: id,
              policyId: p.policyId,
              policyVersionId: policyVersion.id,
              parameterOverrides: p.parameterOverrides || null,
            },
          });
        }
      }
    }

    // Invalidate cache
    cache.invalidateTag(CacheTags.scenario(id));
    cache.invalidateTag(CacheTags.tenant(scenario.tenantId));

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 });
  }
}

// DELETE /api/scenarios/[id] - Delete scenario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const scenario = await db.scenario.findUnique({ where: { id } });
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    if (scenario.isBaseline) {
      return NextResponse.json({ error: 'Cannot delete baseline scenario' }, { status: 400 });
    }

    await db.scenario.update({
      where: { id },
      data: { status: 'archived' },
    });

    cache.invalidateTag(CacheTags.scenario(id));
    cache.invalidateTag(CacheTags.tenant(scenario.tenantId));

    return NextResponse.json({ success: true, message: 'Scenario archived' });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 });
  }
}
