# Imagem de produção do MyNutrify.
#
# Serve para Railway, Fly.io, Docker Compose ou qualquer host que aceite
# container. No Render, prefira o render.yaml (build nativo, sem Docker).

# ---------------------------------------------------------------- build ----
FROM node:22-alpine AS build

WORKDIR /app

# As dependências mudam menos que o código: copiar só os manifests primeiro
# aproveita o cache de camadas entre builds.
COPY package.json package-lock.json ./

# `--include=dev` porque vite e esbuild são devDependencies e o build precisa
# dos dois.
RUN npm ci --include=dev

COPY . .

RUN npm run build

# ------------------------------------------------------------- runtime ----
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bundle do servidor e assets do client.
COPY --from=build /app/dist ./dist

# As bases de exercícios e da TACO são lidas em tempo de execução a partir da
# raiz do projeto (ver server/services/*.ts).
COPY --from=build /app/shared/exercise-db.json ./shared/exercise-db.json
COPY --from=build /app/shared/taco-db.json ./shared/taco-db.json

# Não rodar como root.
USER node

EXPOSE 5000

CMD ["node", "dist/index.js"]
