/**
 * GPS utilities for distance calculation and running tracking
 */

export interface GPSCoordinate {
  lat: number;
  lon: number;
  timestamp?: number;
  accuracy?: number;
}

export interface RunningStats {
  distance: number; // kilometers
  duration: number; // minutes
  avgSpeed: number; // km/h
  avgPace: number; // min/km
  calories: number;
  coordinatesCount: number;
}

export interface UserRunningProfile {
  weight: number; // kg
  age: number;
  gender: 'male' | 'female';
}

/**
 * Convert degrees to radians
 */
function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  
  // Convert coordinates to radians
  const lat1Rad = degToRad(lat1);
  const lon1Rad = degToRad(lon1);
  const lat2Rad = degToRad(lat2);
  const lon2Rad = degToRad(lon2);
  
  // Calculate differences
  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;
  
  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate calories burned from running based on distance, weight, and pace
 * Uses 2024 MET values for different running speeds
 */
export function calculateRunningCalories(
  distanceKm: number, 
  weightKg: number, 
  avgSpeedKmh: number,
  durationMinutes: number,
  profile: { age: number; gender: 'male' | 'female' }
): number {
  // MET values based on running speed (2024 Compendium of Physical Activities)
  const getMETFromSpeed = (speedKmh: number): number => {
    if (speedKmh < 6.4) return 6.0;   // Very slow jog
    if (speedKmh < 8.0) return 8.3;   // Slow running (5 mph)
    if (speedKmh < 9.7) return 9.8;   // Moderate running (6 mph)
    if (speedKmh < 11.3) return 11.0; // Fast running (7 mph)
    if (speedKmh < 12.9) return 12.3; // Very fast running (8 mph)
    if (speedKmh < 14.5) return 14.5; // Running (9 mph)
    return 16.0; // Sprint (10+ mph)
  };

  const met = getMETFromSpeed(avgSpeedKmh);
  const timeHours = durationMinutes / 60;

  // Age adjustment factor (metabolism changes with age)
  const ageAdjustment = profile.age > 60 ? 1.1 : profile.age < 25 ? 0.95 : 1.0;
  
  // Gender adjustment (approximate differences in metabolism)
  const genderAdjustment = profile.gender === 'female' ? 0.9 : 1.0;

  // Calories = MET × weight (kg) × time (hours) × adjustments
  const calories = met * weightKg * timeHours * ageAdjustment * genderAdjustment;
  
  return Math.round(calories);
}

/**
 * Format pace from speed (converts km/h to min/km)
 */
export function formatPace(speedKmh: number): string {
  if (speedKmh === 0) return "--:--";
  
  const paceMinPerKm = 60 / speedKmh;
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format duration from minutes to MM:SS or HH:MM:SS
 */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const seconds = Math.round((totalMinutes % 1) * 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * State interface for running tracker
 */
export interface RunningState {
  status: 'stopped' | 'running' | 'paused';
  stats: RunningStats;
}

/**
 * GPS Tracker class for simple GPS coordinate handling
 */
export class GPSTracker {
  getCurrentPosition(): Promise<{lat: number, lon: number}> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }
}

/**
 * Running Tracker Class
 * Handles GPS coordinate tracking and real-time statistics
 */
export class RunningTracker {
  private coordinates: GPSCoordinate[] = [];
  private totalDistance = 0;
  private startTime: number | null = null;
  private isRunning = false;
  private pausedTime = 0;
  private lastPauseTime: number | null = null;

  constructor() {
    this.reset();
  }

  /**
   * Start running session
   */
  startRun(userProfile: UserRunningProfile): void {
    this.start();
  }

  /**
   * Start tracking
   */
  start(): void {
    if (!this.isRunning) {
      if (this.startTime === null) {
        this.startTime = Date.now();
      } else if (this.lastPauseTime) {
        // Resume from pause
        this.pausedTime += Date.now() - this.lastPauseTime;
        this.lastPauseTime = null;
      }
      this.isRunning = true;
    }
  }

  /**
   * Pause tracking
   */
  pause(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.lastPauseTime = Date.now();
    }
  }

  /**
   * Pause running session
   */
  pauseRun(): void {
    this.pause();
  }

  /**
   * Resume running session
   */
  resumeRun(): void {
    this.start();
  }

  /**
   * Stop tracking
   */
  stop(): void {
    this.isRunning = false;
    this.lastPauseTime = null;
  }

  /**
   * Stop running session and return final stats
   */
  stopRun(): RunningStats {
    this.stop();
    // Return stats with default user profile if not provided
    const defaultProfile: UserRunningProfile = { weight: 70, age: 30, gender: 'male' };
    return this.getStats(defaultProfile);
  }

  /**
   * Add GPS point (alias for addCoordinate)
   */
  addPoint(coords: {lat: number, lon: number}): number {
    return this.addCoordinate(coords.lat, coords.lon);
  }

  /**
   * Add GPS coordinate
   */
  addCoordinate(lat: number, lon: number, accuracy?: number): number {
    if (!this.isRunning) return this.totalDistance;

    const coord: GPSCoordinate = { 
      lat, 
      lon, 
      timestamp: Date.now(),
      accuracy
    };
    
    // Only add coordinate if accuracy is reasonable (< 20 meters)
    if (accuracy && accuracy > 20) {
      console.warn('GPS accuracy too low:', accuracy);
      return this.totalDistance;
    }

    if (this.coordinates.length > 0) {
      const lastCoord = this.coordinates[this.coordinates.length - 1];
      const segmentDistance = calculateDistance(
        lastCoord.lat, 
        lastCoord.lon, 
        lat, 
        lon
      );
      
      // Filter out unrealistic jumps (> 100m in 1 second = 360 km/h)
      const timeDiff = (coord.timestamp! - lastCoord.timestamp!) / 1000; // seconds
      const maxRealisticSpeed = 50; // km/h (very fast running)
      
      if (timeDiff > 0) {
        const speedKmh = (segmentDistance / timeDiff) * 3600;
        if (speedKmh <= maxRealisticSpeed) {
          this.totalDistance += segmentDistance;
        } else {
          console.warn('Unrealistic speed detected, skipping coordinate:', speedKmh, 'km/h');
          return this.totalDistance;
        }
      }
    }
    
    this.coordinates.push(coord);
    return this.totalDistance;
  }

  /**
   * Get current running statistics
   */
  getStats(userProfile: UserRunningProfile): RunningStats {
    const now = Date.now();
    const elapsedTime = this.startTime ? 
      (now - this.startTime - this.pausedTime - (this.lastPauseTime ? now - this.lastPauseTime : 0)) / 1000 / 60 : 0;
    
    const durationMinutes = Math.max(0, elapsedTime);
    const avgSpeed = durationMinutes > 0 ? (this.totalDistance / durationMinutes) * 60 : 0; // km/h
    const avgPace = avgSpeed > 0 ? 60 / avgSpeed : 0; // min/km
    
    const calories = durationMinutes > 0 ? 
      calculateRunningCalories(this.totalDistance, userProfile.weight, avgSpeed, durationMinutes, userProfile) : 0;

    return {
      distance: Math.round(this.totalDistance * 1000) / 1000, // round to meters precision
      duration: Math.round(durationMinutes * 10) / 10,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      avgPace: Math.round(avgPace * 10) / 10,
      calories: calories,
      coordinatesCount: this.coordinates.length
    };
  }

  /**
   * Get all coordinates (for map display)
   */
  getCoordinates(): GPSCoordinate[] {
    return [...this.coordinates];
  }

  /**
   * Get path coordinates (alias for getCoordinates)
   */
  getPath(): GPSCoordinate[] {
    return this.getCoordinates();
  }

  /**
   * Get current position
   */
  getCurrentPosition(): GPSCoordinate | null {
    return this.coordinates.length > 0 ? this.coordinates[this.coordinates.length - 1] : null;
  }

  /**
   * Check if currently tracking
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.coordinates = [];
    this.totalDistance = 0;
    this.startTime = null;
    this.isRunning = false;
    this.pausedTime = 0;
    this.lastPauseTime = null;
  }

  /**
   * Get total distance
   */
  getTotalDistance(): number {
    return this.totalDistance;
  }
}