# Sample frontend: Vite build, served by nginx, which also proxies /api/* to
# API_BASE_URL (set at run time, see docker-compose.yml).

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine
# the nginx image renders /etc/nginx/templates/*.template with envsubst
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
# only substitute our own variable, never nginx's $uri, $host, ...
ENV NGINX_ENVSUBST_FILTER=^API_BASE_URL$
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
