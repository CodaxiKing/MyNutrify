import { useState } from 'react';
import { X, Crown, Star, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PlanTier } from '@shared/plans';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: PlanTier;
  restrictedFeature?: string;
}

interface PlanOption {
  id: PlanTier;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  gradient: string;
  icon: any;
  popular?: boolean;
}

const plans: PlanOption[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfeito para começar',
    price: { monthly: 0, yearly: 0 },
    features: [
      '3 análises AI por dia',
      '5 receitas personalizadas',
      '10 alimentos customizados',
      'Recursos básicos'
    ],
    gradient: 'from-gray-400 to-gray-600',
    icon: Zap
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Para quem leva a sério',
    price: { monthly: 9.99, yearly: 99.99 },
    features: [
      '25 análises AI por dia',
      '50 receitas personalizadas', 
      '100 alimentos customizados',
      'Análise nutricional avançada',
      'GPS tracking ilimitado',
      'Relatórios detalhados',
      'Exportação de dados',
      'Sem anúncios'
    ],
    gradient: 'from-pink-500 to-purple-600',
    icon: Star,
    popular: true
  },
  {
    id: 'vip',
    name: 'VIP',
    description: 'Experiência completa',
    price: { monthly: 19.99, yearly: 199.99 },
    features: [
      'Análises AI ILIMITADAS',
      'Receitas ILIMITADAS',
      'Alimentos customizados ILIMITADOS',
      'Todos os recursos Premium',
      'Suporte prioritário',
      'Novos recursos em primeira mão',
      'Consultoria nutricional'
    ],
    gradient: 'from-yellow-400 to-yellow-600',
    icon: Crown
  }
];

export function UpgradeModal({ isOpen, onClose, currentPlan = 'free', restrictedFeature }: UpgradeModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async (planId: PlanTier) => {
    if (planId === 'free' || planId === currentPlan) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          billingCycle
        })
      });

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Erro ao processar upgrade:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-0">
        <div className="relative">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Desbloqueie Todo o Potencial</h2>
              {restrictedFeature && (
                <p className="text-blue-100">
                  Para usar <strong>{restrictedFeature}</strong>, faça upgrade do seu plano
                </p>
              )}
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="p-6 pb-4">
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 p-1 rounded-lg flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    billingCycle === 'monthly' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors relative',
                    billingCycle === 'yearly' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  Anual
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    -17%
                  </span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const IconComponent = plan.icon;
                const isCurrentPlan = plan.id === currentPlan;
                const price = plan.price[billingCycle];
                
                return (
                  <div 
                    key={plan.id}
                    className={cn(
                      'relative border rounded-xl p-6 transition-all hover:shadow-lg',
                      isCurrentPlan && 'border-blue-500 bg-blue-50/50',
                      plan.popular && 'border-purple-500 ring-2 ring-purple-500/20'
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          MAIS POPULAR
                        </div>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <div className={cn(
                        'w-12 h-12 rounded-full bg-gradient-to-r flex items-center justify-center mx-auto mb-3',
                        `bg-gradient-to-r ${plan.gradient}`
                      )}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <p className="text-gray-600 text-sm">{plan.description}</p>
                    </div>

                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold">
                        {price === 0 ? 'Grátis' : `$${price.toFixed(2)}`}
                      </div>
                      {price > 0 && (
                        <div className="text-gray-500 text-sm">
                          por {billingCycle === 'monthly' ? 'mês' : 'ano'}
                        </div>
                      )}
                    </div>

                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isCurrentPlan || isProcessing}
                      className={cn(
                        'w-full',
                        isCurrentPlan && 'bg-gray-300 cursor-not-allowed',
                        plan.popular && !isCurrentPlan && 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                      )}
                    >
                      {isCurrentPlan ? 'Plano Atual' : 
                       plan.id === 'free' ? 'Grátis' : 
                       isProcessing ? 'Processando...' : `Escolher ${plan.name}`}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-sm text-gray-500">
              <p>✅ Cancelamento a qualquer momento • ✅ Suporte 24/7 • ✅ Garantia de 30 dias</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}