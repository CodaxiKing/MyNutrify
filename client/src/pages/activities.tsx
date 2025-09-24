import { useState, useRef, useEffect } from "react";
import { MapPin, Dumbbell, Timer, TrendingUp, Play, Pause, Square, Activity as ActivityIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import L from 'leaflet';

// Import existing components
import { ActivityRegistration } from "@/components/activity-registration";

// Import hooks and types
import { useUserProfile } from "@/hooks/use-user-profile";
import { useActivitiesForDate } from "@/hooks/use-nutrition-data";

// Import GPS utilities and running tracker
import { GPSTracker, NRCRunningTracker as RunningTracker, type UserRunningProfile, type GPSStatus, type RunSession } from "@/lib/gps-utils";

type ActivityMode = 'menu' | 'running' | 'exercises';

export default function ActivitiesPage() {
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const { data: todaysActivities = [] } = useActivitiesForDate();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const pathRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  const [mode, setMode] = useState<ActivityMode>('menu');
  const [runningTracker] = useState(new RunningTracker('km'));
  const [gpsTracker] = useState(new GPSTracker());
  const [runningState, setRunningState] = useState<{
    status: 'stopped' | 'running' | 'paused';
    stats: {
      distance: number;
      duration: number;
      avgSpeed: number;
      avgPace: number;
      calories: number;
      currentPace: number;
      elevationGain: number;
      coordinatesCount: number;
    }
  }>({
    status: 'stopped',
    stats: {
      distance: 0,
      duration: 0,
      avgSpeed: 0,
      avgPace: 0,
      calories: 0,
      currentPace: 0,
      elevationGain: 0,
      coordinatesCount: 0,
    }
  });

  const [gpsStatus, setGpsStatus] = useState<GPSStatus>({
    isAvailable: false,
    hasPermission: false,
    isTracking: false,
    lastUpdate: null,
    signalQuality: 'unavailable'
  });
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lon: number} | null>(null);

  // Create user profile for calculations
  const userRunningProfile: UserRunningProfile = {
    weight: profile?.weight || 70,
    age: profile?.age || 30,
    gender: profile?.gender || 'male'
  };

  // Calculate today's activity stats
  const todaysStats = todaysActivities.reduce(
    (acc, activity) => ({
      totalCaloriesBurned: acc.totalCaloriesBurned + activity.caloriesBurned,
      totalDuration: acc.totalDuration + activity.duration,
      activitiesCount: acc.activitiesCount + 1,
    }),
    { totalCaloriesBurned: 0, totalDuration: 0, activitiesCount: 0 }
  );

  // Initialize map for running
  useEffect(() => {
    if (mode !== 'running' || !mapRef.current || mapInstanceRef.current) return;

    if (!navigator.geolocation) {
      toast({
        title: "GPS não disponível",
        description: "Seu dispositivo não suporta geolocalização.",
        variant: "destructive",
      });
      return;
    }

    const map = L.map(mapRef.current).setView([37.7749, -122.4194], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mode]);

  // Request location permission and center map
  useEffect(() => {
    if (mode !== 'running') return;

    const getCurrentLocation = async () => {
      try {
        setGpsStatus(gpsTracker.getStatus());
        
        const position = await gpsTracker.getCurrentPosition();
        setCurrentLocation({ lat: position.lat, lon: position.lon });
        setGpsStatus(gpsTracker.getStatus());
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([position.lat, position.lon], 16);
          
          if (markerRef.current) {
            markerRef.current.remove();
          }
          
          markerRef.current = L.marker([position.lat, position.lon])
            .addTo(mapInstanceRef.current)
            .bindPopup('Sua localização atual');
        }
      } catch (error: any) {
        console.error('Geolocation error:', error);
        setGpsStatus(gpsTracker.getStatus());
        toast({
          title: "Erro de localização",
          description: error.message || "Não foi possível acessar sua localização.",
          variant: "destructive",
        });
      }
    };

    getCurrentLocation();
  }, [mode]);

  // Running controls
  const startRun = () => {
    if (!gpsStatus.hasPermission) {
      toast({
        title: "Permissão necessária",
        description: "Acesso à localização é necessário para rastreamento.",
        variant: "destructive",
      });
      return;
    }

    runningTracker.start();
    setRunningState(prev => ({ ...prev, status: 'running' }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords: [number, number] = [latitude, longitude];
        
        runningTracker.addSample({ lat: latitude, lon: longitude, timestamp: Date.now() });
        const stats = runningTracker.getStats(userRunningProfile);
        setRunningState(prev => ({ 
          ...prev, 
          stats: {
            distance: stats.distance,
            duration: stats.duration,
            avgSpeed: stats.avgSpeed,
            avgPace: stats.avgPace,
            calories: stats.calories,
            currentPace: stats.currentPace,
            elevationGain: stats.elevationGain,
            coordinatesCount: stats.coordinatesCount
          }
        }));

        if (mapInstanceRef.current) {
          if (pathRef.current) {
            const currentPath = runningTracker.getPath();
            const leafletPath = currentPath.map(coord => [coord.lat, coord.lon] as [number, number]);
            pathRef.current.setLatLngs(leafletPath);
          } else {
            pathRef.current = L.polyline([newCoords], { color: '#ef4444', weight: 4 })
              .addTo(mapInstanceRef.current);
          }

          if (markerRef.current) {
            markerRef.current.setLatLng(newCoords);
          }

          mapInstanceRef.current.setView(newCoords, 16);
        }
      },
      (error) => {
        console.error('Tracking error:', error);
        toast({
          title: "Erro de rastreamento",
          description: "Erro ao rastrear localização durante a corrida.",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  };

  const pauseRun = () => {
    runningTracker.pause();
    setRunningState(prev => ({ ...prev, status: 'paused' }));

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const resumeRun = () => {
    runningTracker.resume();
    setRunningState(prev => ({ ...prev, status: 'running' }));
    startRun(); // Resume tracking
  };

  const stopRun = async () => {
    const session = runningTracker.stop();
    const finalStats = runningTracker.getStats(userRunningProfile);
    setRunningState(prev => ({ ...prev, status: 'stopped', stats: finalStats }));

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Save the run as an activity
    if (finalStats.distance > 0.1) { // Only save if distance > 100m
      try {
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customExerciseName: 'Corrida',
            duration: Math.round(finalStats.duration),
            intensity: 'moderate',
            caloriesBurned: finalStats.calories,
            notes: `Distância: ${finalStats.distance.toFixed(2)}km, Velocidade média: ${finalStats.avgSpeed.toFixed(1)}km/h`,
            metValue: 8.0 // Running MET value
          }),
        });

        if (response.ok) {
          toast({
            title: "Corrida Salva",
            description: `Corrida de ${finalStats.distance.toFixed(2)}km salva com sucesso!`,
          });
          setMode('menu');
        }
      } catch (error) {
        toast({
          title: "Erro ao Salvar",
          description: "Não foi possível salvar a corrida. Tente novamente.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Corrida Muito Curta",
        description: "A corrida deve ter pelo menos 100m para ser salva.",
        variant: "destructive",
      });
      setMode('menu');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render current mode
  const renderMode = () => {
    switch (mode) {
      case 'running':
        return (
          <div className="space-y-4">
            {/* Map */}
            <Card>
              <CardContent className="p-0">
                <div
                  ref={mapRef}
                  className="w-full h-64 rounded-lg"
                  style={{ minHeight: '250px' }}
                />
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{runningState.stats.distance.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">km</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{formatTime(runningState.stats.duration)}</p>
                  <p className="text-sm text-muted-foreground">tempo</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{runningState.stats.avgSpeed.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">km/h</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{Math.round(runningState.stats.calories)}</p>
                  <p className="text-sm text-muted-foreground">cal</p>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {runningState.status === 'stopped' && (
                <Button onClick={startRun} className="flex-1" size="lg">
                  <Play className="h-5 w-5 mr-2" />
                  Iniciar
                </Button>
              )}
              {runningState.status === 'running' && (
                <Button onClick={pauseRun} variant="secondary" className="flex-1" size="lg">
                  <Pause className="h-5 w-5 mr-2" />
                  Pausar
                </Button>
              )}
              {runningState.status === 'paused' && (
                <>
                  <Button onClick={resumeRun} className="flex-1" size="lg">
                    <Play className="h-5 w-5 mr-2" />
                    Continuar
                  </Button>
                  <Button onClick={stopRun} variant="destructive" className="flex-1" size="lg">
                    <Square className="h-5 w-5 mr-2" />
                    Parar
                  </Button>
                </>
              )}
              {(runningState.status === 'running' || runningState.status === 'paused') && (
                <Button onClick={stopRun} variant="destructive" size="lg">
                  <Square className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        );
      case 'exercises':
        return <ActivityRegistration onActivityAdded={() => setMode('menu')} />;
      default:
        return null;
    }
  };

  if (mode !== 'menu') {
    return (
      <div className="space-y-4 pb-24 pt-4">
        <div className="px-4">
          <Button 
            variant="outline" 
            onClick={() => setMode('menu')}
            className="mb-4"
          >
            ← Voltar ao Menu
          </Button>
        </div>
        {renderMode()}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
        <p className="text-muted-foreground">Registre seus exercícios e atividades físicas</p>
      </div>

      {/* Today's Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Resumo de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{todaysStats.totalCaloriesBurned}</p>
              <p className="text-sm text-muted-foreground">cal queimadas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{Math.round(todaysStats.totalDuration)}</p>
              <p className="text-sm text-muted-foreground">min ativos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{todaysStats.activitiesCount}</p>
              <p className="text-sm text-muted-foreground">atividades</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Options */}
      <div className="grid grid-cols-1 gap-4">
        {/* Running */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20" onClick={() => setMode('running')}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500/10 to-red-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">Rastreamento de Corrida</CardTitle>
                <p className="text-muted-foreground">Monitore sua corrida com GPS em tempo real</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">GPS</Badge>
                  <Badge variant="secondary">Tempo Real</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Exercise Registration */}
        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20" onClick={() => setMode('exercises')}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Dumbbell className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">Exercícios</CardTitle>
                <p className="text-muted-foreground">Registre musculação, yoga, natação e outros</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">Múltiplos Tipos</Badge>
                  <Badge variant="secondary">Cálculo MET</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activities */}
      {todaysActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-primary" />
              Atividades de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysActivities.slice(0, 3).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {activity.customExerciseName || 'Exercício'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.duration} min • {activity.intensity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-primary">{Math.round(activity.caloriesBurned)} cal</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.date).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}