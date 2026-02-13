// Digital Policy Sandbox - Single Policy API
// Get, Update, Delete operations for a specific policy

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTags } from '@/lib/cache';

// GET /api/policies/[id] - Get single policy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check cache
    const cacheKey = CacheKeys.policy(id);
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const policy = await db.policy.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Cache for 5 minutes
    cache.set(cacheKey, policy, {
      tags: [CacheTags.policy(id), CacheTags.tenant(policy.tenantId)],
      ttl: 5 * 60 * 1000,
    });

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error fetching policy:', error);
    return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 });
  }
}

// PUT /api/policies/[id] - Update policy
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, category, status, parameters, changeLog } = body;

    // Update policy
    const policy = await db.policy.update({
      where: { id },
      data: {
        name,
        description,
        category,
        status,
      },
    });

    // Create new version if parameters provided
    if (parameters) {
      const latestVersion = await db.policyVersion.findFirst({
        where: { policyId: id },
        orderBy: { version: 'desc' },
      });

      await db.policyVersion.create({
        data: {
          policyId: id,
          version: (latestVersion?.version || 0) + 1,
          parameters,
          changeLog,
          isActive: true,
          createdById: policy.createdById,
        },
      });

      // Deactivate old versions
      await db.policyVersion.updateMany({
        where: { policyId: id, isActive: true },
        data: { isActive: false },
      });
    }

    // Invalidate cache
    cache.invalidateTag(CacheTags.policy(id));
    cache.invalidateTag(CacheTags.tenant(policy.tenantId));
    cache.invalidateTag(CacheTags.allPolicies);
    cache.delete(CacheKeys.policy(id));

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error updating policy:', error);
    return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
  }
}

// DELETE /api/policies/[id] - Delete policy
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const policy = await db.policy.findUnique({ where: { id } });
    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Soft delete by archiving
    await db.policy.update({
      where: { id },
      data: { status: 'archived' },
    });

    // Invalidate cache
    cache.invalidateTag(CacheTags.policy(id));
    cache.invalidateTag(CacheTags.tenant(policy.tenantId));
    cache.invalidateTag(CacheTags.allPolicies);

    return NextResponse.json({ success: true, message: 'Policy archived' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
  }
}
