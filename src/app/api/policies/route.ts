// Digital Policy Sandbox - Policies API
// CRUD operations for policy definitions

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTags } from '@/lib/cache';

// GET /api/policies - List all policies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantId') || 'demo';
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    // Get tenant by slug first
    const tenant = await db.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      return NextResponse.json([]);
    }

    // Check cache
    const cacheKey = `${CacheKeys.tenantData(tenant.id)}:policies:${category || 'all'}:${status || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const where: Record<string, unknown> = { tenantId: tenant.id };
    if (category) where.category = category;
    if (status) where.status = status;

    const policies = await db.policy.findMany({
      where,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = policies.map(p => ({
      ...p,
      currentVersion: p.versions[0] || null,
      versions: undefined,
    }));

    // Cache for 5 minutes
    cache.set(cacheKey, result, {
      tags: [CacheTags.tenant(tenant.id), CacheTags.allPolicies],
      ttl: 5 * 60 * 1000,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

// POST /api/policies - Create new policy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, description, category, parameters, tenantId = 'demo', userId = 'demo-user' } = body;

    // Get or create tenant
    let tenant = await db.tenant.findUnique({ where: { slug: tenantId } });
    if (!tenant) {
      tenant = await db.tenant.create({
        data: { name: tenantId, slug: tenantId, isActive: true },
      });
    }

    // Get or create user
    let user = await db.user.findFirst({ where: { tenantId: tenant.id } });
    if (!user) {
      user = await db.user.create({
        data: { email: `${userId}@${tenantId}.local`, name: userId, tenantId: tenant.id },
      });
    }

    // Create policy
    const policy = await db.policy.create({
      data: {
        name,
        code,
        description,
        category,
        tenantId: tenant.id,
        createdById: user.id,
        status: 'draft',
      },
    });

    // Create first version
    const version = await db.policyVersion.create({
      data: {
        policyId: policy.id,
        version: 1,
        parameters: parameters || {},
        isActive: true,
        createdById: user.id,
      },
    });

    // Invalidate cache
    cache.invalidateTag(CacheTags.tenant(tenant.id));
    cache.invalidateTag(CacheTags.allPolicies);

    return NextResponse.json({ ...policy, currentVersion: version }, { status: 201 });
  } catch (error) {
    console.error('Error creating policy:', error);
    return NextResponse.json(
      { error: 'Failed to create policy', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
