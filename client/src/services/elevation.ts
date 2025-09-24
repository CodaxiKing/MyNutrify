/**
 * Frontend elevation service to communicate with backend elevation API
 */

interface ElevationPoint {
  lat: number;
  lon: number;
}

interface ElevationResponse {
  lat: number;
  lon: number;
  elevation: number;
}

interface ElevationAPIResponse {
  success: boolean;
  results: ElevationResponse[];
  count: number;
}

class ElevationService {
  private cache = new Map<string, number>();
  private pendingRequests = new Map<string, Promise<number>>();

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
    if (points.length === 0) {
      return [];
    }

    const results: ElevationResponse[] = [];
    const pointsToFetch: ElevationPoint[] = [];
    const pendingPromises: Array<{ point: ElevationPoint; promise: Promise<number> }> = [];

    // Check cache and pending requests
    for (const point of points) {
      const cacheKey = this.getCacheKey(point.lat, point.lon);
      const cachedElevation = this.cache.get(cacheKey);
      
      if (cachedElevation !== undefined) {
        // Cache hit - add result immediately
        results.push({
          lat: point.lat,
          lon: point.lon,
          elevation: cachedElevation
        });
      } else {
        // Check if we already have a pending request for this point
        const pendingRequest = this.pendingRequests.get(cacheKey);
        
        if (pendingRequest) {
          // Pending request exists - await it
          pendingPromises.push({ point, promise: pendingRequest });
        } else {
          // Need to fetch - add to batch
          pointsToFetch.push(point);
        }
      }
    }

    // Await all pending requests
    for (const { point, promise } of pendingPromises) {
      try {
        const elevation = await promise;
        results.push({
          lat: point.lat,
          lon: point.lon,
          elevation
        });
      } catch (error) {
        console.warn('Pending elevation request failed:', error);
        results.push({
          lat: point.lat,
          lon: point.lon,
          elevation: 0
        });
      }
    }

    // Fetch missing elevations
    if (pointsToFetch.length > 0) {
      try {
        const fetchPromise = this.fetchFromAPI(pointsToFetch);
        
        // Cache the promise to avoid duplicate requests
        for (const point of pointsToFetch) {
          const cacheKey = this.getCacheKey(point.lat, point.lon);
          this.pendingRequests.set(cacheKey, fetchPromise.then(results => {
            const result = results.find(r => 
              Math.abs(r.lat - point.lat) < 0.0001 && 
              Math.abs(r.lon - point.lon) < 0.0001
            );
            return result?.elevation || 0;
          }));
        }
        
        const fetchedResults = await fetchPromise;
        
        // Cache results and add to output
        for (const result of fetchedResults) {
          const cacheKey = this.getCacheKey(result.lat, result.lon);
          this.cache.set(cacheKey, result.elevation);
          results.push(result);
        }
        
        // Clean up pending requests
        for (const point of pointsToFetch) {
          const cacheKey = this.getCacheKey(point.lat, point.lon);
          this.pendingRequests.delete(cacheKey);
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
          
          // Clean up pending requests
          const cacheKey = this.getCacheKey(point.lat, point.lon);
          this.pendingRequests.delete(cacheKey);
        }
      }
    }

    return results;
  }

  private async fetchFromAPI(points: ElevationPoint[]): Promise<ElevationResponse[]> {
    const response = await fetch('/api/elevation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: points
      })
    });

    if (!response.ok) {
      throw new Error(`Elevation API error: ${response.status} ${response.statusText}`);
    }

    const data: ElevationAPIResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Elevation API returned error response');
    }
    
    return data.results;
  }

  private getCacheKey(lat: number, lon: number): string {
    // Round coordinates to 4 decimal places for caching (about 11m precision)
    const roundedLat = Number(lat.toFixed(4));
    const roundedLon = Number(lon.toFixed(4));
    return `${roundedLat},${roundedLon}`;
  }

  /**
   * Calculate elevation gain and loss from elevation array
   */
  calculateElevationStats(elevations: number[]): { gain: number; loss: number } {
    if (elevations.length < 2) {
      return { gain: 0, loss: 0 };
    }

    let totalGain = 0;
    let totalLoss = 0;

    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) {
        totalGain += diff;
      } else {
        totalLoss += Math.abs(diff);
      }
    }

    return {
      gain: Math.round(totalGain),
      loss: Math.round(totalLoss)
    };
  }

  /**
   * Clear elevation cache
   */
  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const elevationService = new ElevationService();

// Export types
export type { ElevationPoint, ElevationResponse };