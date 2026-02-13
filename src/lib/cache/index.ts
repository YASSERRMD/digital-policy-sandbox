// Digital Policy Sandbox - In-Memory Cache System
// With tag-based invalidation for policy changes

interface CacheEntry<T> {
  value: T;
  tags: Set<string>;
  expiresAt: number | null;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private stats = { hits: 0, misses: 0 };

  // Get a value from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  // Set a value in cache with optional tags and TTL
  set<T>(
    key: string,
    value: T,
    options?: { tags?: string[]; ttl?: number }
  ): void {
    const tags = new Set(options?.tags || []);
    const expiresAt = options?.ttl ? Date.now() + options.ttl : null;

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Store the entry
    this.cache.set(key, {
      value,
      tags,
      expiresAt,
      createdAt: Date.now(),
    });

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  // Delete a specific key
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Remove from tag index
    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(key);
      if (this.tagIndex.get(tag)?.size === 0) {
        this.tagIndex.delete(tag);
      }
    }

    return this.cache.delete(key);
  }

  // Invalidate all entries with a specific tag
  invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      if (this.delete(key)) count++;
    }
    return count;
  }

  // Invalidate multiple tags
  invalidateTags(tags: string[]): number {
    let total = 0;
    for (const tag of tags) {
      total += this.invalidateTag(tag);
    }
    return total;
  }

  // Check if key exists
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // Get all keys (optionally filtered by tag)
  keys(tag?: string): string[] {
    if (tag) {
      return Array.from(this.tagIndex.get(tag) || []);
    }
    return Array.from(this.cache.keys());
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  // Get cache statistics
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }

  // Clean expired entries
  cleanup(): number {
    let count = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.delete(key);
        count++;
      }
    }
    
    return count;
  }

  // Get cache size in bytes (approximate)
  getSize(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16
      size += JSON.stringify(entry.value).length * 2;
    }
    return size;
  }
}

// Singleton instance
export const cache = new InMemoryCache();

// Cache key generators for consistent naming
export const CacheKeys = {
  scenario: (id: string) => `scenario:${id}`,
  scenarioResults: (id: string) => `scenario:${id}:results`,
  simulation: (id: string) => `simulation:${id}`,
  policy: (id: string) => `policy:${id}`,
  policyVersion: (id: string) => `policy:${id}:version`,
  comparison: (id: string) => `comparison:${id}`,
  tenantData: (tenantId: string) => `tenant:${tenantId}:data`,
};

// Cache tags for invalidation
export const CacheTags = {
  policy: (id: string) => `policy:${id}`,
  scenario: (id: string) => `scenario:${id}`,
  simulation: (id: string) => `simulation:${id}`,
  tenant: (id: string) => `tenant:${id}`,
  allPolicies: 'all:policies',
  allScenarios: 'all:scenarios',
  allSimulations: 'all:simulations',
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  short: 60 * 1000, // 1 minute
  medium: 5 * 60 * 1000, // 5 minutes
  long: 30 * 60 * 1000, // 30 minutes
  hour: 60 * 60 * 1000, // 1 hour
};

// Decorator for caching function results
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  keyGenerator: (...args: Parameters<T>) => string,
  options?: { tags?: (...args: Parameters<T>) => string[]; ttl?: number }
) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    
    descriptor.value = async function (...args: Parameters<T>): Promise<ReturnType<T>> {
      const key = keyGenerator(...args);
      const tags = options?.tags?.(...args);
      
      // Check cache
      const cached = cache.get<ReturnType<T>>(key);
      if (cached !== null) {
        return cached;
      }
      
      // Execute and cache
      const result = await originalMethod.apply(this, args) as ReturnType<T>;
      cache.set(key, result, { tags, ttl: options?.ttl });
      
      return result;
    } as T;
    
    return descriptor;
  };
}

export default cache;
