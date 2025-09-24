import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, MapPin, Timer, Route, Flame } from "lucide-react";
import { RunningTracker, formatDuration, formatPace, UserRunningProfile } from "@/lib/gps-utils";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useToast } from "@/hooks/use-toast";
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
  };
}

export default function RunningPage() {
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  const [runningTracker] = useState(new RunningTracker());
  const [runningState, setRunningState] = useState<RunningState>({
    status: 'stopped',
    stats: {
      distance: 0,
      duration: 0,
      avgSpeed: 0,
      avgPace: 0,
      calories: 0,
    }
  });

  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lon: number} | null>(null);

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
    const getCurrentLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lon: longitude });
          setHasLocationPermission(true);
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], 16);
            
            // Add current location marker
            if (markerRef.current) {
              markerRef.current.remove();
            }
            markerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
          }
        },
        (error) => {
          console.error('Location error:', error);
          setHasLocationPermission(false);
          toast({
            title: "Erro de localização",
            description: "Não foi possível acessar sua localização. Verifique as permissões.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    getCurrentLocation();
  }, []);

  // Start GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS não disponível",
        description: "Seu dispositivo não suporta geolocalização.",
        variant: "destructive",
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Add coordinate to tracker
        runningTracker.addCoordinate(latitude, longitude, accuracy);
        
        // Update map
        if (mapInstanceRef.current) {
          // Update current position marker
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            markerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
          }

          // Update path
          const coordinates = runningTracker.getCoordinates();
          if (coordinates.length > 1) {
            const latLngs: [number, number][] = coordinates.map(coord => [coord.lat, coord.lon]);
            
            if (pathRef.current) {
              pathRef.current.setLatLngs(latLngs);
            } else {
              pathRef.current = L.polyline(latLngs, { 
                color: 'red', 
                weight: 4,
                opacity: 0.8 
              }).addTo(mapInstanceRef.current);
            }
          }

          // Center map on current position
          mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
        }

        // Update stats
        updateStats();
      },
      (error) => {
        console.error('GPS tracking error:', error);
        toast({
          title: "Erro GPS",
          description: "Erro ao rastrear localização. Verifique o sinal GPS.",
          variant: "destructive",
        });
      },
      options
    );
  };

  // Stop GPS tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Update running statistics
  const updateStats = () => {
    const stats = runningTracker.getStats(userRunningProfile);
    setRunningState(prev => ({
      ...prev,
      stats: {
        distance: stats.distance,
        duration: stats.duration,
        avgSpeed: stats.avgSpeed,
        avgPace: stats.avgPace,
        calories: stats.calories,
      }
    }));
  };

  // Handle start button
  const handleStart = () => {
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
      description: "Rastreamento GPS ativo.",
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

  if (hasLocationPermission === false) {
    return (
      <div className="p-4 space-y-6 pb-20">
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Permissão de Localização Necessária</h3>
            <p className="text-muted-foreground mb-4">
              Para usar o rastreamento GPS, permita o acesso à sua localização.
            </p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
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
            <div className="text-sm text-muted-foreground">
              GPS: {hasLocationPermission ? 'Conectado' : 'Aguardando...'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
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

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Route className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{runningState.stats.distance.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">km</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{formatDuration(runningState.stats.duration)}</div>
            <div className="text-sm text-muted-foreground">tempo</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold">{formatPace(runningState.stats.avgSpeed)}</div>
            <div className="text-sm text-muted-foreground">min/km</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 mx-auto mb-2 text-orange-500" />
            <div className="text-lg font-bold">{runningState.stats.calories}</div>
            <div className="text-sm text-muted-foreground">cal</div>
          </CardContent>
        </Card>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-3 gap-4">
        {runningState.status === 'stopped' ? (
          <Button 
            onClick={handleStart}
            className="col-span-3 h-14"
            disabled={!hasLocationPermission}
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