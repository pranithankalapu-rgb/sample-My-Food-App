# API tester web app. Stages:
#   deps   - npm ci (all dependencies)
#   tools  - deps + source: lint, typecheck, unit and API tests run here
#   build  - typecheck + lint + unit tests + vite build (a failing check fails the image)
#   final  - nginx serving the build and proxying /api/* to API_BASE_URL

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS tools
COPY . .

FROM tools AS build
RUN npm run typecheck && npm run lint && npm run test:unit && npm run build

FROM nginx:1.27-alpine
# the nginx image renders /etc/nginx/templates/*.template with envsubst
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
# only substitute our own variable, never nginx's $uri, $host, ...
ENV NGINX_ENVSUBST_FILTER=^API_BASE_URL$
COPY --from=build /app/dist /usr/share/nginx/html
RUN mkdir -p /usr/share/nginx/test-results
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
