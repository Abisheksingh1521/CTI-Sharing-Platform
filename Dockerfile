# ==============================================================================
# Phase 13: Hardened Production Dockerfile
# System: Cyber Threat Intelligence (CTI) Sharing Platform
# Standards: CIS Docker Benchmark, NIST SP 800-190, Non-Root UID 10001
# ==============================================================================

# STAGE 1: Dependency Builder
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies if needed
ENV NODE_ENV=production

COPY package.json package-lock.json ./

# Clean production install (immutable lockfile verification)
RUN npm ci --omit=dev --ignore-scripts

# ==============================================================================
# STAGE 2: Hardened Runtime Container
# ==============================================================================
FROM node:20-bookworm-slim AS runtime

# Label metadata for supply chain provenance
LABEL maintainer="24CYS401 SSE Team" \
      platform="Cyber Threat Intelligence Sharing Platform" \
      security.standards="CIS-Benchmark-v1.6, NIST-SP-800-190" \
      version="1.0.0"

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/threat_intel.db

# 1. Create unprivileged non-root service user and group (UID/GID 10001)
RUN groupadd -g 10001 ctigroup && \
    useradd -u 10001 -g ctigroup -s /bin/false -M ctiapp

# 2. Create dedicated persistent writable directories for SQLite with restricted permissions
RUN mkdir -p /data /tmp /app/logs && \
    chown -R ctiapp:ctigroup /data /tmp /app/logs && \
    chmod 750 /data /tmp /app/logs

# 3. Copy production node_modules from builder stage
COPY --from=builder --chown=ctiapp:ctigroup /app/node_modules ./node_modules

# 4. Copy application source code and configurations
COPY --chown=ctiapp:ctigroup package.json ./
COPY --chown=ctiapp:ctigroup src/ ./src/

# 5. Enforce non-root execution
USER 10001:10001

# 6. Explicit exposed communication port
EXPOSE 3000

# 7. Container Healthcheck Instruction (Liveness verification)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# 8. Start production server (PID 1 process execution)
CMD ["node", "src/server.js"]
