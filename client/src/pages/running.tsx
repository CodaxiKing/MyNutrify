import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, MapPin, Timer, Route, Flame, BarChart3, TrendingUp } from "lucide-react";
import { NRCRunningTracker as RunningTracker, GPSTracker, formatDuration, formatPace, UserRunningProfile, type GPSStatus } from "@/lib/gps-utils";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useToast } from "@/hooks/use-toast";
import PaceChart from "@/components/PaceChart";
import ElevationChart from "@/components/ElevationChart";
import NRCStatsDisplay from "@/components/NRCStatsDisplay";
import { elevationService } from "@/services/elevation";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RunningState {
  status: 'stopped' | 'running' | 'paused';
  stats: {
    distance: number;
    duration: number;
    avgSpeed: number;
    avgPace: number;
    calories: number;
    currentPace: number;
    elevation: number;
    elevationGain: number;
    elevationLoss: number;
  };
  chartData: {
    paceData: Array<{
      timestamp: number;
      pace: number;
      distance: number;
    }>;
    elevationData: Array<{
      timestamp: number;
      elevation: number;
      distance: number;
    }>;
  };
  targetPace?: number;
  showCharts: boolean;
}

export default function RunningPage() {
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  const [runningTracker] = useState(new RunningTracker('km', {
    onSplit: (lap) => {
      // Fix critical pace calculation bug: should be seconds per km, not minutes
      const secondsPerKm = lap.duration / lap.distance;
      toast({
        title: `Split ${lap.index}`,
        description: `${formatPace(secondsPerKm)} - ${lap.distance.toFixed(2)}${runningTracker.getSession().unit}`,
      });
    }
  }));
  const [gpsTracker] = useState(new GPSTracker());
  const [runningState, setRunningState] = useState<RunningState>({
    status: 'stopped',
    stats: {
      distance: 0,
      duration: 0,
      avgSpeed: 0,
      avgPace: 0,
      calories: 0,
      currentPace: 0,
      elevation: 0,
      elevationGain: 0,
      elevationLoss: 0,
    },
    chartData: {
      paceData: [],
      elevationData: [],
    },
    targetPace: 300, // 5:00 min/km as default target
    showCharts: false,
  });

  const [gpsStatus, setGpsStatus] = useState<GPSStatus>({
    isAvailable: false,
    hasPermission: null, // null = requesting, false = denied, true = granted
    isTracking: false,
    lastUpdate: null,
    signalQuality: 'unavailable'
  } as any);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lon: number} | null>(null);
  const [elevationHistory, setElevationHistory] = useState<number[]>([]);

  // Create user profile for calculations
  const userRunningProfile: UserRunningProfile = {
    weight: profile?.weight || 70,
    age: profile?.age || 30,
    gender: profile?.gender || 'male'
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Check if geolocation is available
    if (!navigator.geolocation) {
      toast({
        title: "GPS não disponível",
        description: "Seu dispositivo não suporta geolocalização.",
        variant: "destructive",
      });
      return;
    }

    // Add a small delay to ensure the DOM element is fully rendered
    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        // Initialize map centered on default location (São Paulo, Brazil)
        const map = L.map(mapRef.current, {
          center: [-23.5505, -46.6333],
          zoom: 13,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          trackResize: true
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          minZoom: 3
        }).addTo(map);

        mapInstanceRef.current = map;

        // Force map resize after initialization
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);

      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: "Erro no mapa",
          description: "Não foi possível carregar o mapa. Tente recarregar a página.",
          variant: "destructive",
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Request location permission and center map
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        setGpsStatus(gpsTracker.getStatus());
        
        const position = await gpsTracker.getCurrentPosition();
        setCurrentLocation({ lat: position.lat, lon: position.lon });
        setGpsStatus(gpsTracker.getStatus());
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([position.lat, position.lon], 16);
          
          // Add current location marker
          if (markerRef.current) {
            markerRef.current.remove();
          }
          markerRef.current = L.marker([position.lat, position.lon]).addTo(mapInstanceRef.current);
        }
        
        toast({
          title: "Localização obtida",
          description: `Precisão: ${position.accuracy?.toFixed(1)}m - Sinal: ${gpsTracker.getStatus().signalQuality}`,
        });
      } catch (error: any) {
        console.error('Location error:', error);
        setGpsStatus(gpsTracker.getStatus());
        toast({
          title: "Erro de localização",
          description: error.message || "Não foi possível acessar sua localização.",
          variant: "destructive",
        });
      }
    };

    getCurrentLocation();
  }, []);

  // Start GPS tracking with enhanced error handling
  const startTracking = () => {
    try {
      watchIdRef.current = gpsTracker.startWatching(
        (position) => {
          // Add coordinate to tracker with enhanced data
          runningTracker.addCoordinate(
            position.lat, 
            position.lon, 
            position.accuracy,
            position.speed
          );
          
          // Update GPS status
          setGpsStatus(gpsTracker.getStatus());
          
          // Update map
          if (mapInstanceRef.current) {
            // Update current position marker
            if (markerRef.current) {
              markerRef.current.setLatLng([position.lat, position.lon]);
            } else {
              markerRef.current = L.marker([position.lat, position.lon]).addTo(mapInstanceRef.current);
            }

            // Update path
            const coordinates = runningTracker.getCoordinates();
            if (coordinates.length > 1) {
              const latLngs: [number, number][] = coordinates.map(coord => [coord.lat, coord.lon]);
              
              if (pathRef.current) {
                pathRef.current.setLatLngs(latLngs);
              } else {
                pathRef.current = L.polyline(latLngs, { 
                  color: '#ef4444', 
                  weight: 4,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round'
                }).addTo(mapInstanceRef.current);
              }
            }

            // Center map on current position with smooth animation
            const currentZoom = mapInstanceRef.current.getZoom();
            mapInstanceRef.current.setView([position.lat, position.lon], Math.max(currentZoom, 16));
          }

          // Update stats
          updateStats();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 2000,
          distanceFilter: 2,
          accuracyThreshold: 25
        }
      );
      
      if (watchIdRef.current === null) {
        throw new Error('Não foi possível iniciar o rastreamento GPS');
      }
      
    } catch (error: any) {
      console.error('Error starting GPS tracking:', error);
      toast({
        title: "Erro ao iniciar GPS",
        description: error.message || "Não foi possível iniciar o rastreamento.",
        variant: "destructive",
      });
    }
  };

  // Stop GPS tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      gpsTracker.stopWatching(watchIdRef.current);
      watchIdRef.current = null;
      setGpsStatus(gpsTracker.getStatus());
    }
  };

  // Update running statistics
  const updateStats = async () => {
    const stats = runningTracker.getStats(userRunningProfile);
    const session = runningTracker.getSession();
    const currentTimestamp = Date.now();
    
    // Calculate current pace (last 30 seconds average)
    const recentSamples = session.samples.slice(-10); // Last 10 samples for smoothing
    let currentPace = stats.avgPace;
    if (recentSamples.length >= 2) {
      const recentDistance = recentSamples[recentSamples.length - 1].cumulativeDistance - recentSamples[0].cumulativeDistance;
      const recentTime = (recentSamples[recentSamples.length - 1].timestamp - recentSamples[0].timestamp) / 1000;
      if (recentDistance > 0 && recentTime > 0) {
        const recentSpeed = recentDistance / (recentTime / 3600); // km/h
        currentPace = recentSpeed > 0 ? 3600 / recentSpeed : stats.avgPace; // sec/km
      }
    }
    
    // Get real elevation data if we have current location
    let currentElevation = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    
    if (currentLocation && runningState.status === 'running') {
      try {
        // Fetch elevation for current location
        const elevation = await elevationService.getElevation(currentLocation.lat, currentLocation.lon);
        currentElevation = elevation;
        
        // Update elevation history
        setElevationHistory(prev => {
          const newHistory = [...prev, elevation];
          
          // Calculate elevation gain/loss from complete history
          if (newHistory.length >= 2) {
            const stats = elevationService.calculateElevationStats(newHistory);
            elevationGain = stats.gain;
            elevationLoss = stats.loss;
          }
          
          // Keep last 1000 elevation points for analysis
          return newHistory.slice(-1000);
        });
        
      } catch (error) {
        console.warn('Failed to fetch elevation:', error);
        // Fall back to mock data if elevation service fails
        currentElevation = 100 + Math.sin(stats.distance * 2) * 20;
      }
    } else {
      // Use mock elevation when not running or no location
      currentElevation = 100 + Math.sin(stats.distance * 2) * 20;
    }
    
    setRunningState(prev => {
      // Add current data point to charts
      const newPacePoint = {
        timestamp: currentTimestamp,
        pace: currentPace,
        distance: stats.distance,
      };
      
      const newElevationPoint = {
        timestamp: currentTimestamp,
        elevation: currentElevation,
        distance: stats.distance,
      };
      
      // Keep only last 100 points for performance
      const maxPoints = 100;
      const updatedPaceData = [...prev.chartData.paceData, newPacePoint].slice(-maxPoints);
      const updatedElevationData = [...prev.chartData.elevationData, newElevationPoint].slice(-maxPoints);
      
      return {
        ...prev,
        stats: {
          distance: stats.distance,
          duration: stats.duration,
          avgSpeed: stats.avgSpeed,
          avgPace: stats.avgPace,
          calories: stats.calories,
          currentPace,
          elevation: currentElevation,
          elevationGain,
          elevationLoss,
        },
        chartData: {
          paceData: updatedPaceData,
          elevationData: updatedElevationData,
        }
      };
    });
  };

  // Toggle charts visibility
  const toggleCharts = () => {
    setRunningState(prev => ({
      ...prev,
      showCharts: !prev.showCharts
    }));
  };

  // Handle start button
  const handleStart = () => {
    if (!gpsStatus.hasPermission) {
      toast({
        title: "Permissão GPS necessária",
        description: "Por favor, permita acesso à localização para iniciar o rastreamento.",
        variant: "destructive",
      });
      return;
    }

    if (runningState.status === 'stopped') {
      // First time starting
      runningTracker.reset();
      if (pathRef.current) {
        pathRef.current.remove();
        pathRef.current = null;
      }
    }
    
    runningTracker.start();
    startTracking();
    setRunningState(prev => ({ ...prev, status: 'running' }));
    
    toast({
      title: "Corrida iniciada!",
      description: "Rastreamento GPS ativo. Qualidade do sinal: " + gpsStatus.signalQuality,
    });
  };

  // Handle pause button
  const handlePause = () => {
    runningTracker.pause();
    stopTracking();
    setRunningState(prev => ({ ...prev, status: 'paused' }));
    
    toast({
      title: "Corrida pausada",
      description: "Toque em continuar para retomar.",
    });
  };

  // Handle stop button
  const handleStop = () => {
    runningTracker.stop();
    stopTracking();
    setRunningState(prev => ({ ...prev, status: 'stopped' }));
    
    // Show final stats
    const finalStats = runningTracker.getStats(userRunningProfile);
    if (finalStats.distance > 0) {
      toast({
        title: "Corrida finalizada!",
        description: `${finalStats.distance.toFixed(2)}km em ${formatDuration(finalStats.duration)}`,
      });
    }
  };

  // Update stats regularly when running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (runningState.status === 'running') {
      interval = setInterval(updateStats, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [runningState.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (runningState.status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (runningState.status) {
      case 'running': return 'Em execução';
      case 'paused': return 'Pausado';
      default: return 'Parado';
    }
  };

  if (gpsStatus.hasPermission === false) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Permissão de Localização Negada</h3>
            <p className="text-muted-foreground mb-4">
              Para usar o rastreamento GPS, é necessário permitir o acesso à sua localização nas configurações do navegador.
            </p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gpsStatus.hasPermission === null) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Solicitando Acesso GPS</h3>
            <p className="text-muted-foreground mb-4">
              Aguardando permissão para acessar sua localização...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Status Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <Badge variant="outline">{getStatusText()}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                gpsStatus.signalQuality === 'excellent' ? 'bg-green-500' :
                gpsStatus.signalQuality === 'good' ? 'bg-green-400' :
                gpsStatus.signalQuality === 'fair' ? 'bg-yellow-500' :
                gpsStatus.signalQuality === 'poor' ? 'bg-orange-500' :
                'bg-red-500'
              }`} />
              <Badge variant={gpsStatus.signalQuality === 'excellent' || gpsStatus.signalQuality === 'good' ? 'default' : 'secondary'} className="text-xs">
                GPS: {gpsStatus.hasPermission ? 
                  `${gpsStatus.signalQuality === 'excellent' ? 'Excelente' :
                    gpsStatus.signalQuality === 'good' ? 'Bom' :
                    gpsStatus.signalQuality === 'fair' ? 'Regular' :
                    gpsStatus.signalQuality === 'poor' ? 'Fraco' : 'Sem sinal'}
                  ` : 'Conectando...'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nike Run Club Style Stats Display */}
      <NRCStatsDisplay 
        stats={{
          distance: runningState.stats.distance,
          duration: runningState.stats.duration,
          pace: runningState.stats.currentPace,
          avgPace: runningState.stats.avgPace,
          calories: runningState.stats.calories,
          elevation: runningState.stats.elevation,
          elevationGain: runningState.stats.elevationGain,
          targetPace: runningState.targetPace,
          splits: runningTracker.getSession().laps?.map(lap => ({
            distance: lap.distance,
            time: lap.duration,
            pace: lap.duration / lap.distance // Fix: seconds per km, not minutes
          }))
        }}
        isRunning={runningState.status !== 'stopped'}
        isPaused={runningState.status === 'paused'}
        className="mb-4"
      />

      {/* Toggle between Map and Charts */}
      <div className="flex gap-2 mb-4">
        <Button 
          variant={!runningState.showCharts ? "default" : "outline"}
          onClick={() => setRunningState(prev => ({ ...prev, showCharts: false }))}
          className="flex-1"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Map View
        </Button>
        <Button 
          variant={runningState.showCharts ? "default" : "outline"}
          onClick={() => setRunningState(prev => ({ ...prev, showCharts: true }))}
          className="flex-1"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>

      {/* Map or Charts */}
      {!runningState.showCharts ? (
        <Card>
          <CardContent className="p-0">
            <div 
              ref={mapRef} 
              className="w-full h-64 rounded-lg relative overflow-hidden"
              style={{ 
                minHeight: '256px',
                height: '256px',
                zIndex: 1,
                position: 'relative'
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pace Chart */}
          {runningState.chartData.paceData.length > 0 && (
            <PaceChart 
              data={runningState.chartData.paceData}
              currentPace={runningState.stats.currentPace}
              targetPace={runningState.targetPace}
            />
          )}
          
          {/* Elevation Chart */}
          {runningState.chartData.elevationData.length > 0 && (
            <ElevationChart 
              data={runningState.chartData.elevationData}
              totalElevationGain={runningState.stats.elevationGain}
              totalElevationLoss={runningState.stats.elevationLoss}
            />
          )}
          
          {/* Message when no data */}
          {runningState.chartData.paceData.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Analytics Available During Run</h3>
                <p className="text-muted-foreground">
                  Start your run to see real-time pace and elevation charts
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-4">
        {runningState.status === 'stopped' ? (
          <Button 
            onClick={handleStart}
            className="col-span-3 h-14"
            disabled={!gpsStatus.hasPermission}
          >
            <Play className="h-5 w-5 mr-2" />
            Iniciar Corrida
          </Button>
        ) : (
          <>
            {runningState.status === 'running' ? (
              <Button 
                onClick={handlePause}
                variant="outline"
                className="h-14"
              >
                <Pause className="h-5 w-5 mr-2" />
                Pausar
              </Button>
            ) : (
              <Button 
                onClick={handleStart}
                className="h-14"
              >
                <Play className="h-5 w-5 mr-2" />
                Continuar
              </Button>
            )}
            
            <Button 
              onClick={handleStop}
              variant="destructive"
              className="col-span-2 h-14"
            >
              <Square className="h-5 w-5 mr-2" />
              Finalizar Corrida
            </Button>
          </>
        )}
      </div>

      {/* Tips */}
      {runningState.status === 'stopped' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Dicas para uma boa corrida</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Mantenha o celular em local estável durante a corrida</li>
              <li>• Certifique-se de ter sinal GPS forte antes de iniciar</li>
              <li>• As calorias são calculadas baseadas no seu perfil</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}