import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Crown, 
  Star, 
  Zap, 
  Camera, 
  BarChart3, 
  Download, 
  Cloud, 
  MapPin,
  Check,
  X,
  Sparkles,
  Trophy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserPlan {
  plan: 'free' | 'premium' | 'vip';
  usage: {
    aiAnalysisToday: number;
    recipesCreated: number;
  };
  limits: {
    aiAnalysisPerDay: number;
    recipesLimit: number;
  };
}

interface PlanFeature {
  name: string;
  icon: React.ReactNode;
  free: boolean | string;
  premium: boolean | string;
  vip: boolean | string;
}

const PLAN_FEATURES: PlanFeature[] = [
  {
    name: 'Análise IA de Alimentos',
    icon: <Camera className="h-4 w-4" />,
    free: '3/dia',
    premium: '25/dia',
    vip: 'Ilimitado'
  },
  {
    name: 'Receitas Personalizadas',
    icon: <Sparkles className="h-4 w-4" />,
    free: '5 receitas',
    premium: '50 receitas',
    vip: 'Ilimitado'
  },
  {
    name: 'Rastreamento GPS',
    icon: <MapPin className="h-4 w-4" />,
    free: false,
    premium: true,
    vip: true
  },
  {
    name: 'Relatórios Detalhados',
    icon: <BarChart3 className="h-4 w-4" />,
    free: false,
    premium: true,
    vip: true
  },
  {
    name: 'Exportar Dados',
    icon: <Download className="h-4 w-4" />,
    free: false,
    premium: true,
    vip: true
  },
  {
    name: 'Backup na Nuvem',
    icon: <Cloud className="h-4 w-4" />,
    free: false,
    premium: true,
    vip: true
  },
  {
    name: 'Sem Anúncios',
    icon: <X className="h-4 w-4" />,
    free: false,
    premium: true,
    vip: true
  },
  {
    name: 'Suporte Prioritário',
    icon: <Trophy className="h-4 w-4" />,
    free: false,
    premium: false,
    vip: true
  }
];

const PRICING = {
  premium: {
    monthly: 9.99,
    yearly: 99.99,
    yearlyDiscount: 17
  },
  vip: {
    monthly: 19.99,
    yearly: 199.99,
    yearlyDiscount: 17
  }
};

export default function UpgradePage() {
  const { toast } = useToast();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchUserPlan();
  }, []);

  const fetchUserPlan = async () => {
    try {
      const response = await fetch('/api/user/limits');
      if (response.ok) {
        const data = await response.json();
        setUserPlan(data);
      }
    } catch (error) {
      console.error('Error fetching user plan:', error);
    }
  };

  const handleUpgrade = async (plan: 'premium' | 'vip') => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          billing: billingCycle
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        throw new Error(data.message || 'Erro ao criar sessão de pagamento');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Erro no Checkout',
        description: 'Não foi possível iniciar o processo de pagamento. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-gray-400" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Upgrade para Premium
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Desbloqueie todo o potencial do MyNutrify com recursos avançados
        </p>
        
        {userPlan && (
          <div className="mt-4">
            <Badge variant={userPlan.plan === 'free' ? 'secondary' : 'default'} className="text-sm">
              Plano Atual: {userPlan.plan === 'free' ? 'Gratuito' : userPlan.plan === 'premium' ? 'Premium' : 'VIP'}
            </Badge>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      {userPlan && userPlan.plan === 'free' && (
        <Card className="mb-8 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Zap className="h-5 w-5" />
              Seu Uso Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Análises IA</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-orange-600">
                    {userPlan.usage.aiAnalysisToday}
                  </span>
                  <span className="text-gray-500">/ {userPlan.limits.aiAnalysisPerDay}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Receitas</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-orange-600">
                    {userPlan.usage.recipesCreated}
                  </span>
                  <span className="text-gray-500">/ {userPlan.limits.recipesLimit}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex items-center gap-4">
          <span className={`px-3 py-2 ${billingCycle === 'monthly' ? 'font-medium' : 'text-gray-500'}`}>
            Mensal
          </span>
          <Switch 
            checked={billingCycle === 'yearly'} 
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <span className={`px-3 py-2 flex items-center gap-2 ${billingCycle === 'yearly' ? 'font-medium' : 'text-gray-500'}`}>
            Anual
            {billingCycle === 'yearly' && (
              <Badge variant="secondary" className="text-xs">
                17% OFF
              </Badge>
            )}
          </span>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Free Plan */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Sparkles className="h-5 w-5 text-gray-600" />
              </div>
              Free
            </CardTitle>
            <CardDescription>Para começar sua jornada</CardDescription>
            <div className="text-3xl font-bold">
              R$ 0
              <span className="text-lg font-normal text-gray-500">/mês</span>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              disabled={userPlan?.plan === 'free'}
            >
              {userPlan?.plan === 'free' ? 'Plano Atual' : 'Downgrade'}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="relative border-blue-200 shadow-lg">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500 text-white">
              <Star className="h-3 w-3 mr-1" />
              Mais Popular
            </Badge>
          </div>
          <CardHeader className="pt-8">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              Premium
            </CardTitle>
            <CardDescription>Para resultados avançados</CardDescription>
            <div className="text-3xl font-bold">
              R$ {billingCycle === 'monthly' ? PRICING.premium.monthly.toFixed(2) : (PRICING.premium.yearly / 12).toFixed(2)}
              <span className="text-lg font-normal text-gray-500">/mês</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-sm text-green-600">
                Pague R$ {PRICING.premium.yearly.toFixed(2)}/ano (17% desconto)
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleUpgrade('premium')}
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={loading || userPlan?.plan === 'premium'}
            >
              {userPlan?.plan === 'premium' ? 'Plano Atual' : 'Upgrade para Premium'}
            </Button>
          </CardContent>
        </Card>

        {/* VIP Plan */}
        <Card className="relative border-purple-200 shadow-lg">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-purple-500 text-white">
              <Crown className="h-3 w-3 mr-1" />
              VIP
            </Badge>
          </div>
          <CardHeader className="pt-8">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              VIP
            </CardTitle>
            <CardDescription>Para atletas sérios</CardDescription>
            <div className="text-3xl font-bold">
              R$ {billingCycle === 'monthly' ? PRICING.vip.monthly.toFixed(2) : (PRICING.vip.yearly / 12).toFixed(2)}
              <span className="text-lg font-normal text-gray-500">/mês</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-sm text-green-600">
                Pague R$ {PRICING.vip.yearly.toFixed(2)}/ano (17% desconto)
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleUpgrade('vip')}
              className="w-full bg-purple-500 hover:bg-purple-600"
              disabled={loading || userPlan?.plan === 'vip'}
            >
              {userPlan?.plan === 'vip' ? 'Plano Atual' : 'Upgrade para VIP'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação de Recursos</CardTitle>
          <CardDescription>
            Veja tudo que está incluído em cada plano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Recurso</th>
                  <th className="text-center py-3 px-4">Free</th>
                  <th className="text-center py-3 px-4">Premium</th>
                  <th className="text-center py-3 px-4">VIP</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURES.map((feature, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {feature.icon}
                        <span className="font-medium">{feature.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      {renderFeatureValue(feature.free)}
                    </td>
                    <td className="text-center py-3 px-4">
                      {renderFeatureValue(feature.premium)}
                    </td>
                    <td className="text-center py-3 px-4">
                      {renderFeatureValue(feature.vip)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-center mb-6">Perguntas Frequentes</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posso cancelar a qualquer momento?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Sim! Você pode cancelar sua assinatura a qualquer momento. Não há taxas de cancelamento.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">O que acontece se eu cancelar?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Você continuará tendo acesso aos recursos premium até o final do período pago.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Posso mudar de plano?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Há teste grátis?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Sim! Premium tem 7 dias grátis e VIP tem 14 dias grátis. Cancele antes do fim do teste se não quiser continuar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}