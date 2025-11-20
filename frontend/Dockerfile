# --- Étape 1 : Build Angular ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build --omit=dev
# --- Étape 2 : Serveur Nginx ---
FROM nginx:1.29.2-alpine
WORKDIR /usr/share/nginx/html
# Copie du build Angular
# il faut copier les fichiers de prod (vérifier le bon répertoire dans dit qui
# doit contenir le index.html et le reste)
#COPY --from=build /app/dist/ /usr/share/nginx/html #ancienne version de Angular
COPY --from=build /app/dist/frontend/browser/ /usr/share/nginx/html/ 
# Copie du fichier de configuration nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY certs /etc/nginx/certs
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]