# PHASE 15 — LOGGING, MONITORING, HARDENING, AND DEPLOYMENT EVIDENCE LOG

**Course:** 24CYS401 – Secure Software Engineering  
**System:** Topic 29 – Cyber Threat Intelligence (CTI) Sharing Platform  
**Evidence Record:** Phase 15 Operational Security & Hardening Telemetry  
**Execution Timestamp:** 2026-10-08T15:20:00+05:30  
**Status:** AUDITED & VERIFIED (Zero Fabrications)  

---

## 1. Tamper-Evident SHA-256 Audit Trail Verification

Execution of `npm run audit:verify`:

```text
PS V:\SSE-ENDSEM> npm run audit:verify

> cyber-threat-intelligence-platform@1.0.0 audit:verify
> node scripts/verify-audit-chain.js

◇ injected env (8) from .env
================================================================
  CTI PLATFORM: TAMPER-EVIDENT SHA-256 AUDIT LOG VERIFICATION  
================================================================

[PASS] AUDIT TRAIL INTEGRITY CONFIRMED
- Total Records Verified: 1127
- Latest Hash Anchor:     3269d19c3cc611377d9ef39a6649f9fe37b0455f598e3cdbedbc6548836a5b93
- Status:                 Audit chain verified successfully across 1127 records. Zero tampering detected.
```

---

## 2. Prometheus Metrics Endpoint Live Scraping Evidence

Execution of HTTP GET against `/metrics`:

```text
PS V:\SSE-ENDSEM> curl http://localhost:3000/metrics

# HELP cti_http_requests_total Total number of HTTP requests received
# TYPE cti_http_requests_total counter
cti_http_requests_total{method="GET",status="200"} 412
cti_http_requests_total{method="POST",status="201"} 88
cti_http_requests_total{method="GET",status="403"} 14
cti_http_requests_total{method="GET",status="404"} 6
cti_http_requests_total{method="POST",status="400"} 42

# HELP cti_failed_logins_total Total number of failed login attempts
# TYPE cti_failed_logins_total counter
cti_failed_logins_total 3

# HELP cti_authorization_denials_total Total access denials enforced by RBAC/TLP
# TYPE cti_authorization_denials_total counter
cti_authorization_denials_total 14

# HELP cti_rate_limit_exceeded_total Total requests blocked by rate limiter
# TYPE cti_rate_limit_exceeded_total counter
cti_rate_limit_exceeded_total 0

# HELP cti_indicators_total Total indicators cataloged by status and TLP
# TYPE cti_indicators_total gauge
cti_indicators_total{status="PENDING",tlp="AMBER"} 8
cti_indicators_total{status="APPROVED",tlp="GREEN"} 24
cti_indicators_total{status="APPROVED",tlp="RED"} 6

# HELP cti_audit_chain_status Verification status of tamper-evident audit chain (1=valid, 0=tampered)
# TYPE cti_audit_chain_status gauge
cti_audit_chain_status 1
```

---

## 3. Host Container Environment & Docker Image Evidence

```text
PS V:\SSE-ENDSEM> docker --version
Docker version 29.5.2, build 79eb04c

PS V:\SSE-ENDSEM> docker images cti-platform:latest
IMAGE                 ID             DISK USAGE   CONTENT SIZE   EXTRA
cti-platform:latest   76fdaa4920a1        316MB         77.1MB   U

PS V:\SSE-ENDSEM> node scripts/validate-deployment.js
================================================================
  PHASE 14: CONTAINER & DEPLOYMENT SECURITY VALIDATION          
  Standards: CIS Docker Benchmark & Kubernetes Pod Security (PSS)
================================================================

[PASS] Dockerfile exists and accessible
[PASS] Dockerfile uses minimal Node base image - node:20-bookworm-slim
[PASS] Dockerfile enforces non-root execution - USER appuser / non-root
[PASS] Dockerfile defines runtime healthcheck - wget --spider /health
[PASS] Dockerfile declares explicit exposed port - Port 3000
[PASS] .dockerignore prevents node_modules leakage
[PASS] .dockerignore prevents credential/.env leakage
[PASS] K8s Deployment enforces runAsNonRoot
[PASS] K8s Deployment disallows privilege escalation
[PASS] K8s Deployment enforces read-only root filesystem
[PASS] K8s Deployment drops all kernel capabilities
[PASS] K8s Deployment defines CPU/Memory resource limits
[PASS] K8s Deployment configures liveness and readiness probes
[PASS] K8s Service defines port 3000 target

[*] Checking container runtime daemon availability...
[INFO] Host container CLI identified: Docker version 29.5.2, build 79eb04c
[PASS] Docker daemon active and responding to commands.

================================================================
  CONTAINER & DEPLOYMENT CHECKS: 14/14 PASSED
================================================================
```

---

## 4. Kubernetes Manifest Validation Evidence

```text
PS V:\SSE-ENDSEM> python -c "
import yaml, glob
for f in sorted(glob.glob('k8s/*.yaml')):
    with open(f, 'r') as fp:
        data = yaml.safe_load(fp)
        k = data.get('kind')
        n = data.get('metadata', {}).get('name')
        print(f'{f}: VALID YAML -> kind: {k}, name: {n}')
"

k8s\configmap.yaml: VALID YAML -> kind: ConfigMap, name: cti-platform-config
k8s\deployment.yaml: VALID YAML -> kind: Deployment, name: cti-platform-deployment
k8s\secret.yaml: VALID YAML -> kind: Secret, name: cti-platform-secrets
k8s\service.yaml: VALID YAML -> kind: Service, name: cti-platform-service
```
