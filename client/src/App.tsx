/**
 * Raiz do app: providers, roteamento e a barra de navegação.
 *
 * Antes as telas eram trocadas por um `switch` sobre um estado local, o que
 * deixava cinco páginas (corrida, precisão, planos, calendário e câmera)
 * inalcançáveis e sem URL própria. Agora tudo passa pelo wouter — que já era
 * dependência do projeto e não estava sendo usado.
 */

import { Suspense, lazy } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider } from "next-themes";

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileHeader } from "@/components/mobile-header";
import { TabNavigation } from "@/components/tab-navigation";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useAuthToken, useCurrentUser } from "@/hooks/use-auth";
import { getApiBaseUrl, isNativeApp } from "@/lib/api-url";

import Dashboard from "@/pages/dashboard";
import FoodPage from "@/pages/food";
import WorkoutsPage from "@/pages/workouts";
import FastingPage from "@/pages/fasting";
import NotFound from "@/pages/not-found";
import ProfileSetup from "@/pages/profile-setup";
import ServerSettings from "@/pages/server-settings";
import LoginPage from "@/pages/login";

// Telas pesadas (mapa Leaflet, gráficos, Stripe) só carregam quando visitadas.
const ActivitiesPage = lazy(() => import("@/pages/activities"));
const Diary = lazy(() => import("@/pages/diary"));
const CameraPage = lazy(() => import("@/pages/camera"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const PrecisionPage = lazy(() => import("@/pages/precision"));
const RunningPage = lazy(() => import("@/pages/running"));
const UpgradePage = lazy(() => import("@/pages/upgrade"));

/**
 * Rotas sem cabeçalho nem barra de abas.
 *
 * Só as telas em que ainda não há para onde navegar: login e configuração do
 * servidor. Todo o resto mantém a navegação inferior visível — esconder a
 * barra em algumas telas deixava o usuário sem saída.
 */
const CHROMELESS_ROUTES = ["/servidor"];

/** Abas raiz: nelas o cabeçalho não mostra seta de voltar. */
const ROOT_ROUTES = ["/", "/alimentos", "/treinos", "/jejum"];

function AppRoutes() {
  const [location, navigate] = useLocation();

  const token = useAuthToken();
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const { data: profile, isLoading: loadingProfile } = useUserProfile({
    // Só faz sentido buscar o perfil depois de saber quem é o usuário.
    enabled: Boolean(token && currentUser),
  });

  const chromeless = CHROMELESS_ROUTES.some((route) => location.startsWith(route));
  const isRoot = ROOT_ROUTES.includes(location);

  // A tela de servidor precisa estar acessível mesmo deslogado: com o endereço
  // errado, nem o login consegue responder.
  //
  // No APK ela também é a primeira tela quando não há endereço nenhum: sem
  // servidor configurado, um caminho relativo bateria na própria WebView e o
  // login falharia sem explicar o motivo.
  if (location === "/servidor" || (isNativeApp && !getApiBaseUrl())) {
    return <ServerSettings onBack={() => navigate("/")} />;
  }

  if (loadingUser) {
    return <LoadingScreen />;
  }

  // Sem token, ou com um token que o servidor recusou.
  if (!token || !currentUser) {
    return <LoginPage />;
  }

  if (loadingProfile) {
    return <LoadingScreen />;
  }

  // Perfil incompleto: os cálculos de BMR e meta calórica dependem dele, então
  // o onboarding vem antes de qualquer outra tela.
  const isProfileComplete = Boolean(
    profile?.height && profile?.weight && profile?.age && profile?.gender && profile?.fitnessGoal,
  );

  if (!isProfileComplete && location !== "/perfil") {
    return <ProfileSetup onComplete={() => navigate("/")} existingProfile={profile} />;
  }

  return (
    <div className="mobile-container relative min-h-screen shadow-2xl">
      {!chromeless && (
        <MobileHeader
          onProfileClick={() => navigate("/perfil")}
          // Fora das abas raiz, o cabeçalho ganha a seta de voltar — assim
          // nenhuma tela fica sem caminho de volta.
          onBack={isRoot ? undefined : () => navigate("/")}
        />
      )}

      {/* Sem AnimatePresence em volta do Switch: o wouter desmonta a rota antiga
          antes que a animação de saída termine, então a transição só adicionaria
          um travamento perceptível. Cada página anima a própria entrada pelo
          PageShell. */}
      <Suspense fallback={<LoadingScreen />}>
        <Switch location={location}>
          <Route path="/" component={Dashboard} />
          <Route path="/alimentos" component={FoodPage} />
          <Route path="/treinos" component={WorkoutsPage} />
          <Route path="/jejum" component={FastingPage} />
          <Route path="/diario" component={Diary} />
          <Route path="/atividades" component={ActivitiesPage} />
          <Route path="/calendario" component={CalendarPage} />
          <Route path="/precisao" component={PrecisionPage} />
          <Route path="/corrida" component={RunningPage} />
          <Route path="/camera" component={CameraPage} />
          <Route path="/planos" component={UpgradePage} />
          <Route path="/perfil">
            <ProfileSetup onComplete={() => navigate("/")} existingProfile={profile} />
          </Route>
          <Route path="/servidor">
            <ServerSettings onBack={() => navigate("/")} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>

      {!chromeless && <TabNavigation />}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="mobile-container flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto size-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
