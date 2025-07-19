/**
 * Simple in-memory cache for AI analysis responses
 * This will significantly improve performance by avoiding repeated OpenAI API calls
 */
class AnalyticsCache {
  constructor() {
    this.cache = new Map();
    // Environment-based TTL: shorter in development, longer in production
    this.ttl = process.env.NODE_ENV === 'production' 
      ? 60 * 60 * 1000  // 1 hour in production
      : 10 * 60 * 1000; // 10 minutes in development
    
    // Auto-cleanup every 30 minutes
    setInterval(() => this.cleanup(), 30 * 60 * 1000);
  }

  /**
   * Generate cache key based on manager data and crime data hash
   */
  generateKey(managerId, dataHash) {
    return `analytics_${managerId}_${dataHash}`;
  }

  /**
   * Create a simple hash of the crime data for cache invalidation
   */
  hashCrimeData(crimeData) {
    const dataString = JSON.stringify({
      totalCrimes: crimeData.total_kejahatan,
      crimeTypes: crimeData.jenis_kejahatan,
      timeAnalysis: crimeData.distribusi_waktu,
      recentCrimes: crimeData.kejahatan_terbaru.map(c => c.waktu).join(',')
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached analysis if available and not expired
   */
  get(managerId, dataHash) {
    const key = this.generateKey(managerId, dataHash);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📦 Cache HIT for manager ${managerId}`);
    }
    return cached.data;
  }

  /**
   * Store analysis in cache
   */
  set(managerId, dataHash, analysisData) {
    const key = this.generateKey(managerId, dataHash);
    
    this.cache.set(key, {
      data: analysisData,
      timestamp: Date.now()
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`💾 Cache STORED for manager ${managerId}`);
    }
    
    // Clean up expired entries periodically
    this.cleanup();
  }

  /**
   * Remove expired cache entries
   */
  cleanup() {
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear cache for a specific manager (useful when new crime data is added)
   */
  invalidateManager(managerId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`analytics_${managerId}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️  Cache INVALIDATED for manager ${managerId}`);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    console.log('🗑️  Cache CLEARED');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
const analyticsCache = new AnalyticsCache();

module.exports = analyticsCache;