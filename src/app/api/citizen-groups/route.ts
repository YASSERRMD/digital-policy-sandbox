// Digital Policy Sandbox - Citizen Groups API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/citizen-groups
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantId') || 'demo';

    // Get tenant by slug
    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.json([]);
    }

    const groups = await db.citizenGroup.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching citizen groups:', error);
    return NextResponse.json({ error: 'Failed to fetch citizen groups' }, { status: 500 });
  }
}

// POST /api/citizen-groups
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, population, demographics, behaviorRules, complianceRate, tenantId = 'demo' } = body;

    const tenant = await db.tenant.findUnique({ where: { slug: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const group = await db.citizenGroup.create({
      data: {
        name,
        description,
        population: population || 1000,
        demographics: demographics || {},
        behaviorRules: behaviorRules || null,
        complianceRate: complianceRate || 0.8,
        tenantId: tenant.id,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating citizen group:', error);
    return NextResponse.json({ error: 'Failed to create citizen group' }, { status: 500 });
  }
}
