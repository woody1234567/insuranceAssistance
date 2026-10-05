FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests and install packages
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# GCP Cloud Run default port is 8080 (Cloud Run will inject $PORT)
ENV PORT=8080

EXPOSE 8080

# When container starts on Cloud Run:
# 1. npm run build (at container startup, so it captures Cloud Run runtime environment variables like VITE_API_BASE_URL)
# 2. serve the built dist directory with SPA support (-s) on $PORT
CMD ["sh", "-c", "npm run build && npx serve -s dist -l ${PORT:-8080}"]
