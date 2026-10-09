# Multi-stage production Dockerfile for Zenith District Print Studio
FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Install server dependencies and build
COPY server/package*.json ./server/
RUN cd server && npm ci

COPY server/ ./server/
RUN cd server && npm run build

# --- Production Runner Stage ---
FROM node:24-bookworm-slim AS runner

WORKDIR /app

# Install Python3, pip, and onnxruntime dependencies for local rembg
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libvips-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up python venv with rembg
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir rembg[cpu] Pillow onnxruntime

# Copy server build and client dist
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/src/presets ./server/dist/presets
COPY --from=builder /app/server/src/scripts ./server/dist/scripts
COPY --from=builder /app/client/dist ./client/dist

# Set permissions and storage volume
RUN mkdir -p /app/data/storage
VOLUME ["/app/data/storage"]

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

WORKDIR /app/server
CMD ["node", "dist/server.js"]
