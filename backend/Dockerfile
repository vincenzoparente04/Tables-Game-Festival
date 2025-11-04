

#etape 1
FROM node:22-alpine AS build
WORKDIR /app

# Copie des fichiers de dépendances et installation
COPY package*.json ./
RUN npm ci

# Copie des fichiers TS et config
COPY tsconfig.json ./
COPY src ./src

# Compilation TypeScript
RUN npx tsc -p tsconfig.json --pretty false --noEmitOnError false && \
    echo "👍 Compilation TS terminée" && \
    ls -la dist




#etape 2
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# On récupère le code compilé depuis l'étape build
COPY --from=build /app/dist ./dist
COPY package*.json ./

# On installe uniquement les dépendances de production
RUN npm ci --omit=dev

EXPOSE 4000

# Commande pour démarrer le serveur
CMD ["node", "dist/server.js"]
