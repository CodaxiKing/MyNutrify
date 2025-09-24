# Integração MyNutrify com App Stores

## Visão Geral do Sistema VIP

O MyNutrify implementa um sistema completo de assinaturas premium com três níveis:

### Planos Disponíveis

| Recurso | Free | Premium | VIP |
|---------|------|---------|-----|
| **Análise IA/dia** | 3 | 25 | Ilimitado |
| **Receitas** | 5 | 50 | Ilimitado |
| **GPS Tracking** | ❌ | ✅ | ✅ |
| **Relatórios Detalhados** | ❌ | ✅ | ✅ |
| **Export de Dados** | ❌ | ✅ | ✅ |
| **Backup Nuvem** | ❌ | ✅ | ✅ |
| **Sem Anúncios** | ❌ | ✅ | ✅ |
| **Suporte Prioritário** | ❌ | ❌ | ✅ |

### Preços Sugeridos
- **Premium**: R$ 9,99/mês ou R$ 99,99/ano (17% desconto)
- **VIP**: R$ 19,99/mês ou R$ 199,99/ano (17% desconto)

## Google Play Store Integration

### 1. Configuração do Google Play Console

```javascript
// Para Android - Google Play Billing
// 1. Configure produtos no Play Console:
// - mynutrify_premium_monthly (R$ 9,99)
// - mynutrify_premium_yearly (R$ 99,99) 
// - mynutrify_vip_monthly (R$ 19,99)
// - mynutrify_vip_yearly (R$ 199,99)

// 2. Implemente Google Play Billing Library
import { GooglePlayBilling } from '@react-native-community/google-play-billing';

const purchaseSubscription = async (sku: string) => {
  try {
    const subscription = await GooglePlayBilling.purchaseSubscription(sku);
    // Validar no backend via /api/verify-purchase
    await validatePurchase(subscription);
  } catch (error) {
    console.error('Purchase failed:', error);
  }
};
```

### 2. Verificação de Compra no Backend

```typescript
// server/routes.ts - adicionar rota de verificação
app.post('/api/verify-google-purchase', requireAuth, async (req, res) => {
  try {
    const { purchaseToken, productId } = req.body;
    
    // Verificar com Google Play API
    const verification = await googlePlay.purchases.subscriptions.get({
      packageName: 'com.mynutrify.app',
      subscriptionId: productId,
      token: purchaseToken
    });
    
    if (verification.data.paymentState === 1) {
      // Ativar plano do usuário
      const plan = productId.includes('premium') ? 'premium' : 'vip';
      await storage.updateUserPlan(req.user.id, plan);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid purchase' });
  }
});
```

## App Store (iOS) Integration

### 1. Configuração do App Store Connect

```javascript
// Para iOS - StoreKit
// 1. Configure produtos no App Store Connect:
// - mynutrify.premium.monthly
// - mynutrify.premium.yearly
// - mynutrify.vip.monthly  
// - mynutrify.vip.yearly

// 2. Implemente StoreKit
import { requestSubscription } from 'react-native-iap';

const purchaseSubscription = async (sku: string) => {
  try {
    const purchase = await requestSubscription(sku);
    // Validar no backend
    await validateApplePurchase(purchase);
  } catch (error) {
    console.error('Purchase failed:', error);
  }
};
```

### 2. Verificação de Compra Apple

```typescript
// server/routes.ts
app.post('/api/verify-apple-purchase', requireAuth, async (req, res) => {
  try {
    const { receiptData } = req.body;
    
    // Verificar com Apple App Store API
    const response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': process.env.APPLE_SHARED_SECRET
      })
    });
    
    const verification = await response.json();
    
    if (verification.status === 0) {
      // Ativar plano
      const productId = verification.receipt.in_app[0].product_id;
      const plan = productId.includes('premium') ? 'premium' : 'vip';
      await storage.updateUserPlan(req.user.id, plan);
      res.json({ success: true });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid receipt' });
  }
});
```

## Webhooks e Renovação Automática

### Google Play Server Notifications

```typescript
app.post('/api/google-play-webhook', async (req, res) => {
  try {
    const message = Buffer.from(req.body.message.data, 'base64').toString();
    const notification = JSON.parse(message);
    
    switch (notification.notificationType) {
      case 4: // SUBSCRIPTION_RENEWED
        await handleSubscriptionRenewal(notification);
        break;
      case 3: // SUBSCRIPTION_CANCELED
        await handleSubscriptionCancellation(notification);
        break;
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});
```

### Apple Server Notifications

```typescript
app.post('/api/apple-webhook', async (req, res) => {
  try {
    const { notification_type, unified_receipt } = req.body;
    
    switch (notification_type) {
      case 'DID_RENEW':
        await handleAppleRenewal(unified_receipt);
        break;
      case 'CANCEL':
        await handleAppleCancellation(unified_receipt);
        break;
    }
    
    res.status(200).send('OK');
  } catch (error) {
    res.status(500).send('Error');
  }
});
```

## Compliance e Regulamentações

### 1. Política de Privacidade
- Informar coleta de dados de pagamento
- Política de reembolso clara
- Cancelamento de assinatura

### 2. Termos de Serviço
- Definir recursos de cada plano
- Política de renovação automática
- Direitos do usuário

### 3. Localização de Preços
- Configurar preços em diferentes moedas
- Considerar impostos locais
- Paridade de preços entre plataformas

## Testes Recomendados

### 1. Teste de Sandbox
```bash
# iOS
# Configure sandbox accounts no App Store Connect

# Android  
# Use Google Play Console test tracks
```

### 2. Testes de Integração
- Compra de assinatura
- Renovação automática
- Cancelamento
- Restauração de compra
- Upgrade/downgrade de planos

### 3. Testes de UX
- Fluxo de upgrade suave
- Feedback visual claro
- Tratamento de erros
- Estados offline

## Métricas e Analytics

### KPIs Importantes
- Taxa de conversão Free → Premium
- Churn rate por plano
- LTV (Lifetime Value)
- ARPU (Average Revenue Per User)
- Trial to paid conversion

### Implementação
```typescript
// Track upgrade events
const trackUpgrade = (plan: string, billing: string) => {
  analytics.track('subscription_upgraded', {
    plan,
    billing_cycle: billing,
    user_id: currentUser.id
  });
};
```

## Próximos Passos

1. **Configurar produtos** nas stores
2. **Implementar SDKs** nativos (react-native-iap)
3. **Testar em sandbox** ambas as plataformas
4. **Configurar webhooks** para sincronização
5. **Implementar analytics** de conversão
6. **Submeter para revisão** das stores

---

**⚠️ Importante**: Este sistema está preparado para funcionar tanto com Stripe (web) quanto com billing nativo das app stores (móvel). A arquitetura permite flexibilidade total na monetização.