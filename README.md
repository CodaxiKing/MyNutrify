# MyNutrify

App mobile-first de nutrição e treino: registro de refeições por foto, código de
barras ou busca; montagem e execução de séries de musculação; corrida com GPS; e
jejum intermitente com cronômetro.

React 18 + Vite + Tailwind/shadcn no client, Express + Drizzle + PostgreSQL no
servidor, Stripe para assinaturas e OpenAI para a análise de imagens.

---

## Como rodar

Requisitos: Node 20+ e um PostgreSQL.

```bash
npm install
```

Copie o exemplo de variáveis e ajuste o `DATABASE_URL`:

```bash
cp .env.example .env
```

Se não tiver um Postgres à mão, suba um com Docker:

```bash
docker run -d --name mynutrify-pg -e POSTGRES_PASSWORD=mynutrify -e POSTGRES_USER=mynutrify -e POSTGRES_DB=mynutrify -p 5432:5432 postgres:16-alpine
```

Crie as tabelas:

```bash
npm run db:push
```

E suba o app (client e API na mesma porta):

```bash
npm run dev
```

Abre em http://localhost:5000.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção (client + servidor) |
| `npm start` | Roda o build de produção |
| `npm run check` | Verificação de tipos |
| `npm run db:push` | Aplica o schema do Drizzle no banco |
| `npm run exercises:build` | Regenera `shared/exercise-db.json` do dataset upstream |
| `npm run taco:build` | Regenera `shared/taco-db.json` (tabela TACO) |
| `npm run db:claim -- <email>` | Migra os dados do usuário antigo para uma conta |
| `npm run apk` | Gera o APK de debug (ver seção "App Android") |
| `npm run apk:release` | Gera o APK de release (precisa ser assinado) |

---

## Funcionalidades

### Nutrição
- **Foto com IA** — envia a imagem para `POST /api/food/analyze` e recebe
  alimento, calorias, porção e macros.
  ⚠️ Por padrão o servidor devolve um resultado **fixo** para não gastar créditos.
  Defina `DISABLE_OPENAI_MOCK=true` e uma `OPENAI_API_KEY` para usar a API real.
- **Código de barras** com consulta ao OpenFoodFacts.
- **Busca em português** com alimentos brasileiros, termos sem acento e nomes
  regionais, como aipim e macaxeira.
- **Receitas** próprias com ingredientes e macros calculados.
- **Diário** com refeições por tipo, resumo diário/semanal e calendário.

#### Fontes de dados nutricionais

| Fonte | O que cobre | Custo |
|---|---|---|
| **TACO** | 591 alimentos brasileiros preparados — arroz cozido, feijão, pão de queijo | Grátis, embarcado |
| **OpenFoodFacts** | Produto industrializado, busca e código de barras | Grátis, online |
| Banco local | O que já foi usado antes | — |

A busca prioriza a TACO, reutiliza alimentos salvos e complementa com produtos
do Brasil com nome em português no OpenFoodFacts.

A **TACO** (Tabela Brasileira de Composição de Alimentos) é o que cobre a
lacuna do OpenFoodFacts, que só conhece produto com código de barras. É um
JSON local de 98 KB — sem rede, sem limite de requisição. Regenere com
`npm run taco:build`.

O adaptador USDA permanece no projeto, mas não participa da busca em português,
pois suas descrições não têm tradução garantida. As alterações da busca exigem
atualizar também o servidor da API; instalar somente o APK não atualiza o servidor.

### Metas
Metabolismo basal pela fórmula de **Mifflin-St Jeor**, TDEE por nível de
atividade e meta calórica conforme o objetivo (emagrecer / manter / ganhar).

### Treinos
- Biblioteca com **1.324 exercícios** — busca e filtros por região do corpo,
  equipamento e músculo-alvo, com miniatura de cada movimento.
- **Demonstração animada** de cada exercício, exibida durante o treino e no
  detalhe. Carregada da origem com a atribuição obrigatória — ver
  [EXERCISES-NOTICE.md](EXERCISES-NOTICE.md).
- **Montador de série**: séries, repetições, carga e descanso por exercício,
  reordenáveis por arrastar, com dias da semana.
- **Exercícios próprios**: dá para criar um movimento que não existe na
  biblioteca (variação de academia, aparelho específico, fisioterapia). Só não
  tem demonstração, que vem do catálogo.
- **Execução guiada**: registro série a série, cronômetro de descanso automático,
  volume total e calorias estimadas por MET.
- O progresso do treino em andamento sobrevive a recarregar a página.

### Contador de passos
Lê o sensor de hardware do aparelho (`TYPE_STEP_COUNTER`), que conta mesmo com o
app fechado e gasta pouquíssima bateria — bem melhor que detectar passos pelo
acelerômetro em software.

- Passos, distância e calorias do dia, com anel de progresso até a meta.
- As calorias entram no gasto do painel, junto com treinos e atividades.
- Distância pela passada estimada a partir da altura (fator 0,415 para homens,
  0,413 para mulheres); calorias pelo custo energético da caminhada
  (0,75 kcal por km por kg).
- Sem sensor (web, aparelho antigo, permissão negada), aceita **entrada
  manual** — o recurso não fica inútil.

O sensor conta desde o último boot do aparelho; o app guarda a referência do
início do dia e trata a virada de data e o reinício do aparelho.

### Jejum intermitente
Protocolos 16:8, 18:6, 20:4, OMAD, 24h, 36h ou personalizado. O cronômetro é
derivado de `startedAt` + `targetMinutes`, então **continua correndo com o app
fechado**. Mostra a fase metabólica atual, a próxima fase, histórico, sequência
de jejuns concluídos e notifica quando a meta é atingida.

### Corrida
Rastreamento por GPS com mapa Leaflet, pace, gráfico de elevação e estatísticas.

### Planos
Free, Premium (US$ 9,99/mês) e VIP (US$ 19,99/mês), com limites aplicados por
middleware no servidor. Checkout e webhook via Stripe.

---

## Estrutura

```
client/src/
  pages/          telas (uma por rota)
  components/     componentes de UI e de domínio
  components/ui/  primitivas shadcn + ActionButton, ProgressRing, AnimatedNumber
  hooks/          react-query e estado compartilhado
  lib/            utilidades (GPS, câmera, motion, cálculos)
server/
  api/            rotas de treino e jejum
  services/       IA, nutrição, atividade, elevação, biblioteca de exercícios
  middleware/     autenticação e permissões de plano
  routes.ts       demais rotas
  storage.ts      acesso ao banco (Drizzle)
shared/           schema, planos, jejum e biblioteca — usados pelos dois lados
scripts/          geração da base de exercícios
```

---

## Autenticação

Login com e-mail e senha, multi-usuário — cada conta enxerga apenas os próprios
dados.

- **Senhas** com `scrypt` (do módulo `crypto` do Node). Sem bcrypt nem argon2 de
  propósito: os dois exigem compilação nativa, o que atrasa ou quebra deploy em
  Render e Railway.
- **Sessões por token**, não por cookie. O APK conversa com a API em outra
  origem, e cookies cross-site exigiriam `SameSite=None; Secure` e são frágeis
  dentro da WebView. O token vai em `Authorization: Bearer` e funciona igual na
  web e no app.
- No banco fica só o **SHA-256 do token** — um vazamento não permite se passar
  por ninguém.
- A sessão dura 90 dias e é **renovada a cada uso**.
- Trocar a senha derruba as sessões dos outros dispositivos.

### Quem pode se cadastrar

`ALLOW_REGISTRATION` controla:

| Valor | Efeito |
|---|---|
| `first-user` (padrão) | Só até existir a primeira conta com senha. Ideal para instância pessoal. |
| `true` | Qualquer pessoa pode criar conta. |
| `false` | Cadastro fechado. |

A tela de login esconde o cadastro sozinha quando ele está fechado.

### Migrar os dados antigos

Antes do login, tudo era gravado sob um usuário fixo (`user-1`). Depois de criar
sua conta no app, transfira o histórico:

```bash
npm run db:claim -- voce@email.com --dry-run   # confere o que será movido
npm run db:claim -- voce@email.com             # migra de verdade
```

Move refeições, atividades, receitas, treinos, jejuns, resumos diários e o
perfil (altura, peso, idade, objetivo). Roda em transação — ou tudo, ou nada.

---

## Estado atual

Não há testes automatizados.

---

## App Android (APK)

O app nativo é o mesmo client empacotado com [Capacitor](https://capacitorjs.com/).
O APK carrega apenas a interface — **a API Express continua rodando num
servidor**, e o endereço dela é embutido no build.

### Gerar o APK

O endereço da API vem de `VITE_API_BASE_URL`. Sem ele o app usa caminhos
relativos, que dentro do APK apontam para a própria WebView e não chegam a
lugar nenhum.

```bash
VITE_API_BASE_URL=http://192.168.1.9:5000 npm run apk
```

O arquivo sai em `android/app/build/outputs/apk/debug/app-debug.apk`.

Qual endereço usar:

| Onde vai rodar | `VITE_API_BASE_URL` |
|---|---|
| Celular na mesma Wi-Fi | `http://<ip-da-sua-máquina>:5000` |
| Emulador Android | `http://10.0.2.2:5000` |
| Produção | `https://api.seudominio.com` |

### Trocar o servidor sem recompilar

Esse endereço é só o **padrão**. Dentro do app, o ícone de servidor no
cabeçalho abre a tela **Servidor**, onde dá para digitar outro endereço, testar
a conexão e salvar.

Serve para quando o roteador dá outro IP para o PC, ou quando a API sai da
máquina local para um servidor na internet — em nenhum dos casos é preciso
gerar um APK novo. O valor fica no `localStorage` do app e tem um botão para
voltar ao padrão do build.

Se o app não conseguir falar com o servidor ao abrir, ele leva direto para essa
tela em vez de mostrar um erro genérico.

> O build de **debug** libera HTTP para qualquer endereço, justamente para essa
> tela funcionar com qualquer IP. O build de **release** exige HTTPS —
> os dois usam arquivos `network_security_config.xml` separados
> (`src/debug/` e `src/main/`).

### Instalar

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Ou copie o `.apk` para o celular e abra (é preciso permitir "instalar de fontes
desconhecidas").

### Antes de publicar

- **Assine em release**: `npm run apk:release` gera um APK não assinado.
  Crie um keystore e configure `signingConfigs` em `android/app/build.gradle`.
- **Sirva a API por HTTPS.** O build de release já exige isso — nada a fazer
  além de apontar o app para uma URL `https://`.
- **Restrinja o CORS**: defina `CORS_ORIGINS` no servidor com os domínios de
  produção. Em `NODE_ENV=production` a liberação automática de redes locais é
  desativada sozinha.
- Troque os ícones em `android/app/src/main/res/mipmap-*`.
- Resolva a autenticação (ver "Estado atual" acima).

### Permissões declaradas

`INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA` (registro por foto),
`ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION` (corrida com GPS),
`ACTIVITY_RECOGNITION` (contador de passos) e `VIBRATE` (cronômetro de
descanso).

O contador de passos é um plugin Capacitor próprio
(`android/app/src/main/java/app/mynutrify/StepCounterPlugin.java`) sobre o
sensor de hardware do Android.

---

## Hospedar na nuvem

O APK só embala a interface; a API precisa estar acessível pela internet para
o app funcionar fora da sua rede.

### 1. Banco no Neon

Crie um projeto grátis em [neon.tech](https://neon.tech) e copie a string de
conexão (`postgres://...?sslmode=require`).

### 2. Servidor no Render

O repositório traz um [`render.yaml`](render.yaml) pronto:

1. Suba o projeto para o GitHub.
2. No Render: **New → Blueprint**, aponte para o repositório.
3. Preencha `DATABASE_URL` com a conexão do Neon.

O build roda `npm run db:push` sozinho e cria as tabelas.

> O plano gratuito **hiberna após 15 minutos** sem uso e leva de 30 a 50
> segundos para acordar. Se incomodar, troque `plan: free` por `plan: starter`
> no `render.yaml`, ou use o Railway (~US$ 5/mês, sem hibernar).

### Railway, Fly.io ou Docker

Há um [`Dockerfile`](Dockerfile) multi-estágio. Aponte a plataforma para ele e
defina as mesmas variáveis. Depois do primeiro deploy, rode `npm run db:push`
uma vez com a `DATABASE_URL` de produção.

### 3. Apontar o app

Abra o app, toque no ícone de servidor no cabeçalho e coloque a URL do Render
(`https://mynutrify-api.onrender.com`). Toque em **Testar** e **Salvar**.

Não precisa gerar um APK novo — o endereço é configurável em tempo de execução.

### Variáveis em produção

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | Conexão do Postgres |
| `PGSSL` | não | `true` em Postgres gerenciado (liga sozinho com `NODE_ENV=production`) |
| `ALLOW_REGISTRATION` | não | `first-user` (padrão), `true` ou `false` |
| `CORS_ORIGINS` | não | Domínios extras além do app nativo, separados por vírgula |
| `USDA_API_KEY` | não | Liga a busca na base da USDA |
| `OPENAI_API_KEY` + `DISABLE_OPENAI_MOCK=true` | não | Liga a análise de foto por IA |
| `STRIPE_SECRET_KEY` | não | Assinaturas |

Em `NODE_ENV=production` o CORS deixa de liberar redes locais automaticamente e
passa a aceitar só as origens do app nativo mais o que estiver em
`CORS_ORIGINS`.

---

## Licença e créditos

Código sob **MIT** (ver `package.json`).

A biblioteca de exercícios vem do dataset MIT
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset).
As imagens e GIFs desse dataset são © Gym visual, **não são MIT** e **não
acompanham este repositório** — leia [EXERCISES-NOTICE.md](EXERCISES-NOTICE.md)
antes de habilitar `VITE_EXERCISE_MEDIA_BASE_URL`.
