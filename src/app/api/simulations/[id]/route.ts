// Digital Policy Sandbox - Single Simulation API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTags } from '@/lib/cache';

// GET /api/simulations/[id] - Get simulation status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const simulation = await db.simulation.findUnique({
      where: { id },
      include: {
        scenario: {
          select: { id: true, name: true, isBaseline: true },
        },
        metrics: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...simulation,
      socketUrl: '/?XTransformPort=3003',
      room: `simulation:${simulation.id}`,
    });
  } catch (error) {
    console.error('Error fetching simulation:', error);
    return NextResponse.json({ error: 'Failed to fetch simulation' }, { status: 500 });
  }
}

// DELETE /api/simulations/[id] - Cancel/Delete simulation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const simulation = await db.simulation.findUnique({ where: { id } });
    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    if (simulation.status === 'running') {
      return NextResponse.json({ error: 'Cannot delete running simulation' }, { status: 400 });
    }

    await db.simulation.delete({ where: { id } });

    cache.invalidateTag(CacheTags.simulation(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting simulation:', error);
    return NextResponse.json({ error: 'Failed to delete simulation' }, { status: 500 });
  }
}
