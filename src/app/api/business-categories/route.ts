// Digital Policy Sandbox - Business Categories API

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/business-categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantId') || 'demo';
    const industry = searchParams.get('industry');
    const size = searchParams.get('size');

    // Get tenant by slug
    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.json([]);
    }

    const where: Record<string, unknown> = { tenantId: tenant.id };
    if (industry) where.industry = industry;
    if (size) where.sizeCategory = size;

    const categories = await db.businessCategory.findMany({
      where,
      orderBy: [{ industry: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching business categories:', error);
    return NextResponse.json({ error: 'Failed to fetch business categories' }, { status: 500 });
  }
}

// POST /api/business-categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, count, industry, sizeCategory, behaviorRules, complianceRate, tenantId = 'demo' } = body;

    const tenant = await db.tenant.findUnique({ where: { slug: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const category = await db.businessCategory.create({
      data: {
        name,
        description,
        count: count || 100,
        industry,
        sizeCategory,
        behaviorRules: behaviorRules || null,
        complianceRate: complianceRate || 0.85,
        tenantId: tenant.id,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating business category:', error);
    return NextResponse.json({ error: 'Failed to create business category' }, { status: 500 });
  }
}
