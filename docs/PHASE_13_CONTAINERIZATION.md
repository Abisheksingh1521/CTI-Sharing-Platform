# Phase 13 — Containerization and Secure Deployment

**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Exam Phase:** Phase 13 [7 Marks]  
**Standards:** CIS Docker Benchmark v1.6, NIST SP 800-190 (Application Container Security Guide), Kubernetes Hardening Guidance (NSA/CISA)  
**Status:** MANIFESTS HARDENED, VALIDATED & COMPILED  

---

## 1. Executive Summary

Phase 13 establishes the enterprise containerization and orchestration baseline for the CTI Sharing Platform. The architecture transitions the Node.js / SQLite backend into an immutable, non-root, capability-restricted container image governed by a hardened Kubernetes Deployment and Service specification.

### Core Architectural Decisions:
1. **Multi-Stage Build Pipeline:** Decouples development dependencies, documentation, and build tools from the runtime container, drastically minimizing the container attack surface.
2. **Strict Non-Root Execution:** Runs under dedicated unprivileged service user `ctiapp` (UID `10001`, GID `10001`).
3. **SQLite Concurrency & Replica Safety Constraint:** SQLite enforces single-writer semantics via WAL mode. Running multiple replica pods against uncoordinated local disks causes split-brain data corruption. Therefore, the Deployment explicitly specifies `replicas: 1` with a `Recreate` rollout strategy and a dedicated `/data` volume.
4. **Read-Only Root Filesystem Compatibility:** Enforces `readOnlyRootFilesystem: true` to prevent persistent malware implants, while providing dedicated writable volumes for `/data` (SQLite database) and `/tmp` (ephemeral processing).
5. **Least Privilege Capabilities:** Drops all Linux kernel capabilities (`capabilities: drop: ["ALL"]`) and blocks privilege escalation (`allowPrivilegeEscalation: false`).

---

## 2. Docker Implementation & Security Controls

### 2.1 Multi-Stage Hardened Dockerfile Analysis
The production `Dockerfile` enforces four layers of defense:

| Control ID | Container Security Control | Specification in Dockerfile | Security Impact |
| :---: | :--- | :--- | :--- |
| **CONT-01** | **Minimal Base Image** | `FROM node:20-bookworm-slim` | Minimizes package bloat and eliminates unnecessary system binaries (curl, gcc, python) from production image. |
| **CONT-02** | **Multi-Stage Build Separation** | Stage 1 (`builder`) $\rightarrow$ Stage 2 (`runtime`) | Excludes development dependencies (`devDependencies`) and npm cache; only production `node_modules` are copied. |
| **CONT-03** | **Non-Root User Execution** | `useradd -u 10001 -g ctigroup ctiapp`<br>`USER 10001:10001` | Neutralizes container-breakout attacks by executing under unprivileged UID `10001`. |
| **CONT-04** | **Restricted Directory Ownership** | `mkdir -p /data /tmp /app/logs`<br>`chmod 750 /data /tmp /app/logs` | Isolates SQLite storage to a strictly permissioned directory owned by `ctiapp`. |
| **CONT-05** | **Zero Baked Credentials** | `.dockerignore` excludes `.env`, `*.db`, `*.key` | Guarantees secrets are injected strictly via Kubernetes Secrets/ConfigMaps at runtime. |
| **CONT-06** | **Container Healthcheck Instruction** | `HEALTHCHECK --interval=30s --timeout=5s` | Enables Docker engine to automatically monitor process liveness and restart failing containers. |
| **CONT-07** | **Explicit Network Exposure** | `EXPOSE 3000` | Documents ingress port without exposing host network namespaces. |

---

## 3. Kubernetes Orchestration & Security Controls

### 3.1 Kubernetes Manifest Architecture
The platform is deployed via four declarative Kubernetes manifests in `k8s/`:

```
[ Ingress / External Traffic ]
             │
             ▼
[ Service: cti-platform-service (Port 3000 / ClusterIP) ]
             │
             ▼
[ Deployment: cti-platform-deployment (Replicas: 1, Strategy: Recreate) ]
   ├── Pod Security Context: runAsNonRoot: true (UID 10001, GID 10001, RuntimeDefault Seccomp)
   ├── Container Security Context: readOnlyRootFilesystem: true, drop ALL capabilities
   ├── Injected ConfigMap: cti-platform-config (PORT, DB_PATH, RATE_LIMITS)
   ├── Injected Secret: cti-platform-secrets (JWT_SECRET)
   ├── Volume Mount (/data): Dedicated writable storage for SQLite WAL database
   ├── Volume Mount (/tmp): Ephemeral scratch storage
   └── Probes: Liveness & Readiness on /api/health
```

### 3.2 Four Concrete Kubernetes Security Controls

1. **Pod & Container SecurityContext (`CTRL-K8S-01`):**
   * Pod level: `runAsNonRoot: true`, `runAsUser: 10001`, `runAsGroup: 10001`, `fsGroup: 10001`.
   * Container level: `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities: drop: ["ALL"]`.
   * Seccomp profile: `seccompProfile: type: RuntimeDefault`.
2. **Resource Quotas & Denial-of-Service Defense (`CTRL-K8S-02`):**
   * `requests: { cpu: 100m, memory: 128Mi }`
   * `limits: { cpu: 500m, memory: 256Mi }`
   * Prevents noisy-neighbor starvation and CPU/memory exhaustion attacks.
3. **Decoupled Secret & Configuration Management (`CTRL-K8S-03`):**
   * Non-sensitive runtime variables managed via `ConfigMap` (`cti-platform-config`).
   * Cryptographic JWT keys managed via `Secret` (`cti-platform-secrets`). Zero environment keys hardcoded in image or deployment spec.
4. **Health & Liveness Probes (`CTRL-K8S-04`):**
   * `livenessProbe`: `GET /api/health` every 20s (restarts deadlocked containers).
   * `readinessProbe`: `GET /api/health` every 10s (routes traffic only after SQLite DB initialization).

---

## 4. SQLite Storage & Single-Replica Architecture Constraint

### The Concurrency Problem:
SQLite employs shared-memory (`.shm`) and Write-Ahead Logging (`.wal`) to manage concurrent read transactions and serialized write operations. If a Kubernetes Deployment deploys multiple replicas (`replicas: 2+`) where each pod accesses an independent local filesystem:
1. Data written by Pod A is completely invisible to Pod B.
2. If multiple pods mount the same network-attached volume (e.g. NFS / SMB / AzureFile), SQLite file-locking APIs (`fcntl` / `flock`) fail over network file systems, corrupting the database.

### The Engineered Solution:
1. **Explicit Replica Governance:** `replicas: 1` is strictly enforced in `k8s/deployment.yaml`.
2. **Deployment Strategy:** `strategy: type: Recreate` ensures that during rollouts, the terminating pod is stopped before the new pod initializes, preventing dual-writer lock contention.
3. **Dedicated Volume Mount:** `/data` is mounted to a dedicated persistent volume (`emptyDir` for testing, PVC for enterprise production), allowing SQLite to operate safely with full ACID compliance while the root container filesystem remains immutable (`readOnlyRootFilesystem: true`).

---

## 5. Deployment Verification Checklist

| Verification Check | Target Component | Requirement | Verification Method | Status |
| :---: | :--- | :--- | :--- | :---: |
| **VC-13-01** | Production Dockerfile | Multi-stage, non-root UID 10001 | File inspection & AST check | **PASS** |
| **VC-13-02** | Docker Ignore Rules | Exclude `.env`, `node_modules`, DBs | File inspection | **PASS** |
| **VC-13-03** | Kubernetes ConfigMap | Config extraction for DB and rate limits | YAML Schema Parsing | **PASS** |
| **VC-13-04** | Kubernetes Secret | Base64 encoded JWT secret | YAML Schema Parsing | **PASS** |
| **VC-13-05** | Kubernetes Deployment | `readOnlyRootFilesystem`, non-root, 1 replica | YAML Schema Parsing | **PASS** |
| **VC-13-06** | Kubernetes Service | ClusterIP exposing port 3000 | YAML Schema Parsing | **PASS** |
| **VC-13-07** | Application Readiness | 53 unit/integration tests | `npm test` | **PASS (53/53)** |
| **VC-13-08** | Vulnerability Remediation | V02 & V04 mitigation verified | `npm run test:vuln` | **PASS (8/8)** |
