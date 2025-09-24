/**
 * Elevation service for Nike Run Club-style GPS tracking
 * Provides elevation data for GPS coordinates using external APIs
 */

interface ElevationPoint {
  lat: number;
  lon: number;
  elevation?: number;
}

interface ElevationResponse {
  lat: number;
  lon: number;
  elevation: number;
}

interface OpenElevationResult {
  latitude: number;
  longitude: number;
  elevation: number;
}

interface OpenElevationResponse {
  results: OpenElevationResult[];
}

class ElevationService {
  private cache = new Map<string, number>();
  private readonly CACHE_PRECISION = 4; // Round coordinates to 4 decimal places for caching
  private readonly MAX_BATCH_SIZE = 100; // Maximum points per API request
  private readonly RETRY_DELAY = 1000; // Delay between retries in ms
  private readonly MAX_RETRIES = 3;

  /**
   * Get elevation for a single coordinate
   */
  async getElevation(lat: number, lon: number): Promise<number> {
    const results = await this.getElevations([{ lat, lon }]);
    return results[0]?.elevation || 0;
  }

  /**
   * Get elevations for multiple coordinates
   */
  async getElevations(points: ElevationPoint[]): Promise<ElevationResponse[]> {
    const results: ElevationResponse[] = [];
    
    // Process points in batches
    for (let i = 0; i < points.length; i += this.MAX_BATCH_SIZE) {
      const batch = points.slice(i, i + this.MAX_BATCH_SIZE);
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private async processBatch(points: ElevationPoint[]): Promise<ElevationResponse[]> {
    const results: ElevationResponse[] = [];
    const pointsToFetch: ElevationPoint[] = [];
    
    // Check cache first
    for (const point of points) {
      const cacheKey = this.getCacheKey(point.lat, point.lon);
      const cachedElevation = this.cache.get(cacheKey);
      
      if (cachedElevation !== undefined) {
        results.push({
          lat: point.lat,
          lon: point.lon,
          elevation: cachedElevation
        });
      } else {
        pointsToFetch.push(point);
      }
    }

    // Fetch missing elevations
    if (pointsToFetch.length > 0) {
      try {
        const fetchedResults = await this.fetchFromAPI(pointsToFetch);
        
        // Cache results and add to output
        for (const result of fetchedResults) {
          const cacheKey = this.getCacheKey(result.lat, result.lon);
          this.cache.set(cacheKey, result.elevation);
          results.push(result);
        }
      } catch (error) {
        console.error('Failed to fetch elevation data:', error);
        
        // Return default elevation of 0 for failed points
        for (const point of pointsToFetch) {
          results.push({
            lat: point.lat,
            lon: point.lon,
            elevation: 0
          });
        }
      }
    }

    return results;
  }

  private async fetchFromAPI(points: ElevationPoint[]): Promise<ElevationResponse[]> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.callOpenElevationAPI(points);
      } catch (error) {
        console.warn(`Elevation API attempt ${attempt} failed:`, error);
        
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
    
    throw new Error('All elevation API attempts failed');
  }

  private async callOpenElevationAPI(points: ElevationPoint[]): Promise<ElevationResponse[]> {
    // Use Open-Elevation API (free, no API key required)
    const locations = points.map(p => ({ latitude: p.lat, longitude: p.lon }));
    
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations
      })
    });

    if (!response.ok) {
      throw new Error(`Open-Elevation API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenElevationResponse = await response.json();
    
    return data.results.map(result => ({
      lat: result.latitude,
      lon: result.longitude,
      elevation: Math.round(result.elevation) // Round to nearest meter
    }));
  }

  private getCacheKey(lat: number, lon: number): string {
    // Round coordinates to reduce cache size and improve hit rate
    const roundedLat = Number(lat.toFixed(this.CACHE_PRECISION));
    const roundedLon = Number(lon.toFixed(this.CACHE_PRECISION));
    return `${roundedLat},${roundedLon}`;
  }

  /**
   * Clear elevation cache (useful for memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats for monitoring
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 10000 // Limit cache to prevent memory issues
    };
  }

  /**
   * Clean up old cache entries if cache gets too large
   */
  private cleanupCache(): void {
    const stats = this.getCacheStats();
    
    if (stats.size > stats.maxSize) {
      // Simple cleanup: clear half the cache
      const entries = Array.from(this.cache.entries());
      this.cache.clear();
      
      // Keep the more recent half (assuming they were added more recently)
      const keepCount = Math.floor(entries.length / 2);
      const entriesToKeep = entries.slice(-keepCount);
      
      for (const [key, value] of entriesToKeep) {
        this.cache.set(key, value);
      }
      
      console.log(`Cleaned elevation cache: ${entries.length} -> ${entriesToKeep.length} entries`);
    }
  }
}

// Export singleton instance
export const elevationService = new ElevationService();

// Types for external use
export type { ElevationPoint, ElevationResponse };