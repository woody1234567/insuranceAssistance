# ================================
# Stage 1: Build Frontend (Vite)
# ================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests and install packages
COPY package.json package-lock.json ./
RUN npm ci

# Allow passing VITE_API_BASE_URL during build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy source code and build production assets
COPY . .
RUN npm run build

# ================================
# Stage 2: Serve with Nginx
# ================================
FROM nginx:alpine AS runtime

# GCP Cloud Run default port is 8080 (Cloud Run will inject $PORT)
ENV PORT=8080

# Nginx official image auto-substitutes environment variables in /etc/nginx/templates/*.template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy compiled static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
