# ==============================================================================
# Etapa 1: Build de la aplicación Vite SPA
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Argumentos de construcción para inyectar variables de entorno en Vite
ARG VITE_API_URL
ARG VITE_APP_ENV=production

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_ENV=${VITE_APP_ENV}

# Copiar manifiestos y aprovechar la caché de capas de Docker
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copiar código fuente y compilar bundle de producción
COPY . .
RUN npm run build

# ==============================================================================
# Etapa 2: Runtime de Nginx sin privilegios (Non-Root)
# ==============================================================================
FROM nginxinc/nginx-unprivileged:alpine AS runner

USER nginx

# Reemplazar la configuración por defecto de Nginx
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos estáticos compilados desde la etapa de construcción
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
