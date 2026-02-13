// Digital Policy Sandbox - Single Citizen Group API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/citizen-groups/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const group = await db.citizenGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json({ error: 'Citizen group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching citizen group:', error);
    return NextResponse.json({ error: 'Failed to fetch citizen group' }, { status: 500 });
  }
}

// PUT /api/citizen-groups/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const group = await db.citizenGroup.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        population: body.population,
        demographics: body.demographics,
        behaviorRules: body.behaviorRules,
        complianceRate: body.complianceRate,
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating citizen group:', error);
    return NextResponse.json({ error: 'Failed to update citizen group' }, { status: 500 });
  }
}

// DELETE /api/citizen-groups/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.citizenGroup.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting citizen group:', error);
    return NextResponse.json({ error: 'Failed to delete citizen group' }, { status: 500 });
  }
}
