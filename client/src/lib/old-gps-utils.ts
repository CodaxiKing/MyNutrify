/**
 * Advanced GPS utilities for Nike Run Club-style running tracking
 * Features: Auto-splits, pace smoothing, elevation tracking, real-time analytics
 */

export interface GPSCoordinate {
  lat: number;
  lon: number;
  timestamp?: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
}

// New interfaces for NRC-style tracking
export interface RunSample {
  lat: number;
  lon: number;
  timestamp: number;
  elevation?: number;
  cumulativeDistance: number; // km
  instantPace?: number; // min/km
  smoothedPace?: number; // min/km
  accuracy?: number;
}

export interface RunLap {
  index: number;
  startSampleIndex: number;
  endSampleIndex: number;
  distance: number; // km
  duration: number; // seconds
  avgPace: number; // min/km
  splitPace: number; // min/km for this lap only
  elevationGain: number; // meters
  elevationLoss: number; // meters
  timestamp: number;
}

export interface RunSession {
  id: string;
  unit: 'km' | 'mi';
  splitDistance: number; // 1 for km, 0.621371 for mi
  startedAt: number;
  isPaused: boolean;
  totalPausedTime: number;
  samples: RunSample[];
  laps: RunLap[];
  totals: {
    distance: number;
    duration: number;
    elevationGain: number;
    elevationLoss: number;
    avgPace: number;
    calories: number;
  };
}

export interface RunningEvents {
  onSample?: (sample: RunSample) => void;
  onSplit?: (lap: RunLap) => void;
  onStatsUpdate?: (stats: RunSession['totals']) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export interface GPSOptions {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  distanceFilter: number; // minimum distance in meters to trigger update
  accuracyThreshold: number; // maximum acceptable accuracy in meters
}

export interface GPSStatus {
  isAvailable: boolean;
  hasPermission: boolean;
  isTracking: boolean;
  lastUpdate: number | null;
  signalQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unavailable';
}

export interface RunningStats {
  distance: number; // kilometers
  duration: number; // minutes
  avgSpeed: number; // km/h
  avgPace: number; // min/km
  currentPace: number; // min/km (smoothed)
  calories: number;
  coordinatesCount: number;
  elevationGain: number; // meters
  elevationLoss: number; // meters
  totalLaps: number;
  currentLap: number;
  gpsQuality: GPSStatus['signalQuality'];
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
 * Enhanced GPS Tracker class with better error handling and configuration
 */
export class GPSTracker {
  private status: GPSStatus = {
    isAvailable: false,
    hasPermission: false,
    isTracking: false,
    lastUpdate: null,
    signalQuality: 'unavailable'
  };

  private lastAcceptedPosition: GPSCoordinate | null = null;

  private defaultOptions: GPSOptions = {
    enableHighAccuracy: true,
    timeout: 15000, // Increased timeout
    maximumAge: 1000, // Reduced maximum age for fresher positions
    distanceFilter: 3, // Minimum 3 meters movement
    accuracyThreshold: 20 // Maximum 20 meters accuracy
  };

  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 2000;

  constructor() {
    this.status.isAvailable = !!navigator.geolocation;
  }

  getStatus(): GPSStatus {
    return { ...this.status };
  }

  private getSignalQuality(accuracy: number): GPSStatus['signalQuality'] {
    if (accuracy <= 5) return 'excellent';
    if (accuracy <= 10) return 'good';
    if (accuracy <= 20) return 'fair';
    if (accuracy <= 50) return 'poor';
    return 'unavailable';
  }

  async getCurrentPosition(options?: Partial<GPSOptions>): Promise<GPSCoordinate> {
    const gpsOptions = { ...this.defaultOptions, ...options };
    
    return this.attemptGetPosition(gpsOptions);
  }

  private attemptGetPosition(options: GPSOptions): Promise<GPSCoordinate> {
    return new Promise((resolve, reject) => {
      if (!this.status.isAvailable) {
        reject(new Error('GPS não está disponível neste dispositivo'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Timeout: GPS não respondeu no tempo esperado'));
      }, options.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const coords = position.coords;
          
          // Validate accuracy
          if (coords.accuracy > options.accuracyThreshold) {
            if (this.retryCount < this.maxRetries) {
              this.retryCount++;
              console.warn(`GPS accuracy too low (${coords.accuracy}m), retrying... (${this.retryCount}/${this.maxRetries})`);
              setTimeout(() => {
                this.attemptGetPosition(options).then(resolve).catch(reject);
              }, this.retryDelay);
              return;
            } else {
              console.warn(`GPS accuracy still low after ${this.maxRetries} retries, accepting position`);
            }
          }

          this.retryCount = 0; // Reset retry count on success
          this.status.hasPermission = true;
          this.status.lastUpdate = Date.now();
          this.status.signalQuality = this.getSignalQuality(coords.accuracy);

          const gpsCoord: GPSCoordinate = {
            lat: coords.latitude,
            lon: coords.longitude,
            timestamp: Date.now(),
            accuracy: coords.accuracy,
            altitude: coords.altitude || undefined,
            speed: coords.speed || undefined
          };

          resolve(gpsCoord);
        },
        (error) => {
          clearTimeout(timeoutId);
          this.handleLocationError(error);
          
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.warn(`GPS error, retrying... (${this.retryCount}/${this.maxRetries}):`, error.message);
            setTimeout(() => {
              this.attemptGetPosition(options).then(resolve).catch(reject);
            }, this.retryDelay);
          } else {
            this.retryCount = 0;
            reject(this.getLocalizedError(error));
          }
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout - 1000, // Leave some buffer for our own timeout
          maximumAge: options.maximumAge
        }
      );
    });
  }

  private handleLocationError(error: GeolocationPositionError): void {
    this.status.signalQuality = 'unavailable';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.status.hasPermission = false;
        break;
      case error.POSITION_UNAVAILABLE:
        this.status.isAvailable = false;
        break;
      case error.TIMEOUT:
        // Timeout handled by retry logic
        break;
    }
  }

  private getLocalizedError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Permissão de localização negada. Por favor, permita acesso à localização nas configurações do navegador.');
      case error.POSITION_UNAVAILABLE:
        return new Error('Localização indisponível. Verifique se o GPS está ativado e se você está em um local com boa recepção de sinal.');
      case error.TIMEOUT:
        return new Error('Timeout ao obter localização. Tente novamente em local com melhor sinal GPS.');
      default:
        return new Error(`Erro de GPS: ${error.message}`);
    }
  }

  startWatching(callback: (position: GPSCoordinate) => void, options?: Partial<GPSOptions>): number | null {
    if (!this.status.isAvailable) {
      throw new Error('GPS não está disponível neste dispositivo');
    }

    const gpsOptions = { ...this.defaultOptions, ...options };
    this.status.isTracking = true;

    return navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        
        // Filter by accuracy
        if (coords.accuracy > gpsOptions.accuracyThreshold) {
          console.warn(`Skipping position with low accuracy: ${coords.accuracy}m`);
          return;
        }

        const gpsCoord: GPSCoordinate = {
          lat: coords.latitude,
          lon: coords.longitude,
          timestamp: Date.now(),
          accuracy: coords.accuracy,
          altitude: coords.altitude || undefined,
          speed: coords.speed || undefined
        };

        // Apply distance filter
        if (this.lastAcceptedPosition && gpsOptions.distanceFilter > 0) {
          const distance = this.calculateDistanceBetween(
            this.lastAcceptedPosition.lat,
            this.lastAcceptedPosition.lon,
            gpsCoord.lat,
            gpsCoord.lon
          );
          
          // Convert to meters and check minimum distance
          if (distance * 1000 < gpsOptions.distanceFilter) {
            console.log(`Skipping position - distance ${(distance * 1000).toFixed(1)}m < ${gpsOptions.distanceFilter}m filter`);
            return;
          }
        }

        // Update status
        this.status.lastUpdate = Date.now();
        this.status.signalQuality = this.getSignalQuality(coords.accuracy);
        this.status.hasPermission = true; // Update on successful position
        this.lastAcceptedPosition = gpsCoord;

        callback(gpsCoord);
      },
      (error) => {
        // Don't mark GPS as unavailable for transient errors
        if (error.code !== error.POSITION_UNAVAILABLE) {
          this.handleLocationError(error);
        } else {
          this.status.signalQuality = 'unavailable';
          console.warn('GPS position temporarily unavailable');
        }
        console.error('GPS watching error:', this.getLocalizedError(error).message);
      },
      {
        enableHighAccuracy: gpsOptions.enableHighAccuracy,
        timeout: gpsOptions.timeout,
        maximumAge: gpsOptions.maximumAge
      }
    );
  }

  private calculateDistanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI/180);
  }

  stopWatching(watchId: number): void {
    this.status.isTracking = false;
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Nike Run Club-style Advanced Running Tracker
 * Features: Auto-splits, pace smoothing, elevation tracking, real-time analytics
 */
export class NRCRunningTracker {
  private session: RunSession;
  private events: RunningEvents;
  private paceWindow: number[] = []; // Rolling window for pace smoothing
  private lastSampleTime: number = 0;
  private gpsTracker: GPSTracker;
  private readonly PACE_WINDOW_SIZE = 15; // seconds for pace smoothing
  private readonly MIN_ELEVATION_CHANGE = 3; // meters minimum for elevation tracking
  
  constructor(unit: 'km' | 'mi' = 'km', events: RunningEvents = {}) {
    this.events = events;
    this.gpsTracker = new GPSTracker();
    this.session = {
      id: this.generateSessionId(),
      unit,
      splitDistance: unit === 'km' ? 1 : 0.621371, // 1 km or 1 mile
      startedAt: 0,
      isPaused: false,
      totalPausedTime: 0,
      samples: [],
      laps: [],
      totals: {
        distance: 0,
        duration: 0,
        elevationGain: 0,
        elevationLoss: 0,
        avgPace: 0,
        calories: 0
      }
    };
  }

  private generateSessionId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start new running session
   */
  start(): void {
    const now = Date.now();
    
    if (this.session.startedAt === 0) {
      // First time starting
      this.session.startedAt = now;
      this.lastSampleTime = now;
    } else if (this.session.isPaused) {
      // Resume from pause
      const pauseDuration = now - this.lastSampleTime;
      this.session.totalPausedTime += pauseDuration;
      this.events.onResume?.();
    }
    
    this.session.isPaused = false;
  }

  /**
   * Pause running session
   */
  pause(): void {
    if (!this.session.isPaused) {
      this.session.isPaused = true;
      this.lastSampleTime = Date.now();
      this.events.onPause?.();
    }
  }

  /**
   * Resume running session
   */
  resume(): void {
    this.start();
  }

  /**
   * Stop running session and finalize
   */
  stop(): RunSession {
    this.session.isPaused = true;
    this.updateTotals();
    return { ...this.session };
  }

  /**
   * Add GPS sample (NRC-style)
   */
  addSample(coords: GPSCoordinate): void {
    if (this.session.isPaused || this.session.startedAt === 0) return;

    const now = Date.now();
    const sample = this.createSample(coords, now);
    
    if (this.isValidSample(sample)) {
      this.session.samples.push(sample);
      this.updatePaceWindow(sample);
      this.checkForSplit(sample);
      this.events.onSample?.(sample);
      this.lastSampleTime = now;
    }
  }

  private createSample(coords: GPSCoordinate, timestamp: number): RunSample {
    const previousSample = this.session.samples[this.session.samples.length - 1];
    let cumulativeDistance = 0;
    
    if (previousSample) {
      const segmentDistance = calculateDistance(
        previousSample.lat, previousSample.lon,
        coords.lat, coords.lon
      );
      cumulativeDistance = previousSample.cumulativeDistance + segmentDistance;
    }

    const sample: RunSample = {
      lat: coords.lat,
      lon: coords.lon,
      timestamp,
      elevation: coords.altitude,
      cumulativeDistance,
      accuracy: coords.accuracy
    };

    // Calculate instant pace if we have a previous sample
    if (previousSample) {
      const timeDiff = (timestamp - previousSample.timestamp) / 1000; // seconds
      const distanceDiff = cumulativeDistance - previousSample.cumulativeDistance;
      
      if (timeDiff > 0 && distanceDiff > 0) {
        const speedKmh = (distanceDiff / timeDiff) * 3600;
        sample.instantPace = speedKmh > 0 ? 60 / speedKmh : 0; // min/km
      }
    }

    return sample;
  }

  private isValidSample(sample: RunSample): boolean {
    const previousSample = this.session.samples[this.session.samples.length - 1];
    
    if (!previousSample) return true;
    
    // Filter unrealistic speeds (>50 km/h)
    if (sample.instantPace && sample.instantPace > 0 && sample.instantPace < 1.2) {
      console.warn('Unrealistic pace detected, skipping sample');
      return false;
    }
    
    // Check accuracy threshold
    if (sample.accuracy && sample.accuracy > 30) {
      console.warn('Low GPS accuracy, skipping sample:', sample.accuracy);
      return false;
    }
    
    return true;
  }

  private updatePaceWindow(sample: RunSample): void {
    if (sample.instantPace) {
      this.paceWindow.push(sample.instantPace);
      
      // Keep only recent samples (based on time window)
      const cutoffTime = sample.timestamp - (this.PACE_WINDOW_SIZE * 1000);
      const cutoffIndex = this.session.samples.findIndex(s => s.timestamp >= cutoffTime);
      
      if (cutoffIndex > 0) {
        this.paceWindow = this.paceWindow.slice(this.paceWindow.length - (this.session.samples.length - cutoffIndex));
      }
      
      // Calculate smoothed pace using exponential moving average
      if (this.paceWindow.length > 0) {
        const alpha = 0.3; // Smoothing factor
        const currentSmoothed = sample.smoothedPace || sample.instantPace;
        sample.smoothedPace = alpha * sample.instantPace + (1 - alpha) * currentSmoothed;
      }
    }
  }

  private checkForSplit(sample: RunSample): void {
    const expectedLapCount = Math.floor(sample.cumulativeDistance / this.session.splitDistance);
    
    if (expectedLapCount > this.session.laps.length) {
      this.createLap(expectedLapCount);
    }
  }

  private createLap(lapIndex: number): void {
    const samples = this.session.samples;
    const splitDistance = this.session.splitDistance;
    const targetDistance = lapIndex * splitDistance;
    
    // Find start and end samples for this lap
    const startIdx = lapIndex === 1 ? 0 : this.session.laps[lapIndex - 2]?.endSampleIndex + 1 || 0;
    const endIdx = samples.findIndex(s => s.cumulativeDistance >= targetDistance);
    
    if (endIdx === -1) return;
    
    const startSample = samples[startIdx];
    const endSample = samples[endIdx];
    
    const lap: RunLap = {
      index: lapIndex,
      startSampleIndex: startIdx,
      endSampleIndex: endIdx,
      distance: endSample.cumulativeDistance - startSample.cumulativeDistance,
      duration: (endSample.timestamp - startSample.timestamp) / 1000, // seconds
      avgPace: 0,
      splitPace: 0,
      elevationGain: 0,
      elevationLoss: 0,
      timestamp: endSample.timestamp
    };
    
    // Calculate lap statistics
    this.calculateLapStats(lap);
    
    this.session.laps.push(lap);
    this.events.onSplit?.(lap);
  }

  private calculateLapStats(lap: RunLap): void {
    const samples = this.session.samples.slice(lap.startSampleIndex, lap.endSampleIndex + 1);
    
    if (samples.length < 2) return;
    
    // Calculate average pace for this lap
    const speedKmh = (lap.distance / lap.duration) * 3600;
    lap.splitPace = speedKmh > 0 ? 60 / speedKmh : 0;
    lap.avgPace = lap.splitPace;
    
    // Calculate elevation changes
    let elevationGain = 0;
    let elevationLoss = 0;
    
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];
      
      if (prev.elevation !== undefined && curr.elevation !== undefined) {
        const elevDiff = curr.elevation - prev.elevation;
        
        if (Math.abs(elevDiff) >= this.MIN_ELEVATION_CHANGE) {
          if (elevDiff > 0) {
            elevationGain += elevDiff;
          } else {
            elevationLoss += Math.abs(elevDiff);
          }
        }
      }
    }
    
    lap.elevationGain = elevationGain;
    lap.elevationLoss = elevationLoss;
  }

  /**
   * Add GPS coordinate with enhanced validation
   */
  addCoordinate(lat: number, lon: number, accuracy?: number, speed?: number): number {
    if (!this.isRunning) return this.totalDistance;

    const coord: GPSCoordinate = { 
      lat, 
      lon, 
      timestamp: Date.now(),
      accuracy,
      speed
    };
    
    // Enhanced accuracy filtering
    if (accuracy && accuracy > 30) {
      console.warn('GPS accuracy too low:', accuracy, 'm - skipping coordinate');
      return this.totalDistance;
    }

    // Validate coordinate ranges
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      console.warn('Invalid GPS coordinates:', lat, lon);
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
      
      const timeDiff = (coord.timestamp! - lastCoord.timestamp!) / 1000; // seconds
      
      // Skip coordinates that are too close in time (< 1 second) and distance (< 2 meters)
      if (timeDiff < 1 && segmentDistance < 0.002) {
        return this.totalDistance;
      }
      
      if (timeDiff > 0) {
        const speedKmh = (segmentDistance / timeDiff) * 3600;
        
        // More realistic speed filtering with gradual limits
        let maxRealisticSpeed = 60; // Base limit for running
        
        // Allow higher speeds for short bursts (GPS jumping)
        if (timeDiff < 3) {
          maxRealisticSpeed = 100;
        } else if (timeDiff < 10) {
          maxRealisticSpeed = 80;
        }
        
        if (speedKmh <= maxRealisticSpeed) {
          this.totalDistance += segmentDistance;
        } else {
          console.warn(`Unrealistic speed detected (${speedKmh.toFixed(1)} km/h), skipping coordinate`);
          // Store the coordinate but don't add to distance
          this.coordinates.push(coord);
          return this.totalDistance;
        }
      }
    }
    
    this.coordinates.push(coord);
    return this.totalDistance;
  }

  /**
   * Get current running statistics (NRC-style)
   */
  getStats(userProfile: UserRunningProfile): RunningStats {
    this.updateTotals();
    
    const now = Date.now();
    const currentSample = this.session.samples[this.session.samples.length - 1];
    const duration = this.session.startedAt > 0 ? 
      (now - this.session.startedAt - this.session.totalPausedTime) / 1000 / 60 : 0;
    
    // Calculate current smoothed pace
    const currentPace = currentSample?.smoothedPace || 0;
    
    // Calculate average pace
    const avgSpeed = duration > 0 ? (this.session.totals.distance / duration) * 60 : 0;
    const avgPace = avgSpeed > 0 ? 60 / avgSpeed : 0;
    
    // Calculate calories
    const calories = duration > 0 ? 
      calculateRunningCalories(
        this.session.totals.distance, 
        userProfile.weight, 
        avgSpeed, 
        duration, 
        userProfile
      ) : 0;

    return {
      distance: Math.round(this.session.totals.distance * 1000) / 1000,
      duration: Math.round(duration * 10) / 10,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      avgPace: Math.round(avgPace * 10) / 10,
      currentPace: Math.round(currentPace * 10) / 10,
      calories: Math.round(calories),
      coordinatesCount: this.session.samples.length,
      elevationGain: Math.round(this.session.totals.elevationGain),
      elevationLoss: Math.round(this.session.totals.elevationLoss),
      totalLaps: this.session.laps.length,
      currentLap: this.session.laps.length + 1,
      gpsQuality: this.gpsTracker.getStatus().signalQuality
    };
  }

  private updateTotals(): void {
    if (this.session.samples.length === 0) return;
    
    const lastSample = this.session.samples[this.session.samples.length - 1];
    this.session.totals.distance = lastSample.cumulativeDistance;
    
    // Calculate total elevation changes
    let totalElevationGain = 0;
    let totalElevationLoss = 0;
    
    for (let i = 1; i < this.session.samples.length; i++) {
      const prev = this.session.samples[i - 1];
      const curr = this.session.samples[i];
      
      if (prev.elevation !== undefined && curr.elevation !== undefined) {
        const elevDiff = curr.elevation - prev.elevation;
        
        if (Math.abs(elevDiff) >= this.MIN_ELEVATION_CHANGE) {
          if (elevDiff > 0) {
            totalElevationGain += elevDiff;
          } else {
            totalElevationLoss += Math.abs(elevDiff);
          }
        }
      }
    }
    
    this.session.totals.elevationGain = totalElevationGain;
    this.session.totals.elevationLoss = totalElevationLoss;
  }

  /**
   * Calculate distance for a set of coordinates
   */
  private calculateDistanceForCoords(coords: GPSCoordinate[]): number {
    let distance = 0;
    for (let i = 1; i < coords.length; i++) {
      distance += calculateDistance(
        coords[i-1].lat,
        coords[i-1].lon,
        coords[i].lat,
        coords[i].lon
      );
    }
    return distance;
  }

  /**
   * Get GPS signal quality
   */
  getGPSQuality(): GPSStatus['signalQuality'] {
    return this.gpsTracker.getStatus().signalQuality;
  }

  /**
   * Check if session is running
   */
  isRunning(): boolean {
    return this.session.startedAt > 0 && !this.session.isPaused;
  }

  /**
   * Check if session is paused
   */
  isPaused(): boolean {
    return this.session.isPaused;
  }

  /**
   * Get all samples for map display
   */
  getSamples(): RunSample[] {
    return [...this.session.samples];
  }

  /**
   * Get path coordinates for map
   */
  getPath(): Array<{lat: number, lon: number}> {
    return this.session.samples.map(s => ({ lat: s.lat, lon: s.lon }));
  }

  /**
   * Get all laps/splits
   */
  getLaps(): RunLap[] {
    return [...this.session.laps];
  }

  /**
   * Get current session data
   */
  getSession(): RunSession {
    return { ...this.session };
  }

  /**
   * Get split markers for map display
   */
  getSplitMarkers(): Array<{lat: number, lon: number, distance: number, lapIndex: number}> {
    return this.session.laps.map(lap => {
      const sample = this.session.samples[lap.endSampleIndex];
      return {
        lat: sample.lat,
        lon: sample.lon,
        distance: lap.index * this.session.splitDistance,
        lapIndex: lap.index
      };
    });
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
   * Reset session
   */
  reset(): void {
    const unit = this.session.unit;
    this.session = {
      id: this.generateSessionId(),
      unit,
      splitDistance: unit === 'km' ? 1 : 0.621371,
      startedAt: 0,
      isPaused: false,
      totalPausedTime: 0,
      samples: [],
      laps: [],
      totals: {
        distance: 0,
        duration: 0,
        elevationGain: 0,
        elevationLoss: 0,
        avgPace: 0,
        calories: 0
      }
    };
    this.paceWindow = [];
    this.lastSampleTime = 0;
  }

  /**
   * Switch distance unit (km/mi)
   */
  setUnit(unit: 'km' | 'mi'): void {
    this.session.unit = unit;
    this.session.splitDistance = unit === 'km' ? 1 : 0.621371;
  }

  /**
   * Get total distance
   */
  getTotalDistance(): number {
    return this.totalDistance;
  }
}