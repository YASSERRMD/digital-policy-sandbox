// Digital Policy Sandbox - Single Business Category API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/business-categories/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const category = await db.businessCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json({ error: 'Business category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching business category:', error);
    return NextResponse.json({ error: 'Failed to fetch business category' }, { status: 500 });
  }
}

// PUT /api/business-categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const category = await db.businessCategory.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        count: body.count,
        industry: body.industry,
        sizeCategory: body.sizeCategory,
        behaviorRules: body.behaviorRules,
        complianceRate: body.complianceRate,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating business category:', error);
    return NextResponse.json({ error: 'Failed to update business category' }, { status: 500 });
  }
}

// DELETE /api/business-categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.businessCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting business category:', error);
    return NextResponse.json({ error: 'Failed to delete business category' }, { status: 500 });
  }
}
