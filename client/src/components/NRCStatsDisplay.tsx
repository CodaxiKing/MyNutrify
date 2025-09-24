import React from 'react';
import { Clock, Activity, TrendingUp, MapPin, Target, Zap } from 'lucide-react';

interface RunningStats {
  distance: number; // km
  duration: number; // seconds
  pace: number; // seconds per km
  avgPace: number; // seconds per km
  calories: number;
  elevation: number; // meters
  elevationGain: number; // meters
  heartRate?: number; // bpm
  targetPace?: number; // seconds per km
  splits?: Array<{
    distance: number;
    time: number;
    pace: number;
  }>;
}

interface NRCStatsDisplayProps {
  stats: RunningStats;
  isRunning: boolean;
  isPaused: boolean;
  className?: string;
}

export default function NRCStatsDisplay({ 
  stats, 
  isRunning, 
  isPaused, 
  className = "" 
}: NRCStatsDisplayProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (km: number): string => {
    return km.toFixed(2);
  };

  const getPaceColor = (): string => {
    if (!stats.targetPace) return 'text-green-600';
    
    const diff = stats.pace - stats.targetPace;
    if (Math.abs(diff) <= 10) return 'text-green-600'; // Within 10 seconds of target
    if (diff > 0) return 'text-red-600'; // Slower than target
    return 'text-blue-600'; // Faster than target
  };

  const getStatusText = (): string => {
    if (!isRunning) return 'Ready to Run';
    if (isPaused) return 'Paused';
    return 'Running';
  };

  const getStatusColor = (): string => {
    if (!isRunning) return 'text-gray-600';
    if (isPaused) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`bg-gradient-to-br from-black to-gray-900 text-white rounded-xl p-6 ${className}`}>
      {/* Header with status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className={`w-5 h-5 ${getStatusColor()}`} />
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        {stats.heartRate && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-400 font-semibold">{stats.heartRate} BPM</span>
          </div>
        )}
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Distance */}
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-1">
            {formatDistance(stats.distance)}
          </div>
          <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4" />
            DISTANCE (KM)
          </div>
        </div>

        {/* Current Pace */}
        <div className="text-center">
          <div className={`text-4xl font-bold mb-1 ${getPaceColor()}`}>
            {formatPace(stats.pace)}
          </div>
          <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <Zap className="w-4 h-4" />
            CURRENT PACE
          </div>
        </div>

        {/* Duration */}
        <div className="text-center">
          <div className="text-4xl font-bold text-white mb-1">
            {formatTime(stats.duration)}
          </div>
          <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" />
            TIME
          </div>
        </div>

        {/* Average Pace */}
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-400 mb-1">
            {formatPace(stats.avgPace)}
          </div>
          <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <Target className="w-4 h-4" />
            AVG PACE
          </div>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-xl font-semibold text-orange-400">
            {Math.round(stats.calories)}
          </div>
          <div className="text-xs text-gray-500">CALORIES</div>
        </div>
        
        <div className="text-center">
          <div className="text-xl font-semibold text-purple-400">
            {Math.round(stats.elevation)}m
          </div>
          <div className="text-xs text-gray-500">ELEVATION</div>
        </div>
        
        <div className="text-center">
          <div className="text-xl font-semibold text-green-400 flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {Math.round(stats.elevationGain)}m
          </div>
          <div className="text-xs text-gray-500">GAIN</div>
        </div>
      </div>

      {/* Target pace indicator */}
      {stats.targetPace && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Target Pace</span>
            <span className="text-sm font-semibold text-gray-200">
              {formatPace(stats.targetPace)}/km
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              {stats.pace <= stats.targetPace ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-400">On target</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-red-400">
                    {formatPace(stats.pace - stats.targetPace)} behind
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last split info */}
      {stats.splits && stats.splits.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Last Split ({stats.splits.length} km)
            </span>
            <span className="text-sm font-semibold text-gray-200">
              {formatPace(stats.splits[stats.splits.length - 1].pace)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}